const express = require("express");
const Device = require("../../models/DeviceModel");
const bcrypt = require("bcrypt");

const router = express.Router();

// POST /api/device/add
router.post("/", async (req, res) => {
  try {
    let { deviceid, dairyCode, status, email, password } = req.body;

    // Trim and sanitize input
    deviceid = deviceid?.trim();
    dairyCode = dairyCode?.trim().toUpperCase();
    email = email?.trim().toLowerCase();

    // Validation
    if (!deviceid || !dairyCode || !email || !password) {
      return res
        .status(400)
        .json({
          error: "Device ID, Dairy Code, Email, and Password are required",
        });
    }

    // Check for duplicate device ID
    const existingDevice = await Device.findOne({ deviceid });
    if (existingDevice) {
      return res.status(400).json({ error: "Device ID already exists" });
    }

    // Check for duplicate email
    const existingEmail = await Device.findOne({ email });
    if (existingEmail) {
      return res
        .status(400)
        .json({ error: "Email already in use by another device" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newDevice = new Device({
      deviceid,
      dairyCode,
      status: status || "active",
      email,
      password: hashedPassword,
    });

    await newDevice.save();

    res.status(201).json({
      message: "Device added successfully",
      device: {
        _id: newDevice._id,
        deviceid: newDevice.deviceid,
        dairyCode: newDevice.dairyCode,
        status: newDevice.status,
        email: newDevice.email,
      },
    });
  } catch (err) {
    console.error("Error adding device:", err);

    if (err.code === 11000) {
      const duplicateField = Object.keys(err.keyPattern)[0];
      return res
        .status(400)
        .json({ error: `${duplicateField} already exists` });
    }

    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
