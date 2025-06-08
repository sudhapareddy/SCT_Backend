const express = require('express');
const router = express.Router();
const Device = require('../../models/DeviceModel');

// GET /api/device/all
router.get('/', async (req, res) => {
    try {
        const device = await Device.find().sort({ createdAt: -1 });
        res.status(200).json(device);
    } catch (err) {
        console.error('Error fetching dairies:', err);
        res.status(500).json({ error: 'Failed to fetch dairies' });
    }
});

module.exports = router;
