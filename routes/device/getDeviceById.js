const express = require('express');
const router = express.Router();
const Device = require('../../models/DeviceModel');

// GET /api/device/by-id/:deviceid
router.get('/:deviceid', async (req, res) => {
    const { deviceid } = req.params;

    try {
        const device = await Device.findOne({ deviceid });
        if (!device) {
            return res.status(404).json({ error: 'Device not found for given device ID' });
        }
        res.status(200).json(device);
    } catch (err) {
        console.error('Error fetching by deviceid:', err);
        res.status(500).json({ error: 'Server error while fetching device by ID' });
    }
});

module.exports = router;
