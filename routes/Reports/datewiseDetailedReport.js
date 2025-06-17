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

    // ========== Shared Base Pipeline ==========
    const pipelineBase = [
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
      {
        $group: {
          _id: {
            date: "$SAMPLEDATE",
            parsedDate: "$parsedDate",
            shift: isBoth ? "$SHIFT" : shift.toUpperCase(),
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
    ];

    // ========== Count Total ==========
    const countPipeline = [...pipelineBase, { $count: "totalCount" }];
    const [countResult] = await Record.aggregate(countPipeline);
    const totalCount = countResult?.totalCount || 0;

    // ========== Paginated Summary Data ==========
    const paginatedPipeline = [
      ...pipelineBase,
      { $sort: { parsedDate: 1 } },
      { $skip: skip },
      { $limit: limitInt },
    ];

    const summaryData = await Record.aggregate(paginatedPipeline);

    // ========== Raw Records Grouped by Date & Shift ==========
    const rawRecords = await Record.aggregate([
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
      {
        $group: {
          _id: {
            date: "$SAMPLEDATE",
            shift: isBoth ? "$SHIFT" : shift.toUpperCase(),
          },
          records: {
            $push: {
              DEVICEID: "$DEVICEID",
              CODE: "$CODE",
              SAMPLEDATE: "$SAMPLEDATE",
              SHIFT: "$SHIFT",
              MILKTYPE: "$MILKTYPE",
              FAT: { $round: ["$FAT", 1] },
              SNF: { $round: ["$SNF", 1] },
              RATE: { $round: ["$RATE", 2] },
              QTY: { $round: ["$QTY", 2] },
              INCENTIVEAMOUNT: { $round: ["$INCENTIVEAMOUNT", 2] },
              TOTALAMOUNT: {
                $round: [{ $multiply: ["$QTY", "$RATE"] }, 2],
              },
            },
          },
        },
      },
    ]);

    // ========== Merge Raw Records with Summary ==========
    const merged = summaryData.map((summary) => {
      const matched = rawRecords.find(
        (r) => r._id.date === summary.date && r._id.shift === summary.shift
      );
      return {
        ...summary,
        records: matched?.records || [],
      };
    });

    res.json({
      page: pageInt,
      limit: limitInt,
      totalCount,
      totalPages: Math.ceil(totalCount / limitInt),
      data: merged,
    });
  } catch (err) {
    console.error("Aggregation error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

module.exports = router;
