const express = require('express');
const router = express.Router();
const Dairy = require('../../models/DairyModel');
router.get('/:dairyCode', async (req, res) => {
    try {
        const { dairyCode } = req.params;

        const dairy = await Dairy.findOne({ dairyCode: dairyCode.trim() });

        if (!dairy) {
            return res.status(404).json({ message: 'Dairy not found' });
        }

        res.status(200).json(dairy);
    } catch (err) {
        console.error('Error fetching dairy by code:', err);
        res.status(500).json({ error: 'Failed to fetch dairy' });
    }
});

module.exports = router;