const express = require("express");
const router = express.Router();
const Dairy = require("../../models/DairyModel");
const bcrypt = require("bcrypt");

// POST /api/dairy/add
router.post("/", async (req, res) => {
  const { dairyCode, dairyName, email, password } = req.body;

  // Trim and normalize input
  const cleanDairyCode = dairyCode?.trim().toUpperCase();
  const cleanDairyName = dairyName?.trim();
  const cleanEmail = email?.trim().toLowerCase();

  // Basic validations
  if (!cleanDairyCode || !/^[A-Z]{3}$/.test(cleanDairyCode)) {
    return res
      .status(400)
      .json({ error: "Dairy code must be 3 uppercase letters" });
  }

  if (!cleanDairyName || !cleanEmail) {
    return res.status(400).json({ error: "Dairy name and email are required" });
  }

  if (!password || password.trim() === "") {
    return res
      .status(400)
      .json({ error: "Password is required and cannot be empty" });
  }

  try {
    const existingDairy = await Dairy.findOne({ dairyCode: cleanDairyCode });
    if (existingDairy) {
      return res
        .status(400)
        .json({ error: `Dairy with code ${cleanDairyCode} already exists` });
    }

    const existingEmail = await Dairy.findOne({ email: cleanEmail });
    if (existingEmail) {
      return res
        .status(400)
        .json({ error: `Dairy with email ${cleanEmail} already exists` });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newDairy = new Dairy({
      dairyCode: cleanDairyCode,
      dairyName: cleanDairyName,
      email: cleanEmail,
      password: hashedPassword,
    });

    await newDairy.save();

    res.status(201).json({ message: "Dairy added successfully" });
  } catch (err) {
    console.error("Error adding dairy:", err);

    if (err.code === 11000) {
      if (err.keyPattern?.email) {
        return res
          .status(400)
          .json({ error: `Email ${cleanEmail} already exists` });
      }
      if (err.keyPattern?.dairyCode) {
        return res
          .status(400)
          .json({ error: `Dairy code ${cleanDairyCode} already exists` });
      }
    }

    res.status(500).json({ error: "Error creating dairy entry" });
  }
});

module.exports = router;
