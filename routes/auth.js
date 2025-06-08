const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken'); // Add this import
const Dairy = require('../models/DairyModel');
const Device = require('../models/DeviceModel');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET; // Add JWT secret from environment variables

// Login endpoint
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Check Dairy
    const dairy = await Dairy.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
    if (dairy) {
      const match = await bcrypt.compare(password, dairy.password);
      if (!match) return res.status(401).json({ error: 'Invalid password for Dairy' });

      // Create JWT token for Dairy
      const token = jwt.sign(
        { email: dairy.email, type: 'dairy', id: dairy._id, role: dairy.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );


      return res.status(200).json({
        message: `Dairy login successful for ${dairy.dairyName || dairy.email}`,
        token,
        dairyName: dairy.dairyName,
        role: dairy.role,
        dairyCode: dairy.dairyCode
      });
    }

    // Check Device
    const device = await Device.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
    if (device) {
      const match = await bcrypt.compare(password, device.password);
      if (!match) return res.status(401).json({ error: 'Invalid password for Device' });

      // Create JWT token for Device
      const token = jwt.sign(
        { deviceid: device.deviceid, email: device.email, type: 'device', id: device._id, role: device.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.status(200).json({
        message: `Device login successful for ${device.deviceid || device.email}`,
        token,
        role: device.role,
        deviceName: device.deviceid,
        deviceid: device.deviceid,
        dairyCode: device.dairyCode
      });
    }

    return res.status(404).json({ error: 'Email not found for Dairy or Device' });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});




module.exports = router;
