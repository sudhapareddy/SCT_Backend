const express = require('express');
const Record = require('../../models/RecordModel');
const router = express.Router();

router.get('/', async (req, res) => {
  const { deviceCode, date, shift } = req.query;

  if (!deviceCode || !date) {
    return res.status(400).json({ error: 'Device code and date are required.' });
  }

  // Build match condition based on shift presence
  const matchCondition = {
    DEVICEID: deviceCode,
    SAMPLEDATE: date,
    ...(shift ? { SHIFT: shift } : {})
  };

  try {
    let totals = await Record.aggregate([
      { $match: matchCondition },
      {
        $addFields: {
          AMOUNT: { $multiply: ["$QTY", "$RATE"] }
        }
      },
      {
        $group: {
          _id: { device: "$DEVICEID", date: "$SAMPLEDATE", milkType: "$MILKTYPE" },
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
            { $match: matchCondition },
            { $addFields: { AMOUNT: { $multiply: ["$QTY", "$RATE"] } } },
            {
              $group: {
                _id: { device: "$DEVICEID", date: "$SAMPLEDATE", milkType: "TOTAL" },
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

    // Ensure COW, BUF, TOTAL are present even if empty
    const milkTypes = ['COW', 'BUF', 'TOTAL'];
    milkTypes.forEach(type => {
      if (!totals.find(t => t._id.milkType === type)) {
        totals.push({
          _id: { device: deviceCode, date, milkType: type },
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

    // Sort and format averages
    totals.sort((a, b) => milkTypes.indexOf(a._id.milkType) - milkTypes.indexOf(b._id.milkType));
    totals = totals.map(item => ({
      ...item,
      averageFat: item.averageFat ? item.averageFat.toFixed(1) : 0,
      averageSNF: item.averageSNF ? item.averageSNF.toFixed(1) : 0,
      averageRate: item.averageRate ? item.averageRate.toFixed(2) : 0
    }));

    const records = await Record.find(matchCondition);

    if (totals.length === 0 && records.length === 0) {
      return res.status(404).json({ error: 'No records found for the given device code and date.' });
    }

    return res.json({ totals, records });
  } catch (err) {
    console.error('Error generating report:', err);
    res.status(500).json({ error: err.message || 'Internal server error', stack: err.stack });
  }
});

module.exports = router;
