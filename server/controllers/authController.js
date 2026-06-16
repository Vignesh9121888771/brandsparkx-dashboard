const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const db       = require('../db');

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'name, email, password required' });

    // Check if email exists in users already
    const exists = await db.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rows.length > 0)
      return res.status(400).json({ success: false, message: 'Email already registered' });

    // Check if email is pre-approved (exists in members table)
    const member = await db.query('SELECT * FROM members WHERE email=$1', [email]);
    if (member.rows.length === 0)
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Your email is not registered in the system. Contact your manager.' 
      });

    const memberData   = member.rows[0];
    const password_hash = await bcrypt.hash(password, 12);

    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, role, member_id)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, name, email, role, member_id`,
      [name, email, password_hash, 'employee', memberData.id]
    );

    const user  = result.rows[0];
   const token = jwt.sign(
  { id: user.id, name: user.name, email: user.email, role: user.role, member_id: user.member_id, region: user.region },
  process.env.JWT_SECRET,
  { expiresIn: '7d' });
    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity, details) VALUES ($1,$2,$3,$4)',
      [user.id, 'REGISTER', 'users', `Employee registered: ${user.email}`]
    );

    res.status(201).json({ success: true, token, user });
  } catch (err) { next(err); }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'email and password required' });

    const result = await db.query(
      'SELECT * FROM users WHERE email=$1 AND is_active=true', [email]
    );
    if (result.rows.length === 0)
      return res.status(401).json({ success: false, message: 'Invalid email or password' });

    const user  = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ success: false, message: 'Invalid email or password' });

    // Update last login
    await db.query('UPDATE users SET last_login=NOW() WHERE id=$1', [user.id]);

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, member_id: user.member_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Audit log
    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity, details) VALUES ($1,$2,$3,$4)',
      [user.id, 'LOGIN', 'users', `User logged in: ${user.email}`]
    );

    res.json({
      success: true, token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, member_id: user.member_id }
    });
  } catch (err) { next(err); }
};

const getMe = async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT id, name, email, role, member_id, created_at, last_login FROM users WHERE id=$1',
      [req.user.id]
    );
    res.json({ success: true, user: result.rows[0] });
  } catch (err) { next(err); }
};

const getUsers = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.is_active, u.created_at, u.last_login,
              m.name as member_name, m.role as member_role
       FROM users u
       LEFT JOIN members m ON u.member_id = m.id
       ORDER BY u.created_at DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

const toggleUser = async (req, res, next) => {
  try {
    const result = await db.query(
      'UPDATE users SET is_active = NOT is_active WHERE id=$1 RETURNING *',
      [req.params.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const registerManager = async (req, res, next) => {
  try {
    const { name, email, password, manager_code, region } = req.body;
    if (manager_code !== 'BSX_MANAGER_2026')
      return res.status(403).json({ success: false, message: 'Invalid manager access code' });
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'All fields required' });
    const exists = await db.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rows.length > 0)
      return res.status(400).json({ success: false, message: 'Email already registered' });
    const password_hash = await bcrypt.hash(password, 12);
    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, role, region)
       VALUES ($1,$2,$3,'manager',$4) RETURNING id, name, email, role, region`,
      [name, email, password_hash, region || 'All']
    );
    const user  = result.rows[0];
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, region: user.region },
      process.env.JWT_SECRET, { expiresIn: '7d' }
    );
    res.status(201).json({ success: true, token, user });
  } catch (err) { next(err); }
};

module.exports = { register, registerManager, login, getMe, getUsers, toggleUser };
