const express = require('express');
const Device = require('../../models/DeviceModel');
const router = express.Router();

// Delete device by deviceid
router.delete('/:deviceid', async (req, res) => {
  const { deviceid } = req.params;

  try {
    const result = await Device.deleteOne({ deviceid: deviceid.trim() });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Device not found' });
    }

    res.json({ message: 'Device deleted successfully' });
  } catch (error) {
    console.error('Error deleting device:', error);
    res.status(500).json({ message: 'Error deleting device', error });
  }
});

module.exports = router;
