const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Use the same schema as addMember for validation
const DevicesList = mongoose.models.DevicesList || mongoose.model('DevicesList', new mongoose.Schema({}, { strict: false, collection: 'devicesList' }));

// PUT /editMember
// PUT /editMember
router.put('/', async (req, res) => {
  const { deviceid, CODE, MILKTYPE, COMMISSIONTYPE, MEMBERNAME, CONTACTNO, STATUS } = req.body;

  if (!deviceid || CODE == null || !MILKTYPE) {
    return res.status(400).json({ error: 'deviceid, CODE, and MILKTYPE are required to identify the member.' });
  }

  // Field validations
  if (COMMISSIONTYPE && !(COMMISSIONTYPE === 'N' || (/^[1-8]$/.test(COMMISSIONTYPE)))) {
    return res.status(400).json({ error: "COMMISSIONTYPE must be 'N' or a digit from 1 to 8." });
  }
  if (MEMBERNAME && (typeof MEMBERNAME !== 'string' || MEMBERNAME.length > 20)) {
    return res.status(400).json({ error: 'MEMBERNAME must be at most 20 characters.' });
  }
  if (CONTACTNO && !/^\d{10}$/.test(String(CONTACTNO))) {
    return res.status(400).json({ error: 'CONTACTNO must be a 10-digit number.' });
  }
  if (STATUS && !['A', 'D'].includes(STATUS)) {
    return res.status(400).json({ error: "STATUS must be 'A' or 'D'." });
  }

  try {
    // Find the device document
    const device = await DevicesList.findOne({ deviceid });
    if (!device) {
      return res.status(404).json({ error: 'Device not found.' });
    }

    // Find the member
    const member = device.members.find(m => m.CODE === CODE && m.MILKTYPE === MILKTYPE);
    if (!member) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    // Update fields if provided
    if (COMMISSIONTYPE !== undefined) member.COMMISSIONTYPE = COMMISSIONTYPE;
    if (MEMBERNAME !== undefined) member.MEMBERNAME = MEMBERNAME;
    if (CONTACTNO !== undefined) member.CONTACTNO = CONTACTNO;
    if (STATUS !== undefined) member.STATUS = STATUS;

    await device.save();

    res.status(200).json({ message: 'Member details updated successfully.', member });
  } catch (err) {
    console.error('Error editing member:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router; 