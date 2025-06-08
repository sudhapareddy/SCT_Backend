const express = require('express');
const router = express.Router();
const Dairy = require('../../models/DairyModel');

router.get('/', async (req, res) => {
    try {


        const dairy = await Dairy.find().sort({ createdAt: -1 });

        res.status(200).json(dairy);
    } catch (err) {
        console.error('Error fetching devices:', err);
        res.status(500).json({ error: 'Failed to fetch devices' });
    }
});

module.exports = router;
