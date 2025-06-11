const express = require("express");
const router = express.Router();
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");

const deviceModel = require("../../models/DeviceModel");
const dairyModel = require("../../models/DairyModel");

const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const upload = multer({ dest: uploadsDir });

const deleteFile = (filePath) => {
  fs.unlink(filePath, (err) => {
    if (err) console.error("❌ Error deleting file:", err);
    else console.log("✅ Temp file deleted:", filePath);
  });
};

router.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const filePath = req.file.path;
  const user = req.user;
  const fatCowEffectiveDate = req.body?.fatCowEffectiveDate;

  const date = new Date(fatCowEffectiveDate);

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);

  const formattedDate = dd + mm + yy;

  if (!fatCowEffectiveDate) {
    deleteFile(filePath);
    return res
      .status(400)
      .json({ error: "Missing fatCowEffectiveDate in request body" });
  }

  if (!user || (user.role !== "dairy" && user.role !== "device")) {
    deleteFile(filePath);
    return res.status(403).json({ error: "Unauthorized user role" });
  }

  let collectionModel;
  let queryFilter;
  let identifier;
  let dairyCodeForUpdate;

  if (user.role === "device") {
    if (!user.deviceid) {
      deleteFile(filePath);
      return res.status(400).json({ error: "Missing deviceId in user info" });
    }
    collectionModel = deviceModel;
    queryFilter = { deviceid: user.deviceid };
    identifier = user.deviceid;
  } else {
    if (!user.dairyCode) {
      return res.status(400).json({ error: "Missing dairyCode in user info" });
    }
    collectionModel = dairyModel;
    queryFilter = { dairyCode: user.dairyCode };
    identifier = user.dairyCode;
    dairyCodeForUpdate = user.dairyCode;
  }

  const fatCowRecords = [];

  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (row) => {
      const fat = parseFloat(row.FAT);
      const rate = parseFloat(row.RATE);
      if (!isNaN(fat) && !isNaN(rate)) {
        fatCowRecords.push({ FAT: fat, RATE: rate });
      }
    })
    .on("end", async () => {
      try {
        const fatCowId = Math.floor(1000 + Math.random() * 9000); // 4-digit random

        const updatedDoc = await collectionModel.findOneAndUpdate(
          queryFilter,
          { $set: { fatCowTable: fatCowRecords } },
          { new: true, upsert: false }
        );

        if (!updatedDoc) {
          deleteFile(filePath);
          return res.status(404).json({ error: "Document not found" });
        }

        // Update fatCowId in rateChartIds and fatCowEffectiveDate
        if (user.role === "device") {
          await deviceModel.updateOne(
            { deviceid: user.deviceid },
            {
              $set: {
                "rateChartIds.fatCowId": fatCowId,
                "effectiveDates.fatCowEffectiveDate": formattedDate,
                "isDeviceRateTable.fatCowTable": true,
              },
            }
          );
        } else {
          await deviceModel.updateMany(
            { dairyCode: dairyCodeForUpdate },
            {
              $set: {
                "rateChartIds.fatCowId": fatCowId,
                "effectiveDates.fatCowEffectiveDate": formattedDate,
                "isDeviceRateTable.fatCowTable": false,
              },
            }
          );
        }

        deleteFile(filePath);

        res.json({
          message: `Updated fatCowTable with ${fatCowRecords.length} records`,
          updatedId: identifier,
          fatCowId,
          formattedDate,
        });
      } catch (err) {
        console.error("❌ Error updating fatCowTable:", err);
        deleteFile(filePath);
        res.status(500).json({ error: "Failed to update fatCowTable" });
      }
    })
    .on("error", (err) => {
      console.error("CSV parse error:", err);
      deleteFile(filePath);
      res.status(500).json({ error: "Failed to parse CSV" });
    });
});

module.exports = router;
