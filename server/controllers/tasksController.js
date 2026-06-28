const db = require('../db');

// ── Helper: Calculate productivity score for a member ──────────
const calculateProductivity = async (member_id) => {
  try {
    const tasksResult = await db.query(
      `SELECT * FROM tasks WHERE assigned_to = $1`, [member_id]
    );
    const tasks = tasksResult.rows;
    if (!tasks.length) return 0;

    const total      = tasks.length;
    const completed  = tasks.filter(t => t.status === 'Completed').length;
    const onTime     = tasks.filter(t => t.completed_on_time === true).length;

    const completionScore = total > 0 ? (completed / total) * 40 : 0;
    const onTimeScore = completed > 0 ? (onTime / completed) * 20 : 0;

    const progressResult = await db.query(
      `SELECT AVG(progress) as avg_progress 
       FROM progress_updates 
       WHERE member_id=$1 AND status='approved'`, [member_id]
    );
    const avgProgress = parseFloat(progressResult.rows[0]?.avg_progress || 0);
    const progressScore = (avgProgress / 100) * 30;

    const qualityResult = await db.query(
      `SELECT AVG(quality_score) as avg_quality 
       FROM progress_updates 
       WHERE member_id=$1 AND status='approved' AND quality_score IS NOT NULL`, [member_id]
    );
    const avgQuality = parseFloat(qualityResult.rows[0]?.avg_quality || 3);
    const qualityScore = (avgQuality / 5) * 10;

    const total_score = Math.round(completionScore + onTimeScore + progressScore + qualityScore);
    return Math.min(100, Math.max(0, total_score));
  } catch (err) {
    console.error('Productivity calculation error:', err);
    return 0;
  }
};

const detectOvertime = (submittedAt) => {
  const date    = new Date(submittedAt);
  const hour    = date.getHours();
  const day     = date.getDay();
  const isWeekend   = day === 0 || day === 6;
  const isAfterHours = hour >= 18 || hour < 9;
  return isWeekend || isAfterHours;
};

// ── Helper: Calculate incentive points (NO OVERTIME POINTS) ────
const calculateIncentivePoints = (action, qualityScore, isOvertime, isOnTime, isEarly) => {
  let points = 0;
  if (action === 'approve') {
    points += 10;                         // Increased Base approval points for productive work
    if (qualityScore === 5) points += 20; // High quality matters most
    if (qualityScore === 4) points += 10;
    if (isOnTime)  points += 15;
    if (isEarly)   points += 25;
    // Overtime points removed as per user request
  }
  return points;
};

const getAllTasks = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT t.*, 
        m.name as assignee_name, m.role as assignee_role,
        m.productivity_score, m.incentive_points,
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

const submitProgressUpdate = async (req, res, next) => {
  try {
    const { progress, note, member_id } = req.body;
    const task_id = req.params.id;

    if (progress === undefined || progress === null)
      return res.status(400).json({ success: false, message: 'progress is required' });
    if (!note || note.trim() === '')
      return res.status(400).json({ success: false, message: 'note is required' });
    if (!member_id)
      return res.status(400).json({ success: false, message: 'member_id is required' });

    const task = await db.query('SELECT * FROM tasks WHERE id=$1', [task_id]);
    if (!task.rows[0]) return res.status(404).json({ success: false, message: 'Task not found' });

    const existing = await db.query(
      `SELECT id FROM progress_updates WHERE task_id=$1 AND status='pending'`, [task_id]
    );
    if (existing.rows.length > 0)
      return res.status(400).json({ success: false, message: 'Pending update already exists' });

    const result = await db.query(
      `INSERT INTO progress_updates (task_id, member_id, progress, note, status)
       VALUES ($1,$2,$3,$4,'pending') RETURNING *`,
      [task_id, member_id, progress, note.trim()]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const getPendingUpdates = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT pu.*,
        t.title as task_title, t.progress as current_progress,
        t.due_date, t.status as task_status,
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

const reviewProgressUpdate = async (req, res, next) => {
  try {
    const { action, manager_note, quality_score } = req.body;
    const update_id = req.params.update_id;

    if (!['approve', 'reject'].includes(action))
      return res.status(400).json({ success: false, message: 'action must be approve or reject' });
    if (action === 'approve' && (!quality_score || quality_score < 1 || quality_score > 5))
      return res.status(400).json({ success: false, message: 'quality_score (1-5) required' });

    const update = await db.query('SELECT * FROM progress_updates WHERE id=$1', [update_id]);
    if (!update.rows[0]) return res.status(404).json({ success: false, message: 'Update not found' });
    const u = update.rows[0];

    const newStatus  = action === 'approve' ? 'approved' : 'rejected';
    await db.query(
      `UPDATE progress_updates SET status=$1, manager_note=$2, reviewed_at=NOW(), quality_score=$3 WHERE id=$4`,
      [newStatus, manager_note || null, action === 'approve' ? quality_score : null, update_id]
    );

    if (action === 'approve') {
      const taskRes = await db.query('SELECT * FROM tasks WHERE id=$1', [u.task_id]);
      const t = taskRes.rows[0];
      const deadline = t.due_date ? new Date(t.due_date) : null;
      const now = new Date();
      const isOnTime = deadline ? now <= deadline : true;
      const isEarly  = deadline ? now < new Date(deadline.getTime() - 24*60*60*1000) : false;
      const isCompleted = u.progress >= 100;

      await db.query(
        `UPDATE tasks SET 
          progress=$1, progress_note=$2, progress_status='approved',
          status=$3, updated_at=NOW(),
          completed_on_time=$4, completed_at=$5
         WHERE id=$6`,
        [u.progress, u.note, isCompleted ? 'Completed' : 'In Progress', isCompleted ? isOnTime : null, isCompleted ? now : null, u.task_id]
      );

      const pointsEarned = calculateIncentivePoints('approve', quality_score, false, isOnTime, isEarly);
      await db.query(
        `UPDATE members SET incentive_points = COALESCE(incentive_points, 0) + $1 WHERE id=$2`,
        [pointsEarned, u.member_id]
      );

      const productivityScore = await calculateProductivity(u.member_id);
      await db.query(`UPDATE members SET productivity_score=$1 WHERE id=$2`, [productivityScore, u.member_id]);
    } else {
      await db.query(`UPDATE tasks SET progress_status='rejected', updated_at=NOW() WHERE id=$1`, [u.task_id]);
    }
    res.json({ success: true, message: 'Review completed' });
  } catch (err) { next(err); }
};

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

const getProductivitySummary = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT 
        m.id, m.name, m.role, m.region,
        m.productivity_score, m.incentive_points,
        COUNT(t.id) as total_tasks,
        COUNT(CASE WHEN t.status='Completed' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN t.completed_on_time=true THEN 1 END) as on_time_tasks,
        ROUND(AVG(pu.quality_score),1) as avg_quality
      FROM members m
      LEFT JOIN tasks t ON t.assigned_to = m.id
      LEFT JOIN progress_updates pu ON pu.member_id = m.id AND pu.status='approved'
      GROUP BY m.id, m.name, m.role, m.region, m.productivity_score, m.incentive_points
      ORDER BY m.productivity_score DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

module.exports = {
  getAllTasks, createTask, updateTask, deleteTask,
  submitProgressUpdate, getPendingUpdates, reviewProgressUpdate,
  getProgressHistory, getProductivitySummary
};
