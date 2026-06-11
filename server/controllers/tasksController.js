const db = require('../db');

const getAllTasks = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT t.*, 
        m.name as assignee_name, m.role as assignee_role,
        p.name as project_name
      FROM tasks t
      LEFT JOIN members m ON t.assigned_to = m.id
      LEFT JOIN projects p ON t.project_id = p.id
      ORDER BY t.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

const createTask = async (req, res, next) => {
  try {
    const { title, description, assigned_to, project_id, priority, due_date, estimated_hours } = req.body;
    if (!title)
      return res.status(400).json({ success: false, message: 'title is required' });
    const result = await db.query(
      `INSERT INTO tasks (title, description, assigned_to, project_id, priority, due_date, estimated_hours)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [title, description, assigned_to, project_id, priority || 'Medium', due_date, estimated_hours || 0]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const updateTask = async (req, res, next) => {
  try {
    const { title, status, priority, assigned_to, due_date, actual_hours } = req.body;
    const result = await db.query(
      `UPDATE tasks SET title=$1, status=$2, priority=$3, assigned_to=$4, due_date=$5, actual_hours=$6
       WHERE id=$7 RETURNING *`,
      [title, status, priority, assigned_to, due_date, actual_hours, req.params.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const deleteTask = async (req, res, next) => {
  try {
    await db.query('DELETE FROM tasks WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) { next(err); }
};

module.exports = { getAllTasks, createTask, updateTask, deleteTask };