const express = require("express");
const router = express.Router();
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");

const verifyToken = require("../../middlewares/authMiddleware");
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

router.post("/", verifyToken, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const filePath = req.file.path;
  const user = req.user;
  const fatBufEffectiveDate = req.body?.fatBufEffectiveDate;

  const date = new Date(fatBufEffectiveDate);

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);

  const formattedDate = dd + mm + yy;

  console.log(fatBufEffectiveDate, formattedDate); // Output: "100625"

  if (!fatBufEffectiveDate) {
    deleteFile(filePath);
    return res
      .status(400)
      .json({ error: "Missing fatBufEffectiveDate in request body" });
  }

  if (!user || (user.role !== "dairy" && user.role !== "device")) {
    deleteFile(filePath);
    return res.status(403).json({ error: "Unauthorized user role" });
  }

  const fatBufRecords = [];
  const targetModel = user.role === "device" ? deviceModel : dairyModel;

  let queryFilter;
  let dairyCodeForUpdate;

  if (user.role === "device") {
    if (!user.deviceid) {
      deleteFile(filePath);
      return res.status(400).json({ error: "Missing deviceId" });
    }
    queryFilter = { deviceid: user.deviceId };
  } else {
    if (!user.dairyCode) {
      deleteFile(filePath);
      return res.status(400).json({ error: "Missing dairyCode" });
    }
    queryFilter = { dairyCode: user.dairyCode };
    dairyCodeForUpdate = user.dairyCode;
  }

  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (row) => {
      const fat = parseFloat(row.FAT);
      const rate = parseFloat(row.RATE);
      if (!isNaN(fat) && !isNaN(rate)) {
        fatBufRecords.push({ FAT: fat, RATE: rate });
      }
    })
    .on("end", async () => {
      try {
        const fatBufId = Math.floor(1000 + Math.random() * 9000); // random 4-digit ID

        const updateData = {
          fatBufTable: fatBufRecords,
        };

        const updateResult = await targetModel.findOneAndUpdate(
          queryFilter,
          { $set: updateData },
          { new: true, upsert: false }
        );

        if (!updateResult) {
          deleteFile(filePath);
          return res.status(404).json({ error: "No matching document found" });
        }

        // Update rateChartIds and effective date
        if (user.role === "device") {
          await deviceModel.updateOne(
            { deviceid: user.deviceId },
            {
              $set: {
                "rateChartIds.fatBufId": fatBufId,
                "effectiveDates.fatBufEffectiveDate": formattedDate,
              },
            }
          );
        } else {
          await deviceModel.updateMany(
            { dairyCode: dairyCodeForUpdate },
            {
              $set: {
                "rateChartIds.fatBufId": fatBufId,
                "effectiveDates.fatBufEffectiveDate": formattedDate,
              },
            }
          );
        }

        deleteFile(filePath);

        res.json({
          message: `Updated fatBufTable with ${fatBufRecords.length} records`,
          updatedId: user.deviceId || user.dairyCode,
          fatBufId,
          formattedDate,
        });
      } catch (err) {
        console.error("❌ Error updating fatBufTable:", err);
        deleteFile(filePath);
        res.status(500).json({ error: "Failed to update fatBufTable" });
      }
    })
    .on("error", (err) => {
      console.error("❌ CSV parse error:", err);
      deleteFile(filePath);
      res.status(500).json({ error: "Failed to parse CSV" });
    });
});

module.exports = router;
