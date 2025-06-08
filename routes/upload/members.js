const express = require("express");
const router = express.Router();
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");
const Device = require("../../models/DeviceModel");
const verifyToken = require("../../middlewares/authMiddleware");

// Create uploads dir if not exist
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Setup multer
const upload = multer({ dest: uploadsDir });

// Utility to delete temp files
const deleteFile = (filePath) => {
  fs.unlink(filePath, (err) => {
    if (err) console.error("❌ Error deleting file:", err);
    else console.log("✅ Temp file deleted:", filePath);
  });
};

// POST /api/upload-members
router.post("/", verifyToken, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const filePath = req.file.path;
  const user = req.user;

  if (!user || !user.deviceid) {
    deleteFile(filePath);
    return res.status(403).json({ error: "Unauthorized or missing deviceid" });
  }

  const members = [];

  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (rawRow) => {
      const row = {};
      for (let key in rawRow) {
        row[key.trim()] = rawRow[key]?.trim(); // Trim both keys and values
      }
      //console.log(row);
      members.push({
        CODE: Number(row.CODE),
        MILKTYPE: row.MILKTYPE,
        COMMISSIONTYPE: row.COMMISSIONTYPE,
        MEMBERNAME: row.MEMBERNAME,
        CONTACTNO: row.CONTACTNO,
        STATUS: row.STATUS,
        createdOn: new Date(),
      });
    })
    .on("end", async () => {
      try {
        // Update members array for the device
        const updateResult = await Device.updateOne(
          { deviceid: user.deviceid },
          { $set: { members: members } } // Overwrites existing members array
        );

        deleteFile(filePath);

        if (updateResult.modifiedCount === 0) {
          return res
            .status(404)
            .json({ error: "Device not found or not updated" });
        }

        res.json({
          message: `Inserted ${members.length} members for device ${user.deviceid}`,
        });
      } catch (err) {
        console.error("Error updating members:", err);
        deleteFile(filePath);
        res.status(500).json({ error: "Internal Server Error" });
      }
    })
    .on("error", (err) => {
      console.error("CSV Parse Error:", err);
      deleteFile(filePath);
      res.status(500).json({ error: "CSV parsing failed" });
    });
});

module.exports = router;
