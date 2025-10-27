const express = require("express");
const router = express.Router();
const Record = require("../../models/RecordModel");

// Update existing record by ID
router.put("/:id", async (req, res) => {
  try {
    const updatedRecord = await Record.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedRecord) {
      return res.status(404).json({ message: "Record not found" });
    }
    res.json(updatedRecord);
  } catch (err) {
    res.status(500).json({ message: "Error updating record" });
  }
});

module.exports = router;
