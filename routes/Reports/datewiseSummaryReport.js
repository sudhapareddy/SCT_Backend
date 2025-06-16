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
    const baseMatch = {
      DEVICEID: deviceId,
      CODE: { $gte: parseInt(fromCode), $lte: parseInt(toCode) },
    };

    if (!isBoth) {
      baseMatch.SHIFT = shift.toUpperCase();
    }

    const parsedFrom = new Date(fromDate.split("/").reverse().join("-"));
    const parsedTo = new Date(toDate.split("/").reverse().join("-"));

    const pipelineBase = [
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
      { $sort: { date: 1 } },
    ];

    // Clone the base pipeline for counting total records
    const countPipeline = [...pipelineBase, { $count: "totalCount" }];
    const [countResult] = await Record.aggregate(countPipeline);
    const totalCount = countResult?.totalCount || 0;

    // Add pagination steps to the base pipeline
    const paginatedPipeline = [
      ...pipelineBase,
      { $skip: skip },
      { $limit: limitInt },
    ];

    const results = await Record.aggregate(paginatedPipeline);

    res.json({
      page: pageInt,
      limit: limitInt,
      totalCount,
      totalPages: Math.ceil(totalCount / limitInt),
      data: results,
    });
  } catch (err) {
    console.error("Aggregation error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

module.exports = router;
