const express = require("express");

const router = express.Router();

const Record = require("../../models/RecordModel");

router.post("/", async (req, res) => {
  try {
    const newRecord = new Record(req.body);
    const saved = await newRecord.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: "Error saving record" });
  }
});
module.exports = router;
