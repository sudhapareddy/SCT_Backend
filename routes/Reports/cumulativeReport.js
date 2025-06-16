const express = require("express");
const moment = require("moment");
const router = express.Router();
const Record = require("../../models/RecordModel");

router.get("/", async (req, res) => {
  const { deviceid, fromDate, toDate, fromCode, toCode, page = 1, limit = 10 } = req.query;

  if (!deviceid || !fromDate || !toDate || !fromCode || !toCode) {
    return res.status(400).json({
      error: "deviceid, fromDate, toDate, fromCode, and toCode are required",
    });
  }

  try {
    const fromCodeNum = parseInt(fromCode);
    const toCodeNum = parseInt(toCode);
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

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

      grandTotalQty += qty;
      grandTotalAmount += qty * rate;
      grandTotalIncentive += incentive;
    }

    const finalList = Object.values(resultMap)
      .map((item) => {
        const avgRate = item.totalQty > 0 ? item.totalAmount / item.totalQty : 0;
        return {
          CODE: item.CODE,
          MILKTYPE: item.MILKTYPE,
          totalQty: item.totalQty.toFixed(2),
          avgRate: avgRate.toFixed(2),
          totalIncentive: item.totalIncentive.toFixed(2),
          totalAmount: item.totalAmount.toFixed(2),
          grandTotal: (item.totalAmount + item.totalIncentive).toFixed(2),
        };
      })
      .sort((a, b) => {
        if (a.CODE !== b.CODE) return a.CODE - b.CODE;
        return a.MILKTYPE.localeCompare(b.MILKTYPE);
      });

    const totalRecords = finalList.length;
    const paginatedList = finalList.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    const milkTypeSummary = Object.values(milkTypeTotals).map((item) => {
      return {
        MILKTYPE: item.MILKTYPE,
        memberCount: item.memberCount.size,
        totalQty: item.totalQty.toFixed(2),
        totalAmount: item.totalAmount.toFixed(2),
        totalIncentive: item.totalIncentive.toFixed(2),
        grandTotal: (item.totalAmount + item.totalIncentive).toFixed(2),
      };
    });

    res.json({
      data: paginatedList,
      milkTypeTotals: milkTypeSummary,
      totalMembers: totalRecords,
      grandTotalQty: grandTotalQty.toFixed(2),
      grandTotalIncentive: grandTotalIncentive.toFixed(2),
      grandTotalAmount: grandTotalAmount.toFixed(2),
      grandTotal: (grandTotalAmount + grandTotalIncentive).toFixed(2),
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalRecords: totalRecords,
        totalPages: Math.ceil(totalRecords / limitNum),
      },
    });
  } catch (error) {
    console.error("Cumulative report error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
