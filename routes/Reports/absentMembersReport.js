const express = require("express");
const router = express.Router();

const Device = require("../../models/DeviceModel"); // devicesList
const Record = require("../../models/RecordModel"); // your milk records model

// GET /api/reports/absent-members-report?deviceid=SCT1234&date=28/05/2025&shift=EVENING
router.get("/", async (req, res) => {
  const { deviceid, date, shift } = req.query;

  if (!deviceid || !date || !shift) {
    return res
      .status(400)
      .json({ error: "deviceid, date, and shift are required" });
  }

  try {
    // 1. Get device and its members
    const device = await Device.findOne({ deviceid });

    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    const allMembers = device.members || [];

    // 2. Get present records from `records` collection
    const presentRecords = await Record.find({
      DEVICEID: deviceid,
      SAMPLEDATE: date,
      SHIFT: shift,
    }).select("CODE");

    const presentCodes = presentRecords.map((r) => r.CODE);

    // 3. Filter absent members with required fields only
    const absentMembers = allMembers
      .filter((m) => !presentCodes.includes(m.CODE))
      .map(({ CODE, MILKTYPE, MEMBERNAME }) => ({
        CODE,
        MILKTYPE,
        MEMBERNAME,
      }));

    // 4. Count milk types (normalize case)
    const cowAbsentCount = absentMembers.filter(
      (m) => m.MILKTYPE?.toUpperCase() === "C"
    ).length;

    const bufAbsentCount = absentMembers.filter(
      (m) => m.MILKTYPE?.toUpperCase() === "B"
    ).length;

    res.json({
      totalMembers: allMembers.length,
      presentCount: presentCodes.length,
      absentCount: absentMembers.length,
      cowAbsentCount,
      bufAbsentCount,
      absentMembers,
    });
  } catch (error) {
    console.error("Error fetching absent members:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;