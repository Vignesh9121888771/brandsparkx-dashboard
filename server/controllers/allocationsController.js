const db = require('../db');

const getAllAllocations = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT a.*, m.name as member_name, p.name as project_name
      FROM allocations a
      JOIN members m ON a.member_id = m.id
      JOIN projects p ON a.project_id = p.id
      ORDER BY a.id
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

const createAllocation = async (req, res, next) => {
  try {
    const { member_id, project_id, allocation_percent, start_date, end_date } = req.body;
    if (!member_id || !project_id || !allocation_percent || !start_date || !end_date)
      return res.status(400).json({ success: false, message: 'All fields are required' });
    const result = await db.query(
      'INSERT INTO allocations (member_id, project_id, allocation_percent, start_date, end_date) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [member_id, project_id, allocation_percent, start_date, end_date]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const updateAllocation = async (req, res, next) => {
  try {
    const { allocation_percent, start_date, end_date } = req.body;
    const result = await db.query(
      'UPDATE allocations SET allocation_percent=$1, start_date=$2, end_date=$3 WHERE id=$4 RETURNING *',
      [allocation_percent, start_date, end_date, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, message: "Allocation not found" });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const deleteAllocation = async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM allocations WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Allocation not found" });
    res.json({ success: true, message: 'Allocation deleted' });
  } catch (err) { next(err); }
};

const getCapacity = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT 
        m.id, m.name, m.role, m.region,
        COALESCE(SUM(a.allocation_percent), 0) AS allocated_percent,
        100 - COALESCE(SUM(a.allocation_percent), 0) AS available_percent
      FROM members m
      LEFT JOIN allocations a ON m.id = a.member_id
      GROUP BY m.id, m.name, m.role, m.region
      ORDER BY m.id
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

module.exports = { getAllAllocations, createAllocation, updateAllocation, deleteAllocation, getCapacity };