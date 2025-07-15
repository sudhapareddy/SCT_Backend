const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const DevicesList = mongoose.models.DevicesList || mongoose.model('DevicesList', new mongoose.Schema({}, { strict: false, collection: 'devicesList' }));

// DELETE /deleteMember
router.delete('/', async (req, res) => {
  const { deviceid, CODE } = req.body;

  if (!deviceid || CODE == null ) {
    return res.status(400).json({ error: 'deviceId, CODE are required to identify the member.' });
  }

  try {
    // Find the device document
    const device = await DevicesList.findOne({ deviceid });
    if (!device) {
      return res.status(404).json({ error: 'Device not found.' });
    }

    const initialLength = device.members.length;
    device.members = device.members.filter(m => !(m.CODE === CODE));

    if (device.members.length === initialLength) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    await device.save();
    res.status(200).json({ message: 'Member deleted successfully.' });
  } catch (err) {
    console.error('Error deleting member:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router; 