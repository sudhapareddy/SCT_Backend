// routes/dairy/deleteDairy.js
const express = require('express');
const router = express.Router();
const Dairy = require('../../models/DairyModel');  // adjust path if needed

// DELETE request to delete a dairy by dairyCode
router.delete('/:dairyCode', async (req, res) => {
  try {
    const { dairyCode } = req.params;

    const deletedDairy = await Dairy.findOneAndDelete({ dairyCode: dairyCode.trim() });

    if (!deletedDairy) {
      return res.status(404).json({ message: 'Dairy not found' });
    }

    res.json({ message: 'Dairy deleted successfully', dairy: deletedDairy });
  } catch (err) {
    console.error('Error deleting dairy:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
