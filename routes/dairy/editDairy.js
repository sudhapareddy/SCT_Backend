const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const Dairy = require('../../models/DairyModel');

router.put('/:dairyCode', async (req, res) => {
  try {
    const { dairyCode } = req.params;
    const { dairyName, email, oldPassword, password } = req.body;

    const dairy = await Dairy.findOne({ dairyCode: dairyCode.trim() });
    if (!dairy) {
      return res.status(404).json({ message: 'Dairy not found' });
    }

    // If new password is being set, validate old password first
    if (password) {
      if (!oldPassword) {
        return res.status(400).json({ message: 'Old password is required' });
      }

      const isMatch = await bcrypt.compare(oldPassword, dairy.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Old password is incorrect' });
      }
    }

    // Build update object
    const updatedFields = {
      dairyName,
      email
    };

    if (password) {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      updatedFields.password = hashedPassword;
    }

    const updatedDairy = await Dairy.findOneAndUpdate(
      { dairyCode: dairyCode.trim() },
      updatedFields,
      { new: true, runValidators: true }
    );

    res.json({ message: 'Dairy updated successfully', dairy: updatedDairy });
  } catch (err) {
    console.error('Error updating dairy:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
