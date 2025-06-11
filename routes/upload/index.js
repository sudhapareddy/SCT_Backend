const express = require("express");
const router = express.Router();
const Record = require("../../models/RecordModel");

router.get("/", async (req, res) => {
  const { deviceid, fromDate, toDate, fromCode, toCode } = req.query;

  if (!deviceid || !fromDate || !toDate || !fromCode || !toCode) {
    return res.status(400).json({
      error: "deviceid, fromDate, toDate, fromCode, and toCode are required",
    });
  }

  try {
    const fromCodeNum = parseInt(fromCode);
    const toCodeNum = parseInt(toCode);

    const records = await Record.find({
      DEVICEID: deviceid,
      SAMPLEDATE: { $gte: fromDate, $lte: toDate },
      CODE: { $gte: fromCodeNum, $lte: toCodeNum },
    });

    const resultMap = {};

    for (const rec of records) {
      const code = rec.CODE;
      if (typeof code !== "number") continue;

      if (!resultMap[code]) {
        resultMap[code] = {
          CODE: code,
          MILKTYPE: rec.MILKTYPE,
          totalQty: 0,
          totalAmount: 0,
          totalIncentive: 0,
        };
      }

      resultMap[code].totalQty += rec.QTY || 0;
      resultMap[code].totalAmount += (rec.QTY || 0) * (rec.RATE || 0);
      resultMap[code].totalIncentive += rec.INCENTIVEAMOUNT || 0;
    }

    const finalList = Object.values(resultMap).map((item) => {
      const avgRate = item.totalQty > 0 ? item.totalAmount / item.totalQty : 0;

      return {
        CODE: item.CODE,
        MILKTYPE: item.MILKTYPE,
        totalQty: item.totalQty.toFixed(2),
        avgRate: avgRate.toFixed(2),
        totalIncentive: item.totalIncentive.toFixed(2),
        totalAmount: item.totalAmount.toFixed(2),
      };
    });

    res.json({ totalMembers: finalList.length, data: finalList });
  } catch (error) {
    console.error("Cumulative report error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
