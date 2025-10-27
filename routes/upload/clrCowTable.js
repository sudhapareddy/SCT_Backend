const express = require("express");
const multer = require("multer");
const fs = require("fs");
const csv = require("csv-parser");
const path = require("path");

const deviceModel = require("../../models/DeviceModel");
const dairyModel = require("../../models/DairyModel");

const router = express.Router();

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
  const filePath = req.file?.path;
  if (!filePath) return res.status(400).json({ error: "No file uploaded" });

  const user = req.user;
  if (!user || (user.role !== "dairy" && user.role !== "device")) {
    deleteFile(filePath);
    return res.status(403).json({ error: "Unauthorized user" });
  }

  // Accept deviceId from body for dairy users
  let isDevice = user.role === "device";
  let id = isDevice ? user.deviceid : user.dairyCode;
  let uploadToDeviceId = null;

  if (user.role === "dairy" && req.body.deviceId) {
    // Check if the device belongs to this dairy
    const device = await deviceModel.findOne({ deviceid: req.body.deviceId, dairyCode: user.dairyCode });
    if (!device) {
      deleteFile(filePath);
      return res.status(403).json({ error: "Device not found or not under your dairy" });
    }
    isDevice = true;
    id = req.body.deviceId;
    uploadToDeviceId = req.body.deviceId;
  }

  const results = [];
  let headers = [];

  const clrCowEffectiveDate = req.body.clrCowEffectiveDate;
  const date = new Date(clrCowEffectiveDate);

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);

  const formattedDate = dd + mm + yy;

  if (!clrCowEffectiveDate) {
    deleteFile(filePath);
    return res
      .status(400)
      .json({ error: "Invalid or missing clrCowEffectiveDate" });
  }

  fs.createReadStream(filePath)
    .pipe(csv())
    .on("headers", (hdrs) => {
      headers = hdrs;
    })
    .on("data", (row) => {
      results.push(row);
    })
    .on("end", async () => {
      try {
        const dataMap = new Map();

        results.forEach((row) => {
          let fat = row[headers[0]]?.trim();
          if (!fat || isNaN(parseFloat(fat))) return;

          if (!fat.includes(".")) fat = `${parseInt(fat)}.0`;

          const nested = headers.slice(1).reduce((acc, col) => {
            const val = row[col];
            if (val && !isNaN(parseFloat(val))) {
              const clrKey = col.replace("clr", "").trim();
              const clrValue = clrKey.includes(".") ? clrKey : `${clrKey}.0`;
              acc.push({ [clrValue]: parseFloat(val) });
            }
            return acc;
          }, []);

          nested.sort((a, b) => {
            const aKey = parseFloat(Object.keys(a)[0]);
            const bKey = parseFloat(Object.keys(b)[0]);
            return aKey - bKey;
          });

          dataMap.set(fat, nested);
        });

        const sortedMap = new Map(
          [...dataMap.entries()].sort(
            (a, b) => parseFloat(a[0]) - parseFloat(b[0])
          )
        );

        const sortedJson = {};
        for (const [numKey, value] of sortedMap) {
          sortedJson[numKey] = value;
        }

        const model = isDevice ? deviceModel : dairyModel;
        const filter = isDevice ? { deviceid: id } : { dairyCode: id };
        const clrCowId = Math.floor(1000 + Math.random() * 9000);

        const updateMain = await model.updateOne(filter, {
          $set: { clrCowTable: sortedJson },
        });

        // Update rateChartIds.clrCowId
        if (isDevice) {
          await deviceModel.updateOne(filter, {
            $set: {
              "rateChartIds.clrCowId": clrCowId,
              "effectiveDates.clrCowEffectiveDate": formattedDate,
              "isDeviceRateTable.clrCowTable": true,
            },
          });
        } else {
          await deviceModel.updateMany(
            { dairyCode: id },
            {
              $set: {
                "rateChartIds.clrCowId": clrCowId,
                "effectiveDates.clrCowEffectiveDate": formattedDate,
                "isDeviceRateTable.clrCowTable": false,
              },
            }
          );
        }

        deleteFile(filePath);

        res.status(200).json({
          message: `Uploaded clr Cow Table to ${isDevice ? "device" : "dairy"
            } ${id}`,
          modifiedCount: updateMain.modifiedCount,
          clrCowId,
          clrCowEffectiveDate: formattedDate,
          clrCowTable: sortedJson,
        });
      } catch (err) {
        console.error("❌ MongoDB update error:", err);
        deleteFile(filePath);
        res.status(500).json({ error: "Database update failed" });
      }
    })
    .on("error", (err) => {
      console.error("❌ CSV parse error:", err);
      deleteFile(filePath);
      res.status(500).json({ error: "CSV parse failed" });
    });
});

module.exports = router;