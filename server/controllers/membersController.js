const db = require('../db');

const getAllMembers = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT m.*, t.name as team_name 
      FROM members m 
      LEFT JOIN teams t ON m.team_id = t.id 
      ORDER BY m.id
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

const createMember = async (req, res, next) => {
  try {
    const { name, email, role, team_id, region } = req.body;
    if (!name || !email || !role || !region)
      return res.status(400).json({ success: false, message: 'name, email, role, region are required' });
    const result = await db.query(
      'INSERT INTO members (name, email, role, team_id, region) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, email, role, team_id, region]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const deleteMember = async (req, res, next) => {
  try {
    await db.query('DELETE FROM members WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Member deleted' });
  } catch (err) { next(err); }
};

module.exports = { getAllMembers, createMember, deleteMember };