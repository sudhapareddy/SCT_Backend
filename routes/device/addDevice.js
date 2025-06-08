const express = require('express');
const Device = require('../../models/DeviceModel');
const bcrypt = require('bcrypt');


const router = express.Router();

// POST /api/device/add
router.post('/', async (req, res) => {
  const { deviceid, dairyCode, status, email, password } = req.body;

  try {
    // Check if device already exists (optional safe check)
    const existingDevice = await Device.findOne({ deviceid });
    if (existingDevice) {
      return res.status(400).json({ error: 'Device ID already exists' });
    }
    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    // Create new device
    const hashedPassword = await bcrypt.hash(password, 10);

    const deviceData = {
      deviceid: deviceid,
      dairyCode: dairyCode,
      status: status || 'active',
      email: email,
      password: hashedPassword
    };
    const newDevice = new Device(deviceData);

    await newDevice.save();

    res.json({
      message: 'Device added successfully',
      device: newDevice
    });

  } catch (err) {
    console.error('Error adding device:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
