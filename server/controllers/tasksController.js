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
    const { title, description, assigned_to, project_id, priority, due_date, estimated_hours, status } = req.body;
    const result = await db.query(
      `UPDATE tasks SET title=$1, description=$2, assigned_to=$3, project_id=$4,
       priority=$5, due_date=$6, estimated_hours=$7, status=$8 WHERE id=$9 RETURNING *`,
      [title, description, assigned_to, project_id, priority, due_date, estimated_hours, status, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const deleteTask = async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM tasks WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) { next(err); }
};

// Member submits progress update with note
const submitProgressUpdate = async (req, res, next) => {
  try {
    const { progress, note, member_id } = req.body;
    const task_id = req.params.id;

    if (progress === undefined || progress === null)
      return res.status(400).json({ success: false, message: 'progress is required' });
    if (!note || note.trim() === '')
      return res.status(400).json({ success: false, message: 'note is required ??? describe what you completed' });
    if (!member_id)
      return res.status(400).json({ success: false, message: 'member_id is required' });
    if (progress < 0 || progress > 100)
      return res.status(400).json({ success: false, message: 'Progress must be between 0 and 100' });

    // Check task exists
    const task = await db.query('SELECT * FROM tasks WHERE id=$1', [task_id]);
    if (!task.rows[0]) return res.status(404).json({ success: false, message: 'Task not found' });

    // Check no pending update already exists for this task
    const existing = await db.query(
      `SELECT id FROM progress_updates WHERE task_id=$1 AND status='pending'`,
      [task_id]
    );
    if (existing.rows.length > 0)
      return res.status(400).json({ success: false, message: 'You already have a pending update awaiting manager approval' });

    // Insert progress update request
    const result = await db.query(
      `INSERT INTO progress_updates (task_id, member_id, progress, note, status)
       VALUES ($1,$2,$3,$4,'pending') RETURNING *`,
      [task_id, member_id, progress, note.trim()]
    );

    res.status(201).json({ 
      success: true, 
      data: result.rows[0],
      message: 'Progress update submitted ??? awaiting manager approval'
    });
  } catch (err) { next(err); }
};

// Get all pending progress updates (manager only)
const getPendingUpdates = async (req, res, next) => {
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
      ORDER BY pu.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

// Manager approves or rejects progress update
const reviewProgressUpdate = async (req, res, next) => {
  try {
    const { action, manager_note } = req.body;
    const update_id = req.params.update_id;

    if (!['approve', 'reject'].includes(action))
      return res.status(400).json({ success: false, message: 'action must be approve or reject' });

    // Get the update
    const update = await db.query('SELECT * FROM progress_updates WHERE id=$1', [update_id]);
    if (!update.rows[0]) return res.status(404).json({ success: false, message: 'Update not found' });
    if (update.rows[0].status !== 'pending')
      return res.status(400).json({ success: false, message: 'This update has already been reviewed' });

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update the progress_updates record
    await db.query(
      `UPDATE progress_updates SET status=$1, manager_note=$2, reviewed_at=NOW() WHERE id=$3`,
      [newStatus, manager_note || null, update_id]
    );

    // If approved, update the actual task progress
    if (action === 'approve') {
      const newTaskStatus = update.rows[0].progress === 100 ? 'Completed' : 'In Progress';
      await db.query(
        `UPDATE tasks SET progress=$1, progress_note=$2, progress_status='approved',
         status=$3, updated_at=NOW() WHERE id=$4`,
        [update.rows[0].progress, update.rows[0].note, newTaskStatus, update.rows[0].task_id]
      );
    } else {
      // Rejected ??? just mark the task progress_status
      await db.query(
        `UPDATE tasks SET progress_status='rejected', updated_at=NOW() WHERE id=$1`,
        [update.rows[0].task_id]
      );
    }

    res.json({ 
      success: true, 
      message: action === 'approve' ? 'Progress approved and applied to task' : 'Progress update rejected'
    });
  } catch (err) { next(err); }
};

// Get progress history for a task
const getProgressHistory = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT pu.*, m.name as member_name
      FROM progress_updates pu
      JOIN members m ON pu.member_id = m.id
      WHERE pu.task_id=$1
      ORDER BY pu.created_at DESC
    `, [req.params.id]);
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

module.exports = { 
  getAllTasks, createTask, updateTask, deleteTask,
  submitProgressUpdate, getPendingUpdates, reviewProgressUpdate, getProgressHistory
};
// v2
