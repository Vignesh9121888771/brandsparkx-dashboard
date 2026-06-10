const db = require('../db');

const getAllTeams = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM teams ORDER BY id');
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

const createTeam = async (req, res, next) => {
  try {
    const { name, region } = req.body;
    if (!name || !region) return res.status(400).json({ success: false, message: 'name and region are required' });
    const result = await db.query(
      'INSERT INTO teams (name, region) VALUES ($1, $2) RETURNING *',
      [name, region]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const deleteTeam = async (req, res, next) => {
  try {
    await db.query('DELETE FROM teams WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Team deleted' });
  } catch (err) { next(err); }
};

module.exports = { getAllTeams, createTeam, deleteTeam };