const express = require('express');
const Record = require('../../models/RecordModel');
const router = express.Router();

router.get('/', async (req, res) => {
  const { deviceCode, memberCode, fromDate, toDate, page = 1, limit = 10 } = req.query;

  if (!deviceCode || !memberCode || !fromDate || !toDate) {
    return res.status(400).json({
      error: 'Device code, member code, fromDate, and toDate are required.',
    });
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  try {
    let totals = await Record.aggregate([
      {
        $addFields: {
          parsedDate: {
            $dateFromString: { dateString: "$SAMPLEDATE", format: "%d/%m/%Y" }
          },
          AMOUNT: { $multiply: ["$QTY", "$RATE"] }
        }
      },
      {
        $match: {
          DEVICEID: deviceCode,
          CODE: parseInt(memberCode),
          parsedDate: { $gte: new Date(fromDate), $lte: new Date(toDate) }
        }
      },
      {
        $group: {
          _id: { device: "$DEVICEID", memberCode: "$CODE", milkType: "$MILKTYPE" },
          totalQuantity: { $sum: "$QTY" },
          totalAmount: { $sum: "$AMOUNT" },
          totalIncentive: { $sum: "$INCENTIVEAMOUNT" },
          averageFat: { $avg: "$FAT" },
          averageSNF: { $avg: "$SNF" },
          averageCLR: { $avg: "$CLR" }, // ✅ Added average CLR
          averageRate: { $avg: "$RATE" },
          totalRecords: { $sum: 1 }
        }
      },
      {
        $unionWith: {
          coll: 'records',
          pipeline: [
            {
              $addFields: {
                parsedDate: {
                  $dateFromString: { dateString: "$SAMPLEDATE", format: "%d/%m/%Y" }
                },
                AMOUNT: { $multiply: ["$QTY", "$RATE"] }
              }
            },
            {
              $match: {
                DEVICEID: deviceCode,
                CODE: parseInt(memberCode),
                parsedDate: { $gte: new Date(fromDate), $lte: new Date(toDate) }
              }
            },
            {
              $group: {
                _id: { device: "$DEVICEID", memberCode: "$CODE", milkType: "TOTAL" },
                totalQuantity: { $sum: "$QTY" },
                totalAmount: { $sum: "$AMOUNT" },
                totalIncentive: { $sum: "$INCENTIVEAMOUNT" },
                averageFat: { $avg: "$FAT" },
                averageSNF: { $avg: "$SNF" },
                averageCLR: { $avg: "$CLR" }, // ✅ Added average CLR
                averageRate: { $avg: "$RATE" },
                totalRecords: { $sum: 1 }
              }
            }
          ]
        }
      },
      { $sort: { "_id.milkType": 1 } }
    ]);

    // Ensure fixed structure (COW, BUF, TOTAL)
    const milkTypes = ['COW', 'BUF', 'TOTAL'];
    milkTypes.forEach(type => {
      if (!totals.find(t => t._id.milkType === type)) {
        totals.push({
          _id: { device: deviceCode, memberCode: parseInt(memberCode), milkType: type },
          totalQuantity: 0,
          totalAmount: 0,
          totalIncentive: 0,
          averageFat: 0,
          averageSNF: 0,
          averageCLR: 0,
          averageRate: 0,
          totalRecords: 0
        });
      }
    });

    // Sort and round
    totals.sort((a, b) => milkTypes.indexOf(a._id.milkType) - milkTypes.indexOf(b._id.milkType));

    totals = totals.map(item => ({
      ...item,
      averageFat: item.averageFat ? item.averageFat.toFixed(1) : "0.0",
      averageSNF: item.averageSNF ? item.averageSNF.toFixed(1) : "0.0",
      averageCLR: item.averageCLR ? item.averageCLR.toFixed(1) : "0.0", // ✅ Rounded CLR
      averageRate: item.averageRate ? item.averageRate.toFixed(2) : "0.00",
      totalQuantity: item.totalQuantity?.toFixed(2) || "0.00",
      totalAmount: item.totalAmount?.toFixed(2) || "0.00",
      totalIncentive: item.totalIncentive?.toFixed(2) || "0.00"
    }));

    // Fetch records
    const allRecords = await Record.aggregate([
      {
        $addFields: {
          parsedDate: {
            $dateFromString: { dateString: "$SAMPLEDATE", format: "%d/%m/%Y" }
          }
        }
      },
      {
        $match: {
          DEVICEID: deviceCode,
          CODE: parseInt(memberCode),
          parsedDate: { $gte: new Date(fromDate), $lte: new Date(toDate) }
        }
      },
      { $sort: { parsedDate: 1 } }
    ]);

    const enrichedRecords = allRecords.map(record => {
      const amount = (record.QTY || 0) * (record.RATE || 0);
      const incentive = record.INCENTIVEAMOUNT || 0;
      return {
        ...record,
        AMOUNT: amount,
        TOTAL: amount + incentive,
      };
    });

    // Slice for pagination
    const totalRecords = enrichedRecords.length;
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedRecords = enrichedRecords.slice(startIndex, startIndex + limitNum);

    if (totals.length === 0 && totalRecords === 0) {
      return res.status(404).json({ error: 'No records found for the given criteria.' });
    }

    res.json({
      totals,
      records: paginatedRecords,
      page: pageNum,
      limit: limitNum,
      totalRecords,
      totalPages: Math.ceil(totalRecords / limitNum),
    });
  } catch (err) {
    console.error('Error generating codewise report:', err);
    res.status(500).json({
      error: err.message || 'Internal server error',
      stack: err.stack
    });
  }
});

module.exports = router;
