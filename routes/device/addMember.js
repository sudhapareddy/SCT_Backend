const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Define the schema for a member
const memberSchema = new mongoose.Schema({
  CODE: { type: Number, required: true },
  MILKTYPE: { type: String, required: true },
  COMMISSIONTYPE: { type: String, required: true },
  MEMBERNAME: { type: String, required: true },
  CONTACTNO: { type: String, required: false },
  STATUS: { type: String, required: true },
  createdOn: { type: Date, required: true },
}, { _id: false });

// Define the schema for devicesList
const devicesListSchema = new mongoose.Schema({
  // ... other fields ...
  members: [memberSchema],
}, { collection: 'devicesList' });

const DevicesList = mongoose.models.DevicesList || mongoose.model('DevicesList', devicesListSchema);

// POST /addMember
router.post('/', async (req, res) => {
  const { deviceid, CODE, MILKTYPE, COMMISSIONTYPE, MEMBERNAME, CONTACTNO, STATUS } = req.body;

  if (!deviceid || CODE == null || !MILKTYPE || !COMMISSIONTYPE || !MEMBERNAME  || !STATUS) {
    return res.status(400).json({ error: 'All fields are required: deviceId, CODE, MILKTYPE, COMMISSIONTYPE, MEMBERNAME, CONTACTNO, STATUS.' });
  }

  // Field validations
  if (!/^\d{1,4}$/.test(String(CODE))) {
    return res.status(400).json({ error: 'CODE must be a number with up to 4 digits.' });
  }
  if (!['C', 'B'].includes(MILKTYPE)) {
    return res.status(400).json({ error: "MILKTYPE must be 'C' or 'B'." });
  }
  if (!(COMMISSIONTYPE === 'N' || (/^[1-8]$/.test(COMMISSIONTYPE)))) {
    return res.status(400).json({ error: "COMMISSIONTYPE must be 'N' or a digit from 1 to 8." });
  }
  if (typeof MEMBERNAME !== 'string' || MEMBERNAME.length > 20) {
    return res.status(400).json({ error: 'MEMBERNAME must be at most 20 characters.' });
  }
  if (!/^\d{10}$/.test(CONTACTNO)) {
    return res.status(400).json({ error: 'CONTACTNO must be a 10-digit number.' });
  }
  if (!['A', 'D'].includes(STATUS)) {
    return res.status(400).json({ error: "STATUS must be 'A' or 'D'." });
  }

  try {
    // Find the device document
    const device = await DevicesList.findOne({ deviceid });
    if (!device) {
      return res.status(404).json({ error: 'Device not found.' });
    }

    // Check for duplicate CODE and MILKTYPE
    const duplicate = device.members.find(m => m.CODE === CODE && m.MILKTYPE === MILKTYPE);
    if (duplicate) {
      return res.status(409).json({ error: 'A member with the same CODE and MILKTYPE already exists.' });
    }

      // Add the new member
    device.members.push({ CODE, MILKTYPE, COMMISSIONTYPE, MEMBERNAME, CONTACTNO, STATUS, createdOn: new Date() });
    await device.save();

    res.status(201).json({ message: 'Member added successfully.', member: { CODE, MILKTYPE, COMMISSIONTYPE, MEMBERNAME, CONTACTNO, STATUS, createdOn: device.members[device.members.length - 1].createdOn } });
  } catch (err) {
    console.error('Error adding member:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router; 