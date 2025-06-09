const express = require("express");
const router = express.Router();
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const verifyToken = require("../../middlewares/authMiddleware");
const deviceModel = require("../../models/DeviceModel"); // Import your model

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
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const filePath = req.file.path;
  const user = req.user;

  // Ensure valid user role
  if (!user || (user.role !== "dairy" && user.role !== "device")) {
    deleteFile(filePath);
    return res.status(403).json({ error: "Unauthorized user role" });
  }

  // Get deviceid from user info (adjust if needed)
  const deviceid = user.deviceid;
  if (!deviceid) {
    deleteFile(filePath);
    return res.status(400).json({ error: "Missing deviceid in user info" });
  }

  const fatCowRecords = [];

  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (row) => {
      // Parse FAT and RATE as numbers
      const fat = parseFloat(row.FAT);
      const rate = parseFloat(row.RATE);

      if (!isNaN(fat) && !isNaN(rate)) {
        fatCowRecords.push({ FAT: fat, RATE: rate });
      }
    })
    .on("end", async () => {
      try {
        // Update fatCowTable array in devicesList collection for this device
        const updatedDoc = await deviceModel.findOneAndUpdate(
          { deviceid: deviceid },
          { $set: { fatCowTable: fatCowRecords } },
          { new: true, upsert: false }
        );

        deleteFile(filePath);

        if (!updatedDoc) {
          return res.status(404).json({ error: "Device not found" });
        }

        res.json({
          message: `Updated fatCowTable with ${fatCowRecords.length} records for device ${deviceid}`,
          updatedDeviceId: deviceid,
        });
      } catch (err) {
        console.error("Error updating fatCowTable:", err);
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
