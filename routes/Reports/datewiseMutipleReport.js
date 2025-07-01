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
          averageCLR: { $avg: "$CLR" },
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
      { $sort: { "_id.milkType": 1 } },
    ]);

    // Ensure COW and BUF are always present
    const milkTypes = ["COW", "BUF", "TOTAL"];
    milkTypes.slice(0, 2).forEach((type) => {
      if (!totals.find((t) => t._id.milkType === type)) {
        totals.push({
          _id: { milkType: type },
          totalQuantity: 0,
          totalAmount: 0,
          totalIncentive: 0,
          averageFat: 0,
          averageSNF: 0,
          averageCLR: 0,
          averageRate: 0,
          totalRecords: 0,
          weightedRateAmount: 0,
        });
      }
    });

    // Calculate TOTAL row
    const totalRow = totals.reduce(
      (acc, item) => {
        if (item._id.milkType === "TOTAL") return acc;

        acc.totalQuantity += item.totalQuantity;
        acc.totalAmount += item.totalAmount;
        acc.totalIncentive += item.totalIncentive;
        acc.weightedRateAmount += item.weightedRateAmount;
        acc.totalFat += item.averageFat * item.totalQuantity;
        acc.totalSNF += item.averageSNF * item.totalQuantity;
        acc.totalCLR += item.averageCLR * item.totalQuantity;
        acc.totalRecords += item.totalRecords;

        return acc;
      },
      {
        _id: { milkType: "TOTAL" },
        totalQuantity: 0,
        totalAmount: 0,
        totalIncentive: 0,
        weightedRateAmount: 0,
        totalFat: 0,
        totalSNF: 0,
        totalCLR: 0,
        totalRecords: 0,
      }
    );

    // Final computed average values
    const qty = totalRow.totalQuantity || 1;
    totalRow.averageFat = +(totalRow.totalFat / qty).toFixed(1);
    totalRow.averageSNF = +(totalRow.totalSNF / qty).toFixed(1);
    totalRow.averageCLR = +(totalRow.totalCLR / qty).toFixed(1);
    totalRow.averageRate = totalRow.totalQuantity
      ? +(totalRow.weightedRateAmount / totalRow.totalQuantity).toFixed(2)
      : 0;

    // Push TOTAL to totals
    totals.push(totalRow);

    // Final formatting
    totals = totals.map((item) => ({
      _id: item._id,
      totalQuantity: item.totalQuantity,
      totalAmount: item.totalAmount,
      totalIncentive: item.totalIncentive,
      averageFat: item.averageFat ? item.averageFat.toFixed(1) : "0.0",
      averageSNF: item.averageSNF ? item.averageSNF.toFixed(1) : "0.0",
      averageCLR: item.averageCLR ? item.averageCLR.toFixed(1) : "0.0",
      averageRate: item.averageRate ? item.averageRate.toFixed(2) : "0.00",
      totalRecords: item.totalRecords || 0,
    }));

    // Sort as COW, BUF, TOTAL
    totals.sort(
      (a, b) =>
        milkTypes.indexOf(a._id.milkType) - milkTypes.indexOf(b._id.milkType)
    );

    const records = await Record.find(matchCondition);

    if (totals.length === 0 && records.length === 0) {
      return res.status(404).json({
        error: "No records found for the given device codes and date.",
      });
    }

    return res.json({ totals, records });
  } catch (err) {
    console.error("Error generating multi-device report:", err);
    res.status(500).json({
      error: err.message || "Internal server error",
      stack: err.stack,
    });
  }
});

module.exports = router;
