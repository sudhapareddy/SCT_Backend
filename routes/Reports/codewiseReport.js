const express = require('express');
const Record = require('../../models/RecordModel');
const router = express.Router();

router.get('/', async (req, res) => {
  const { deviceCode, memberCode, fromDate, toDate } = req.query;

  if (!deviceCode || !memberCode || !fromDate || !toDate) {
    return res.status(400).json({ error: 'Device code, member code, fromDate, and toDate are required.' });
  }

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
                averageRate: { $avg: "$RATE" },
                totalRecords: { $sum: 1 }
              }
            }
          ]
        }
      },
      { $sort: { "_id.milkType": 1 } }
    ]);

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
          averageRate: 0,
          totalRecords: 0
        });
      }
    });

    totals.sort((a, b) => milkTypes.indexOf(a._id.milkType) - milkTypes.indexOf(b._id.milkType));

    // Round avg values
    totals = totals.map(item => ({
      ...item,
      averageFat: item.averageFat ? item.averageFat.toFixed(1) : 0,
      averageSNF: item.averageSNF ? item.averageSNF.toFixed(1) : 0,
      averageRate: item.averageRate ? item.averageRate.toFixed(2) : 0
    }));

    // ✅ updated records query to use aggregate + $dateFromString + sort by date
    const records = await Record.aggregate([
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
      { $sort: { parsedDate: 1 } } // Sort by parsedDate in ascending order
    ]);

    if (totals.length === 0 && records.length === 0) {
      return res.status(404).json({ error: 'No records found for the given criteria.' });
    }

    res.json({ totals, records });
  } catch (err) {
    console.error('Error generating codewise report:', err);
    res.status(500).json({ error: err.message || 'Internal server error', stack: err.stack });
  }
});

module.exports = router;
