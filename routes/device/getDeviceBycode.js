const express = require('express');
const router = express.Router();
const Device = require('../../models/DeviceModel');



// GET /api/device/by-code/:dairyCode
router.get('/:dairyCode', async (req, res) => {
    const { dairyCode } = req.params;

    try {
        const device = await Device.find({ dairyCode: dairyCode.toUpperCase() });
        if (!device) {
            return res.status(404).json({ error: 'Device not found for given dairyCode' });
        }
        res.status(200).json(device);
    } catch (err) {
        console.error('Error fetching by dairyCode:', err);
        res.status(500).json({ error: 'Server error while fetching device by dairyCode' });
    }
});



module.exports = router;
