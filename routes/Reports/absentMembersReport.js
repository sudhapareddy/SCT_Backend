const express = require("express");
const router = express.Router();

const Device = require("../../models/DeviceModel");
const Record = require("../../models/RecordModel");

// GET /api/reports/absent-members-report?deviceid=SCT1234&date=28/05/2025&shift=EVENING&page=1&limit=10
router.get("/", async (req, res) => {
  const { deviceid, date, shift, page = 1, limit = 10 } = req.query;

  if (!deviceid || !date || !shift) {
    return res
      .status(400)
      .json({ error: "deviceid, date, and shift are required" });
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  if (isNaN(pageNum) || pageNum <= 0 || isNaN(limitNum) || limitNum <= 0) {
    return res.status(400).json({ error: "Invalid page or limit value" });
  }

  try {
    // 1. Get device and all members
    const device = await Device.findOne({ deviceid });
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }
    const allMembers = device.members || [];

    // 2. Get present records
    const presentRecords = await Record.find({
      DEVICEID: deviceid,
      SAMPLEDATE: date,
      SHIFT: shift,
    }).select("CODE");

    const presentCodes = presentRecords.map((r) => r.CODE);

    // 3. Compute absent list
    const absentMembersAll = allMembers
      .filter((m) => !presentCodes.includes(m.CODE))
      .map(({ CODE, MILKTYPE, MEMBERNAME }) => ({
        CODE,
        MILKTYPE,
        MEMBERNAME,
      }));

    // 4. Milk type count
    const cowAbsentCount = absentMembersAll.filter(
      (m) => m.MILKTYPE?.toUpperCase() === "C"
    ).length;

    const bufAbsentCount = absentMembersAll.filter(
      (m) => m.MILKTYPE?.toUpperCase() === "B"
    ).length;

    // 5. Pagination
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedAbsent = absentMembersAll.slice(startIndex, startIndex + limitNum);

    // 6. Return result
    res.json({
      totalMembers: allMembers.length,
      presentCount: presentCodes.length,
      absentCount: absentMembersAll.length,
      totalRecords: absentMembersAll.length,
      cowAbsentCount,
      bufAbsentCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(absentMembersAll.length / limitNum),
      absentMembers: paginatedAbsent,
    });
  } catch (error) {
    console.error("Error fetching absent members:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
