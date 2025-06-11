const express = require("express");
const moment = require("moment");
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
    const from = moment(fromDate, "DD/MM/YYYY");
    const to = moment(toDate, "DD/MM/YYYY");

    const records = await Record.find({
      DEVICEID: deviceid,
      CODE: { $gte: fromCodeNum, $lte: toCodeNum },
    });

    const filteredRecords = records.filter((rec) => {
      const recDate = moment(rec.SAMPLEDATE, "DD/MM/YYYY");
      return recDate.isSameOrAfter(from) && recDate.isSameOrBefore(to);
    });

    const resultMap = {};
    const milkTypeTotals = {};
    let grandTotalQty = 0;
    let grandTotalAmount = 0;
    let grandTotalIncentive = 0;

    for (const rec of filteredRecords) {
      const code = rec.CODE;
      const milkType = rec.MILKTYPE || "UNKNOWN";
      const key = `${code}-${milkType}`;
      const qty = rec.QTY || 0;
      const rate = rec.RATE || 0;
      const incentive = rec.INCENTIVEAMOUNT || 0;

      // Per CODE + MILKTYPE
      if (!resultMap[key]) {
        resultMap[key] = {
          CODE: code,
          MILKTYPE: milkType,
          totalQty: 0,
          totalAmount: 0,
          totalIncentive: 0,
        };
      }
      resultMap[key].totalQty += qty;
      resultMap[key].totalAmount += qty * rate;
      resultMap[key].totalIncentive += incentive;

      // Per MILKTYPE totals
      if (!milkTypeTotals[milkType]) {
        milkTypeTotals[milkType] = {
          MILKTYPE: milkType,
          totalQty: 0,
          totalAmount: 0,
          totalIncentive: 0,
          memberCount: new Set(),
        };
      }
      milkTypeTotals[milkType].totalQty += qty;
      milkTypeTotals[milkType].totalAmount += qty * rate;
      milkTypeTotals[milkType].totalIncentive += incentive;
      milkTypeTotals[milkType].memberCount.add(code);

      // Grand totals
      grandTotalQty += qty;
      grandTotalAmount += qty * rate;
      grandTotalIncentive += incentive;
    }

    // Format per-member list with grandTotal
    const finalList = Object.values(resultMap)
      .map((item) => {
        const avgRate =
          item.totalQty > 0 ? item.totalAmount / item.totalQty : 0;
        const totalAmount = item.totalAmount;
        const totalIncentive = item.totalIncentive;
        return {
          CODE: item.CODE,
          MILKTYPE: item.MILKTYPE,
          totalQty: item.totalQty.toFixed(2),
          avgRate: avgRate.toFixed(2),
          totalIncentive: totalIncentive.toFixed(2),
          totalAmount: totalAmount.toFixed(2),
          grandTotal: (totalAmount + totalIncentive).toFixed(2), // ✅ here
        };
      })
      .sort((a, b) => {
        if (a.CODE !== b.CODE) return a.CODE - b.CODE;
        return a.MILKTYPE.localeCompare(b.MILKTYPE);
      });

    // Format milk type totals with grandTotal
    const milkTypeSummary = Object.values(milkTypeTotals).map((item) => {
      const totalAmount = item.totalAmount;
      const totalIncentive = item.totalIncentive;
      return {
        memberCount: item.memberCount.size,
        MILKTYPE: item.MILKTYPE,
        totalQty: item.totalQty.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        totalIncentive: totalIncentive.toFixed(2),
        grandTotal: (totalAmount + totalIncentive).toFixed(2), // ✅ here
      };
    });

    res.json({
      data: finalList,
      milkTypeTotals: milkTypeSummary,
      totalMembers: finalList.length,
      grandTotalQty: grandTotalQty.toFixed(2),
      grandTotalIncentive: grandTotalIncentive.toFixed(2),
      grandTotalAmount: grandTotalAmount.toFixed(2),
      grandTotal: (grandTotalAmount + grandTotalIncentive).toFixed(2), // ✅ here
    });
  } catch (error) {
    console.error("Cumulative report error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
