const express = require("express");
const Device = require("../../models/DeviceModel");
const bcrypt = require("bcrypt");

const router = express.Router();

// PUT /api/device/edit/:deviceid
router.put("/:deviceid", async (req, res) => {
  const { deviceid } = req.params;
  const {
    dairyCode,
    status,
    rateChartIds,
    effectiveDates,
    serverSettings,
    email,
    password,
    oldPassword,
  } = req.body;

  try {
    const trimmedDeviceId = deviceid.trim();
    const device = await Device.findOne({ deviceid: trimmedDeviceId });

    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    // 🔐 Password update logic
    if (password) {
      if (!oldPassword) {
        return res
          .status(400)
          .json({ error: "Old password is required to set a new password" });
      }

      const isMatch = await bcrypt.compare(oldPassword, device.password);
      if (!isMatch) {
        return res.status(401).json({ error: "Old password is incorrect" });
      }

      device.password = await bcrypt.hash(password, 10);
    }

    // 📧 Email duplication check
    if (email && email.trim().toLowerCase() !== device.email) {
      const existingEmailDevice = await Device.findOne({
        email: email.trim().toLowerCase(),
      });
      if (existingEmailDevice) {
        return res
          .status(400)
          .json({ error: "Email already in use by another device" });
      }
      device.email = email.trim().toLowerCase();
    }

    // ✅ Update other fields
    if (dairyCode) device.dairyCode = dairyCode.trim();
    if (status) device.status = status;
    if (rateChartIds) device.rateChartIds = rateChartIds;
    if (effectiveDates) device.effectiveDates = effectiveDates;
    if (serverSettings) device.serverSettings = serverSettings;

    await device.save();

    res.json({
      message: "Device updated successfully",
      device: {
        deviceid: device.deviceid,
        dairyCode: device.dairyCode,
        status: device.status,
        email: device.email,
        rateChartIds: device.rateChartIds,
        effectiveDates: device.effectiveDates,
        serverSettings: device.serverSettings,
      },
    });
  } catch (err) {
    console.error("Error updating device:", err);

    if (err.code === 11000 && err.keyPattern?.email) {
      return res.status(400).json({ error: "Email already exists" });
    }

    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
