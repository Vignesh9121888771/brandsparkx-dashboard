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
    const { title, status, priority, assigned_to, due_date, actual_hours, progress } = req.body;
    const result = await db.query(
      `UPDATE tasks SET title=$1, status=$2, priority=$3, assigned_to=$4, due_date=$5, actual_hours=$6, progress=$7, updated_at=now()
       WHERE id=$8 RETURNING *`,
      [title, status, priority, assigned_to, due_date, actual_hours, progress || 0, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, message: "Task not found" });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const deleteTask = async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM tasks WHERE id=$1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Task not found" });
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) { next(err); }
};

const getPendingProgressUpdates = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT pu.*,
             t.title as task_title, t.progress as current_progress,
             m.name as member_name, m.role as member_role,
             p.name as project_name
      FROM progress_updates pu
      JOIN tasks t ON pu.task_id = t.id
      JOIN members m ON pu.member_id = m.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE pu.status = 'pending'
      ORDER BY pu.created_at ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

const reviewProgressUpdate = async (req, res, next) => {
  try {
    const { action, manager_note } = req.body;
    const { update_id } = req.params;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    const updateStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update the progress_update row
    const puResult = await db.query(
      `UPDATE progress_updates SET status=$1, manager_note=$2, reviewed_at=now()
       WHERE id=$3 RETURNING *`,
      [updateStatus, manager_note, update_id]
    );

    if (!puResult.rows[0]) {
      return res.status(404).json({ success: false, message: 'Progress update not found' });
    }

    const pu = puResult.rows[0];

    // If approved, update the task itself
    if (action === 'approve') {
      await db.query(
        `UPDATE tasks SET progress=$1, progress_note=$2, progress_status='approved', updated_at=now()
         WHERE id=$3`,
        [pu.progress, pu.note, pu.task_id]
      );
    } else {
      // If rejected, mark task as pending_approval but keep old progress
      await db.query(
        `UPDATE tasks SET progress_status='rejected', updated_at=now()
         WHERE id=$1`,
        [pu.task_id]
      );
    }

    res.json({ success: true, message: `Update ${action}ed successfully` });
  } catch (err) { next(err); }
};

module.exports = {
  getAllTasks, createTask, updateTask, deleteTask,
  getPendingProgressUpdates, reviewProgressUpdate
};
