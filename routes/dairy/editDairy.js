const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const Dairy = require("../../models/DairyModel");

router.put("/:dairyCode", async (req, res) => {
  try {
    const { dairyCode } = req.params;
    const { dairyName, email, oldPassword, password } = req.body;

    const cleanDairyCode = dairyCode.trim();
    const cleanEmail = email?.trim().toLowerCase();
    const cleanName = dairyName?.trim();

    const dairy = await Dairy.findOne({ dairyCode: cleanDairyCode });
    if (!dairy) {
      return res.status(404).json({ message: "Dairy not found" });
    }

    // If new password is being set, validate old password first
    if (password) {
      if (!oldPassword) {
        return res.status(400).json({ message: "Old password is required" });
      }

      const isMatch = await bcrypt.compare(oldPassword, dairy.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Old password is incorrect" });
      }
    }

    // Check if the new email is already used by another dairy
    if (cleanEmail && cleanEmail !== dairy.email) {
      const emailExists = await Dairy.findOne({ email: cleanEmail });
      if (emailExists) {
        return res
          .status(400)
          .json({ message: "Email already in use by another dairy" });
      }
    }

    // Build update object
    const updatedFields = {};
    if (cleanName) updatedFields.dairyName = cleanName;
    if (cleanEmail) updatedFields.email = cleanEmail;

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updatedFields.password = hashedPassword;
    }

    const updatedDairy = await Dairy.findOneAndUpdate(
      { dairyCode: cleanDairyCode },
      updatedFields,
      { new: true, runValidators: true }
    );

    res.json({ message: "Dairy updated successfully", dairy: updatedDairy });
  } catch (err) {
    console.error("Error updating dairy:", err);

    if (err.code === 11000 && err.keyPattern?.email) {
      return res.status(400).json({ message: "Email already in use" });
    }

    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
