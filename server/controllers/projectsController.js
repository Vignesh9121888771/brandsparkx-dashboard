const db = require('../db');

const getAllProjects = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM projects ORDER BY id');
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

const createProject = async (req, res, next) => {
  try {
    const { name, client, region, status, deadline } = req.body;
    if (!name || !client || !region)
      return res.status(400).json({ success: false, message: 'name, client, region are required' });
    const result = await db.query(
      'INSERT INTO projects (name, client, region, status, deadline) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, client, region, status || 'Planning', deadline]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const updateProject = async (req, res, next) => {
  try {
    const { name, client, region, status, deadline } = req.body;
    const result = await db.query(
      'UPDATE projects SET name=$1, client=$2, region=$3, status=$4, deadline=$5 WHERE id=$6 RETURNING *',
      [name, client, region, status, deadline, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, message: "Project not found" });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const deleteProject = async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Project not found" });
    res.json({ success: true, message: 'Project deleted' });
  } catch (err) { next(err); }
};

module.exports = { getAllProjects, createProject, updateProject, deleteProject };