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

  const user = req.user;
  console.log("user", user);
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

  const effectiveDate = req.body.snfCowEffectiveDate;

  
  const date = new Date(effectiveDate);

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);

  const formattedDate = dd + mm + yy;

  if (!formattedDate)) {
    deleteFile(filePath);
    return res.status(400).json({ error: "Invalid or missing effective date" });
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
        const snfCowId = Math.floor(1000 + Math.random() * 9000);

        const updateMain = await model.updateOne(filter, {
          $set: { snfCowTable: sortedJson },
        });

        // Update rateChartIds.snfCowId
        if (isDevice) {
          await deviceModel.updateOne(filter, {
            $set: {
              "rateChartIds.snfCowId": snfCowId,
              "effectiveDates.snfCowEffectiveDate": formattedDate,
              isDeviceRateTable: true,
            },
          });
        } else {
          await deviceModel.updateMany(
            { dairyCode: id },
            {
              $set: {
                "rateChartIds.snfCowId": snfCowId,
                "effectiveDates.snfCowEffectiveDate": formattedDate,
                isDeviceRateTable: false,
              },
            }
          );
        }

        deleteFile(filePath);

        res.status(200).json({
          message: `Uploaded SNF Cow Table to ${
            isDevice ? "device" : "dairy"
          } ${id}`,
          modifiedCount: updateMain.modifiedCount,
          snfCowId,
          snfCowEffectiveDate: formattedDate,
          snfCowTable: sortedJson,
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
