const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

const managerOnly = (req, res, next) => {
  if (req.user?.role !== 'manager')
    return res.status(403).json({ success: false, message: 'Manager access required' });
  next();
};

module.exports = { authenticate, managerOnly };