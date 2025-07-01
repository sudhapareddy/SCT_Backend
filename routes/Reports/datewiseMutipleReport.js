const express = require("express");
const Record = require("../../models/RecordModel");
const router = express.Router();

router.get("/multiple", async (req, res) => {
  const { deviceCodes, date, shift } = req.query;

  if (!deviceCodes || !date) {
    return res
      .status(400)
      .json({ error: "Device codes and date are required." });
  }

  const deviceCodeArray = deviceCodes.split(",");

  const matchCondition = {
    DEVICEID: { $in: deviceCodeArray },
    SAMPLEDATE: date,
    ...(shift ? { SHIFT: shift } : {}),
  };

  try {
    let totals = await Record.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: { milkType: "$MILKTYPE" },
          totalQuantity: { $sum: "$QTY" },
          totalAmount: { $sum: { $multiply: ["$QTY", "$RATE"] } },
          totalIncentive: { $sum: "$INCENTIVEAMOUNT" },
          averageFat: { $avg: "$FAT" },
          averageSNF: { $avg: "$SNF" },
          weightedRateAmount: { $sum: { $multiply: ["$QTY", "$RATE"] } },
          totalRecords: { $sum: 1 },
        },
      },
      {
        $addFields: {
          averageRate: {
            $cond: [
              { $gt: ["$totalQuantity", 0] },
              { $divide: ["$weightedRateAmount", "$totalQuantity"] },
              0,
            ],
          },
        },
      },
      {
        $unionWith: {
          coll: "records",
          pipeline: [
            { $match: matchCondition },
            {
              $group: {
                _id: { milkType: "TOTAL" },
                totalQuantity: { $sum: "$QTY" },
                totalAmount: { $sum: { $multiply: ["$QTY", "$RATE"] } },
                totalIncentive: { $sum: "$INCENTIVEAMOUNT" },
                averageFat: { $avg: "$FAT" },
                averageSNF: { $avg: "$SNF" },
                weightedRateAmount: { $sum: { $multiply: ["$QTY", "$RATE"] } },
                totalRecords: { $sum: 1 },
              },
            },
            {
              $addFields: {
                averageRate: {
                  $cond: [
                    { $gt: ["$totalQuantity", 0] },
                    { $divide: ["$weightedRateAmount", "$totalQuantity"] },
                    0,
                  ],
                },
              },
            },
          ],
        },
      },
      { $sort: { "_id.milkType": 1 } },
    ]);

    // Ensure COW, BUF, TOTAL are always present
    const milkTypes = ["COW", "BUF", "TOTAL"];
    milkTypes.forEach((type) => {
      if (!totals.find((t) => t._id.milkType === type)) {
        totals.push({
          _id: { milkType: type },
          totalQuantity: 0,
          totalAmount: 0,
          totalIncentive: 0,
          averageFat: 0,
          averageSNF: 0,
          averageRate: 0,
          totalRecords: 0,
        });
      }
    });

    // Format and sort
    totals = totals.map((item) => ({
      ...item,
      averageFat: item.averageFat ? item.averageFat.toFixed(1) : "0.0",
      averageSNF: item.averageSNF ? item.averageSNF.toFixed(1) : "0.0",
      averageRate: item.averageRate ? item.averageRate.toFixed(2) : "0.00",
    }));

    totals.sort(
      (a, b) =>
        milkTypes.indexOf(a._id.milkType) - milkTypes.indexOf(b._id.milkType)
    );

    const records = await Record.find(matchCondition);

    if (totals.length === 0 && records.length === 0) {
      return res
        .status(404)
        .json({
          error: "No records found for the given device codes and date.",
        });
    }

    return res.json({ totals, records });
  } catch (err) {
    console.error("Error generating multi-device report:", err);
    res
      .status(500)
      .json({
        error: err.message || "Internal server error",
        stack: err.stack,
      });
  }
});

module.exports = router;



