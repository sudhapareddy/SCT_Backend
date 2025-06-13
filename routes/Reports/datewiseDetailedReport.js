const express = require("express");
const router = express.Router();
const Record = require("../../models/RecordModel");
const moment = require("moment");

router.get("/", async (req, res) => {
  try {
    const {
      deviceId,
      fromDate,
      toDate,
      fromCode,
      toCode,
      shift,
      page = 1,
      limit = 25,
    } = req.query;

    if (!deviceId || !fromDate || !toDate || !fromCode || !toCode || !shift) {
      return res
        .status(400)
        .json({ error: "Missing required query parameters." });
    }

    const start = moment(fromDate, "DD/MM/YYYY").format("DD/MM/YYYY");
    const end = moment(toDate, "DD/MM/YYYY").format("DD/MM/YYYY");
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const matchCondition = {
      DEVICEID: deviceId,
      CODE: { $gte: parseInt(fromCode), $lte: parseInt(toCode) },
      SAMPLEDATE: { $gte: start, $lte: end },
    };

    if (shift.toUpperCase() !== "BOTH") {
      matchCondition.SHIFT = shift.toUpperCase();
    }

    // Total record count
    const totalCount = await Record.countDocuments(matchCondition);

    // Fetch paginated records
    const records = await Record.find(matchCondition)
      .sort({ SAMPLEDATE: 1, SAMPLETIME: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Format response records
    const formattedRecords = records.map((rec) => ({
      CODE: rec.CODE,
      SAMPLEDATE: moment(rec.SAMPLEDATE, "DD/MM/YYYY").format("DD/MM/YYYY"),
      SHIFT: rec.SHIFT,
      FAT: rec.FAT.toFixed(1),
      SNF: rec.SNF.toFixed(1),
      RATE: rec.RATE.toFixed(2),
      QTY: rec.QTY.toFixed(2),
      INCENTIVEAMOUNT: rec.INCENTIVEAMOUNT.toFixed(2),
      ANALYZERMODE: rec.ANALYZERMODE,
      WEIGHTMODE: rec.WEIGHTMODE,
      WATER: rec.WATER,
    }));

    // Summary aggregation
    const summaryAgg = await Record.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: "$SHIFT",
          samples: { $sum: 1 },
          avgFat: { $avg: "$FAT" },
          avgSnf: { $avg: "$SNF" },
          avgRate: { $avg: "$RATE" },
          totalQty: { $sum: "$QTY" },
          totalIncentive: { $sum: "$INCENTIVEAMOUNT" },
          totalAmount: { $sum: { $multiply: ["$QTY", "$RATE"] } },
        },
      },
      {
        $project: {
          _id: 0,
          shift: "$_id",
          samples: 1,
          avgFat: { $round: ["$avgFat", 1] },
          avgSnf: { $round: ["$avgSnf", 1] },
          avgRate: { $round: ["$avgRate", 2] },
          totalQty: { $round: ["$totalQty", 2] },
          totalAmount: { $round: ["$totalAmount", 2] },
          totalIncentive: { $round: ["$totalIncentive", 2] },
          grandTotal: {
            $round: [{ $add: ["$totalAmount", "$totalIncentive"] }, 2],
          },
        },
      },
      { $sort: { shift: 1 } },
    ]);

    res.json({
      summary: summaryAgg,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalRecords: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit)),
      },
      records: formattedRecords,
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

module.exports = router;
