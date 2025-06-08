const express = require('express');
const router = express.Router();
const Dairy = require('../../models/DairyModel');
const bcrypt = require('bcrypt');

// POST /api/dairy/add
router.post('/', async (req, res) => {
  const { dairyCode, dairyName, email, password } = req.body;

  // Validate dairyCode format
  if (!/^[A-Z]{3}$/.test(dairyCode)) {
    return res.status(400).json({ error: 'Dairy code must be 3 uppercase letters' });
  }

  // Check if password is provided and not empty or whitespace
  if (!password || password.trim() === '') {
    return res.status(400).json({ error: 'Password is required and cannot be empty' });
  }

  try {
    const existingDairy = await Dairy.findOne({ dairyCode: dairyCode.trim() });
    if (existingDairy) {
      return res.status(400).json({ error: `Dairy with code ${dairyCode} already exists` });
    }

    const existingEmail = await Dairy.findOne({ email: email.trim().toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({ error: `Dairy with email ${email} already exists` });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new dairy
    const newDairy = new Dairy({
      dairyCode: dairyCode.trim(),
      dairyName: dairyName.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
    });

    await newDairy.save();
    res.status(201).json({ message: 'Dairy added successfully' });
  } catch (err) {
    console.error('Error adding dairy:', err);
    res.status(500).json({ error: 'Error creating dairy entry' });
  }
});


module.exports = router;
