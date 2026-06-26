const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'brandsparkx_secret_fallback_2026';

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('JWT Auth Error:', err.message);
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

const managerOnly = (req, res, next) => {
  if (req.user?.role !== 'manager')
    return res.status(403).json({ success: false, message: 'Manager access required' });
  next();
};

module.exports = authenticate;
module.exports.authenticate = authenticate;
module.exports.managerOnly = managerOnly;
