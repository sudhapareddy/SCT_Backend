// routes/api/record/getRecordsByCodeDateShift.js
const express = require("express");
const router = express.Router();
const Record = require("../../models/RecordModel");

router.get("/", async (req, res) => {
  const { devicecode, date, shift } = req.query;

  if (!devicecode || !date || !shift) {
    return res
      .status(400)
      .json({ message: "devicecode, date, and shift are required" });
  }

  try {
    const records = await Record.find({
      DEVICEID: devicecode,
      SAMPLEDATE: date,
      SHIFT: new RegExp(`^${shift}$`, "i"), // match case-insensitive
    });

    if (records.length > 0) {
      res.json(records);
    } else {
      res.status(404).json({ message: "Records not found" });
    }
  } catch (err) {
    console.error(err); // helpful for debugging
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
