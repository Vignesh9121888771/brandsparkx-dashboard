const db = require('../db');

const getAllRequests = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT r.*, m.name as member_name, m.role as member_role
      FROM requests r
      JOIN members m ON r.member_id = m.id
      ORDER BY r.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

const createRequest = async (req, res, next) => {
  try {
    const { member_id, type, title, description, start_date, end_date } = req.body;
    if (!member_id || !type || !title)
      return res.status(400).json({ success: false, message: 'member_id, type, title are required' });
    const result = await db.query(
      'INSERT INTO requests (member_id, type, title, description, start_date, end_date) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [member_id, type, title, description, start_date, end_date]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const updateRequestStatus = async (req, res, next) => {
  try {
    const { status, manager_note } = req.body;
    const result = await db.query(
      'UPDATE requests SET status=$1, manager_note=$2 WHERE id=$3 RETURNING *',
      [status, manager_note, req.params.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

module.exports = { getAllRequests, createRequest, updateRequestStatus };