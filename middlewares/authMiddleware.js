const jwt = require('jsonwebtoken');
const Dairy = require('../models/DairyModel');
const Device = require('../models/DeviceModel');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware to verify Access Token and attach user info to req.user
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header missing or malformed' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    let user = null;

    if (decoded.type === 'dairy') {
      user = await Dairy.findById(decoded.id);
      if (!user) return res.status(401).json({ error: 'Dairy not found' });

      req.user = {
        id: user._id,
        role: user.role,
        dairyCode: user.dairyCode,
        email: user.email,
        type: 'dairy',
      };
    }
    else if (decoded.type === 'device') {
      user = await Device.findById(decoded.id);
      if (!user) return res.status(401).json({ error: 'Device not found' });

      req.user = {
        id: user._id,
        role: user.role,
        deviceid: user.deviceid,
        email: user.email,
        dairyCode: user.dairyCode,
        type: 'device',
      };
    }
    else {
      return res.status(403).json({ error: 'Invalid user type in token' });
    }

    next();

  } catch (err) {
    console.error('Token verification error:', err);

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Access token expired', code: 'TOKEN_EXPIRED' });
    }

    return res.status(403).json({ error: 'Invalid or malformed token' });
  }
};

module.exports = verifyToken;
