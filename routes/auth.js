const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Dairy = require('../models/DairyModel');
const Device = require('../models/DeviceModel');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

// In-memory refresh token store (resets if server restarts)
let refreshTokens = [];

/**
 * Generate Access & Refresh Tokens
 */
const generateTokens = (payload) => {
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
  refreshTokens.push(refreshToken);
  return { accessToken, refreshToken };
};

/**
 * Login Route
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    let user = await Dairy.findOne({ email: new RegExp(`^${email}$`, 'i') });
    let type = 'dairy';

    if (!user) {
      user = await Device.findOne({ email: new RegExp(`^${email}$`, 'i') });
      type = 'device';
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const payload = { id: user._id, role: user.role, type };
    const { accessToken, refreshToken } = generateTokens(payload);

    res.status(200).json({
      message: `${type} login successful`,
      accessToken,
      refreshToken,
      role: user.role,
      ...(type === 'dairy'
        ? { dairyName: user.dairyName, dairyCode: user.dairyCode }
        : { deviceName: user.deviceid, deviceid: user.deviceid, dairyCode: user.dairyCode }),
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

/**
 * Refresh Access Token
 */
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required' });
  }

  if (!refreshTokens.includes(refreshToken)) {
    return res.status(403).json({ error: 'Invalid refresh token' });
  }

  jwt.verify(refreshToken, REFRESH_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired refresh token' });
    }

    const newAccessToken = jwt.sign(
      { id: user.id, role: user.role, type: user.type },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ accessToken: newAccessToken });
  });
});

/**
 * Logout Route
 */
router.post('/logout', (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token required' });
  }

  refreshTokens = refreshTokens.filter((token) => token !== refreshToken);

  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
