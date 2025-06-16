const express = require("express");
const Record = require("../../models/RecordModel");
const router = express.Router();

router.get("/", async (req, res) => {
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

  if (!deviceId || !fromDate || !toDate || !fromCode || !toCode) {
    return res
      .status(400)
      .json({ error: "Missing required query parameters." });
  }

  const isBoth = !shift || shift.toLowerCase() === "both";
  const pageInt = parseInt(page);
  const limitInt = parseInt(limit);
  const skip = (pageInt - 1) * limitInt;

  try {
    const parsedFrom = new Date(fromDate.split("/").reverse().join("-"));
    const parsedTo = new Date(toDate.split("/").reverse().join("-"));
    const baseMatch = {
      DEVICEID: deviceId,
      CODE: { $gte: parseInt(fromCode), $lte: parseInt(toCode) },
    };

    if (!isBoth) {
      baseMatch.SHIFT = shift.toUpperCase();
    }

    // ---------- Summary Pipeline ----------
    const summaryPipeline = [
      {
        $addFields: {
          parsedDate: {
            $dateFromString: {
              dateString: { $trim: { input: "$SAMPLEDATE" } },
              format: "%d/%m/%Y",
            },
          },
        },
      },
      {
        $match: {
          ...baseMatch,
          parsedDate: { $gte: parsedFrom, $lte: parsedTo },
        },
      },
      {
        $group: {
          _id: {
            date: "$SAMPLEDATE",
            parsedDate: "$parsedDate",
            shift: isBoth ? "ALL" : "$SHIFT",
            milktype: "$MILKTYPE",
          },
          totalSamples: { $sum: 1 },
          avgFat: { $avg: "$FAT" },
          avgSnf: { $avg: "$SNF" },
          avgRate: { $avg: "$RATE" },
          totalQty: { $sum: "$QTY" },
          totalAmount: { $sum: { $multiply: ["$QTY", "$RATE"] } },
          totalIncentive: { $sum: "$INCENTIVEAMOUNT" },
        },
      },
      {
        $group: {
          _id: {
            date: "$_id.date",
            parsedDate: "$_id.parsedDate",
            shift: "$_id.shift",
          },
          milktypeStats: {
            $push: {
              milktype: "$_id.milktype",
              totalSamples: "$totalSamples",
              avgFat: "$avgFat",
              avgSnf: "$avgSnf",
              avgRate: "$avgRate",
              totalQty: "$totalQty",
              totalAmount: "$totalAmount",
              totalIncentive: "$totalIncentive",
              grandTotal: { $add: ["$totalAmount", "$totalIncentive"] },
            },
          },
          avgFatAll: { $avg: "$avgFat" },
          totalSamplesAll: { $sum: "$totalSamples" },
          avgSnfAll: { $avg: "$avgSnf" },
          avgRateAll: { $avg: "$avgRate" },
          totalQtyAll: { $sum: "$totalQty" },
          totalAmountAll: { $sum: "$totalAmount" },
          totalIncentiveAll: { $sum: "$totalIncentive" },
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id.date",
          shift: "$_id.shift",
          parsedDate: "$_id.parsedDate",
          milktypeStats: {
            $map: {
              input: {
                $concatArrays: [
                  "$milktypeStats",
                  [
                    {
                      milktype: "ALL",
                      totalSamples: "$totalSamplesAll",
                      avgFat: "$avgFatAll",
                      avgSnf: "$avgSnfAll",
                      avgRate: "$avgRateAll",
                      totalQty: "$totalQtyAll",
                      totalAmount: "$totalAmountAll",
                      totalIncentive: "$totalIncentiveAll",
                      grandTotal: {
                        $add: ["$totalAmountAll", "$totalIncentiveAll"],
                      },
                    },
                  ],
                ],
              },
              as: "stat",
              in: {
                milktype: "$$stat.milktype",
                totalSamples: "$$stat.totalSamples",
                avgFat: { $round: ["$$stat.avgFat", 1] },
                avgSnf: { $round: ["$$stat.avgSnf", 1] },
                avgRate: { $round: ["$$stat.avgRate", 2] },
                totalQty: { $round: ["$$stat.totalQty", 2] },
                totalAmount: { $round: ["$$stat.totalAmount", 2] },
                totalIncentive: { $round: ["$$stat.totalIncentive", 2] },
                grandTotal: { $round: ["$$stat.grandTotal", 2] },
              },
            },
          },
        },
      },
      { $sort: { parsedDate: 1 } },
      { $skip: skip },
      { $limit: limitInt },
    ];

    const summary = await Record.aggregate(summaryPipeline);

    // ---------- Raw Records ----------
    const recordPipeline = [
      {
        $addFields: {
          parsedDate: {
            $dateFromString: {
              dateString: { $trim: { input: "$SAMPLEDATE" } },
              format: "%d/%m/%Y",
              onError: null,
              onNull: null,
            },
          },
        },
      },
      {
        $match: {
          ...baseMatch,
          parsedDate: { $gte: parsedFrom, $lte: parsedTo },
        },
      },
      { $sort: { parsedDate: 1, SAMPLETIME: 1 } },
      { $skip: skip },
      { $limit: limitInt },
    ];

    const recordsRaw = await Record.aggregate(recordPipeline);

    const formattedRecords = recordsRaw.map((r) => ({
      DEVICEID: r.DEVICEID,
      CODE: r.CODE,
      SAMPLEDATE: r.SAMPLEDATE,
      SHIFT: r.SHIFT,
      MILKTYPE: r.MILKTYPE,
      FAT: r.FAT?.toFixed(1),
      SNF: r.SNF?.toFixed(1),
      RATE: r.RATE?.toFixed(2),
      QTY: r.QTY?.toFixed(2),
      INCENTIVEAMOUNT: r.INCENTIVEAMOUNT?.toFixed(2),
      TOTALAMOUNT: r.QTY && r.RATE ? (r.QTY * r.RATE).toFixed(2) : "0.00",
    }));

    res.json({
      page: pageInt,
      limit: limitInt,
      summaryCount: summary.length,
      summary,
      recordsCount: formattedRecords.length,
      records: formattedRecords,
    });
  } catch (err) {
    console.error("Aggregation error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

module.exports = router;
