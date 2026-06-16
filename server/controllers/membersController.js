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
    const { name, email, role, team_id, region, skills } = req.body;
    if (!name || !email || !role || !region)
      return res.status(400).json({ success: false, message: 'name, email, role, region required' });
    const result = await db.query(
      `INSERT INTO members (name, email, role, team_id, region, skills)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, email, role, team_id, region, skills || '']
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const createBulkMembers = async (req, res, next) => {
  try {
    const { members } = req.body;
    if (!members || !Array.isArray(members) || members.length === 0)
      return res.status(400).json({ success: false, message: 'members array required' });

    const results = [];
    for (const m of members) {
      if (!m.name || !m.email || !m.role || !m.region) continue;
      const r = await db.query(
        `INSERT INTO members (name, email, role, team_id, region, skills)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (email) DO NOTHING
         RETURNING *`,
        [m.name, m.email, m.role, m.team_id || null, m.region, m.skills || '']
      );
      if (r.rows[0]) results.push(r.rows[0]);
    }
    res.status(201).json({ success: true, data: results, count: results.length });
  } catch (err) { next(err); }
};

const updateMember = async (req, res, next) => {
  try {
    const { name, email, role, team_id, region, skills, capacity_percent } = req.body;
    const result = await db.query(
      `UPDATE members SET name=$1, email=$2, role=$3, team_id=$4, region=$5, skills=$6, capacity_percent=$7
       WHERE id=$8 RETURNING *`,
      [name, email, role, team_id, region, skills || '', capacity_percent || 100, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, message: "Member not found" });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const deleteMember = async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM members WHERE id=$1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Member not found" });
    res.json({ success: true, message: 'Member deleted' });
  } catch (err) { next(err); }
};

module.exports = { getAllMembers, createMember, createBulkMembers, updateMember, deleteMember };