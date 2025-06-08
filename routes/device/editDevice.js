const express = require('express');
const Device = require('../../models/DeviceModel');
const bcrypt = require('bcrypt');

const router = express.Router();

// PUT /api/device/edit/:deviceid
router.put('/:deviceid', async (req, res) => {
  const { deviceid } = req.params;

  const {
    dairyCode,
    status,
    rateChartIds,
    effectiveDates,
    serverSettings,
    email,
    password,
    oldPassword
  } = req.body;

  try {
    const device = await Device.findOne({ deviceid: deviceid.trim() });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // 🔐 Require old password verification if changing password
    if (password) {
      if (!oldPassword) {
        return res.status(400).json({ error: 'Old password is required to set a new password' });
      }

      const isMatch = await bcrypt.compare(oldPassword, device.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Old password is incorrect' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      device.password = hashedPassword;
    }

    // ✅ Update other fields
    if (dairyCode) device.dairyCode = dairyCode;
    if (status) device.status = status;
    if (rateChartIds) device.rateChartIds = rateChartIds;
    if (effectiveDates) device.effectiveDates = effectiveDates;
    if (serverSettings) device.serverSettings = serverSettings;
    if (email) device.email = email;

    await device.save();

    res.json({
      message: 'Device updated successfully',
      device,
    });

  } catch (err) {
    console.error('Error updating device:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
