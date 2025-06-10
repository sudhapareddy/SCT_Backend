const express = require("express");
const multer = require("multer");
const fs = require("fs");
const csv = require("csv-parser");
const path = require("path");

const verifyToken = require("../../middlewares/authMiddleware");
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

router.post("/", verifyToken, upload.single("file"), async (req, res) => {
  const filePath = req.file?.path;
  if (!filePath) return res.status(400).json({ error: "No file uploaded" });

  const snfBufEffectiveDate = req.body?.snfBufEffectiveDate;

  const date = new Date(snfBufEffectiveDate);

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);

  const formattedDate = dd + mm + yy;

  if (!formattedDate) {
    deleteFile(filePath);
    return res
      .status(400)
      .json({ error: "Missing snfBufEffectiveDate in request body" });
  }

  const user = req.user;
  if (!user || (user.role !== "dairy" && user.role !== "device")) {
    deleteFile(filePath);
    return res.status(403).json({ error: "Unauthorized user" });
  }

  const isDevice = user.role === "device";
  const id = isDevice ? user.deviceid : user.dairyCode;
  if (!id) {
    deleteFile(filePath);
    return res.status(400).json({ error: "Missing deviceId or dairyCode" });
  }

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

          if (!fat.includes(".")) fat = `${parseInt(fat)}.0`;

          const nested = headers.slice(1).reduce((acc, col) => {
            const val = row[col];
            if (val && !isNaN(parseFloat(val))) {
              const snfKey = col.replace("SNF", "").trim();
              const snfValue = snfKey.includes(".") ? snfKey : `${snfKey}.0`;
              acc.push({ [snfValue]: parseFloat(val) });
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
        const snfBufId = Math.floor(1000 + Math.random() * 9000); // 4-digit random

        const updateMain = await model.updateOne(filter, {
          $set: {
            snfBufTable: sortedJson,
          },
        });

        // Update rateChartIds and effectiveDates
        if (isDevice) {
          await deviceModel.updateOne(filter, {
            $set: {
              "rateChartIds.snfBufId": snfBufId,
              "effectiveDates.snfBufEffectiveDate": formattedDate,
              isDeviceRateTable: true,
            },
          });
        } else {
          await deviceModel.updateMany(
            { dairyCode: id },
            {
              $set: {
                "rateChartIds.snfBufId": snfBufId,
                "effectiveDates.snfBufEffectiveDate": formattedDate,
                isDeviceRateTable: false,
              },
            }
          );
        }

        deleteFile(filePath);

        res.status(200).json({
          message: `Uploaded SNF Buf Table to ${
            isDevice ? "device" : "dairy"
          } ${id}`,
          modifiedCount: updateMain.modifiedCount,
          snfBufId,
          formattedDate,
          snfBufTable: sortedJson,
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
