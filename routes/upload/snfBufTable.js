const express = require("express");
const multer = require("multer");
const fs = require("fs");
const csv = require("csv-parser");
const mongoose = require("mongoose");
const verifyToken = require("../../middlewares/authMiddleware");
const deviceModel = require("../../models/DeviceModel");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

const deleteFile = (path) => {
  fs.unlink(path, (err) => {
    if (err) console.error("❌ Error deleting file:", err);
    else console.log("✅ Temp file deleted:", path);
  });
};

router.post("/", verifyToken, upload.single("file"), async (req, res) => {
  const filePath = req.file?.path;
  if (!filePath) return res.status(400).json({ error: "No file uploaded" });

  const user = req.user;
  if (!user || (user.role !== "dairy" && user.role !== "device")) {
    deleteFile(filePath);
    return res.status(403).json({ error: "Unauthorized user" });
  }

  const prefix = user.role === "dairy" ? user.dairyCode : user.deviceid;
  const collectionName = `${prefix}_snfBufTable`;

  const results = [];
  let headers = [];

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

          // Normalize FAT key (e.g., 5 → 5.0)
          if (!fat.includes(".")) {
            fat = `${parseInt(fat)}.0`;
          }

          const nested = headers.slice(1).reduce((acc, col) => {
            const val = row[col];
            if (val && !isNaN(parseFloat(val))) {
              const snfKey = col.replace("SNF", "").trim();
              const snfValue = snfKey.includes(".") ? snfKey : `${snfKey}.0`;
              acc.push({ [snfValue]: parseFloat(val) });
            }
            return acc;
          }, []);

          // Sort SNF keys inside each FAT group
          nested.sort((a, b) => {
            const aKey = parseFloat(Object.keys(a)[0]);
            const bKey = parseFloat(Object.keys(b)[0]);
            return aKey - bKey;
          });

          dataMap.set(fat, nested);
        });

        // Sort FAT keys
        const sortedMap = new Map(
          [...dataMap.entries()].sort(
            (a, b) => parseFloat(a[0]) - parseFloat(b[0])
          )
        );

        // Convert to final object
        const sortedJson = {};
        for (const [numKey, value] of sortedMap) {
          sortedJson[numKey] = value;
        }

        // Dynamic model for device/dairy
        const DynamicModel = mongoose.model(
          collectionName,
          new mongoose.Schema({}, { strict: false }),
          collectionName
        );

        await DynamicModel.deleteMany({});
        const inserted = await DynamicModel.insertMany({ data: sortedJson });

        // Update device's snfBufId
        const deviceid = user.deviceid;
        const rateChartId = Math.floor(1000 + Math.random() * 9000);

        await deviceModel.updateOne(
          { deviceid: deviceid },
          { $set: { "rateChartIds.snfBufId": rateChartId } }
        );

        deleteFile(filePath);

        res.status(200).json({
          message: `Uploaded to ${collectionName}`,
          id: inserted[0]._id,
          data: inserted[0].data,
        });
      } catch (err) {
        console.error("❌ MongoDB insert error:", err);
        deleteFile(filePath);
        res.status(500).json({ error: "Database insert failed" });
      }
    })
    .on("error", (err) => {
      console.error("❌ CSV parse error:", err);
      deleteFile(filePath);
      res.status(500).json({ error: "CSV parse failed" });
    });
});

module.exports = router;
