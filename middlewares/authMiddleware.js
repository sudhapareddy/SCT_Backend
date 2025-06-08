const jwt = require('jsonwebtoken');
const Dairy = require('../models/DairyModel');
const Device = require('../models/DeviceModel');

const JWT_SECRET = process.env.JWT_SECRET;

const verifyToken = async (req, res, next) => {
  const authHeader = req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer')) {
    return res.status(400).json({ error: 'Authorization header missing or malformed' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.type === 'dairy') {
      const dairy = await Dairy.findById(decoded.id);
      if (!dairy) return res.status(401).json({ error: 'Dairy not found' });

      req.user = {
        id: dairy._id,
        role: dairy.role,

        dairyCode: dairy.dairyCode,
        email: dairy.email,
        type: 'dairy'
      };


    } else if (decoded.type === 'device') {
      const device = await Device.findById(decoded.id);
      if (!device) return res.status(401).json({ error: 'Device not found' });

      req.user = {
        id: device._id,
        role: device.role,
        deviceid: device.deviceid,
        email: device.email,
        type: 'device'
      };

    } else {
      return res.status(403).json({ error: 'Invalid user type in token' });
    }

    next();
  } catch (err) {
    console.error('Token verification error:', err);
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

module.exports = verifyToken;
