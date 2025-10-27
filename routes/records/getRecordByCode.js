// routes/api/record/getRecordByCodeDateShift.js
const express = require("express");
const router = express.Router();
const Record = require("../../models/RecordModel");

router.get("/", async (req, res) => {
  const { devicecode, code, date, shift } = req.query;

  if (!devicecode || !code || !date || !shift) {
    return res
      .status(400)
      .json({ message: "devicecode,code, date, and shift are required" });
  }

  try {
    const record = await Record.findOne({
      DEVICEID: devicecode,
      CODE: code,
      SAMPLEDATE: date,
      SHIFT: shift,
    });

    if (record) {
      res.json(record);
    } else {
      res.status(404).json({ message: "Record not found" });
    }
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
