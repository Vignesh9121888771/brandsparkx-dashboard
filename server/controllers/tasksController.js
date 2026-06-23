const db = require('../db');

// ── Helper: Calculate productivity score for a member ──────────
const calculateProductivity = async (member_id) => {
  try {
    // Get all tasks assigned to member
    const tasksResult = await db.query(
      `SELECT * FROM tasks WHERE assigned_to = $1`, [member_id]
    );
    const tasks = tasksResult.rows;
    if (!tasks.length) return 0;

    const total      = tasks.length;
    const completed  = tasks.filter(t => t.status === 'Completed').length;
    const onTime     = tasks.filter(t => t.completed_on_time === true).length;

    // Completed task ratio (40%)
    const completionScore = total > 0 ? (completed / total) * 40 : 0;

    // On-time ratio (20%)
    const onTimeScore = completed > 0 ? (onTime / completed) * 20 : 0;

    // Avg approved progress (30%)
    const progressResult = await db.query(
      `SELECT AVG(progress) as avg_progress 
       FROM progress_updates 
       WHERE member_id=$1 AND status='approved'`, [member_id]
    );
    const avgProgress = parseFloat(progressResult.rows[0]?.avg_progress || 0);
    const progressScore = (avgProgress / 100) * 30;

    // Avg quality score from manager (10%)
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

// ── Helper: Detect overtime from submission timestamp ───────────
const detectOvertime = (submittedAt) => {
  const date    = new Date(submittedAt);
  const hour    = date.getHours();
  const day     = date.getDay(); // 0=Sun, 6=Sat
  const isWeekend   = day === 0 || day === 6;
  const isAfterHours = hour >= 18 || hour < 9;
  return isWeekend || isAfterHours;
};

// ── Helper: Calculate incentive points ─────────────────────────
const calculateIncentivePoints = (action, qualityScore, isOvertime, isOnTime, isEarly) => {
  let points = 0;
  if (action === 'approve') {
    points += 5;                          // Base approval points
    if (qualityScore === 5) points += 15; // Perfect quality
    if (qualityScore === 4) points += 10; // Great quality
    if (qualityScore === 3) points += 5;  // Good quality
    if (isOnTime)  points += 10;          // Completed on time
    if (isEarly)   points += 20;          // Completed early
    if (isOvertime) points += 10;         // Overtime work
  }
  return points;
};

// ── GET all tasks ───────────────────────────────────────────────
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

// ── CREATE task ─────────────────────────────────────────────────
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

// ── UPDATE task ─────────────────────────────────────────────────
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

// ── DELETE task ─────────────────────────────────────────────────
const deleteTask = async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM tasks WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) { next(err); }
};

// ── SUBMIT progress update (employee) ──────────────────────────
const submitProgressUpdate = async (req, res, next) => {
  try {
    const { progress, note, member_id } = req.body;
    const task_id = req.params.id;

    if (progress === undefined || progress === null)
      return res.status(400).json({ success: false, message: 'progress is required' });
    if (!note || note.trim() === '')
      return res.status(400).json({ success: false, message: 'note is required - describe what you completed' });
    if (!member_id)
      return res.status(400).json({ success: false, message: 'member_id is required' });
    if (progress < 0 || progress > 100)
      return res.status(400).json({ success: false, message: 'Progress must be between 0 and 100' });

    // Check task exists
    const task = await db.query('SELECT * FROM tasks WHERE id=$1', [task_id]);
    if (!task.rows[0]) return res.status(404).json({ success: false, message: 'Task not found' });

    // Check no pending update already exists
    const existing = await db.query(
      `SELECT id FROM progress_updates WHERE task_id=$1 AND status='pending'`, [task_id]
    );
    if (existing.rows.length > 0)
      return res.status(400).json({ success: false, message: 'You already have a pending update awaiting manager approval' });

    // Detect overtime
    const isOvertime = detectOvertime(new Date());

    // Insert progress update
    const result = await db.query(
      `INSERT INTO progress_updates (task_id, member_id, progress, note, status)
       VALUES ($1,$2,$3,$4,'pending') RETURNING *`,
      [task_id, member_id, progress, note.trim()]
    );

    res.status(201).json({
      success: true,
      data: { ...result.rows[0], is_overtime: isOvertime },
      message: isOvertime
        ? 'Progress submitted! Overtime detected - bonus points will be awarded on approval.'
        : 'Progress update submitted - awaiting manager approval'
    });
  } catch (err) { next(err); }
};

// ── GET pending updates (manager) ──────────────────────────────
const getPendingUpdates = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT pu.*,
        t.title as task_title, t.progress as current_progress,
        t.due_date, t.status as task_status,
        m.name as member_name, m.role as member_role,
        m.productivity_score, m.incentive_points,
        p.name as project_name
      FROM progress_updates pu
      JOIN tasks t ON pu.task_id = t.id
      JOIN members m ON pu.member_id = m.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE pu.status = 'pending'
      ORDER BY pu.created_at DESC
    `);

    // Add overtime flag to each update
    const updatesWithOvertime = result.rows.map(u => ({
      ...u,
      is_overtime: detectOvertime(u.created_at)
    }));

    res.json({ success: true, data: updatesWithOvertime });
  } catch (err) { next(err); }
};

// ── REVIEW progress update (manager approves/rejects) ──────────
const reviewProgressUpdate = async (req, res, next) => {
  try {
    const { action, manager_note, quality_score } = req.body;
    const update_id = req.params.update_id;

    if (!['approve', 'reject'].includes(action))
      return res.status(400).json({ success: false, message: 'action must be approve or reject' });
    if (action === 'approve' && (!quality_score || quality_score < 1 || quality_score > 5))
      return res.status(400).json({ success: false, message: 'quality_score (1-5) is required when approving' });

    // Get the update
    const update = await db.query('SELECT * FROM progress_updates WHERE id=$1', [update_id]);
    if (!update.rows[0]) return res.status(404).json({ success: false, message: 'Update not found' });
    if (update.rows[0].status !== 'pending')
      return res.status(400).json({ success: false, message: 'This update has already been reviewed' });

    const u          = update.rows[0];
    const newStatus  = action === 'approve' ? 'approved' : 'rejected';
    const isOvertime = detectOvertime(u.created_at);

    // Update progress_updates with quality score
    await db.query(
      `UPDATE progress_updates 
       SET status=$1, manager_note=$2, reviewed_at=NOW(), quality_score=$3 
       WHERE id=$4`,
      [newStatus, manager_note || null, action === 'approve' ? quality_score : null, update_id]
    );

    if (action === 'approve') {
      // Check task deadline for on-time / early detection
      const task = await db.query('SELECT * FROM tasks WHERE id=$1', [u.task_id]);
      const t = task.rows[0];
      const now = new Date();
      const deadline = t.due_date ? new Date(t.due_date) : null;
      const isOnTime = deadline ? now <= deadline : true;
      const isEarly  = deadline ? now < new Date(deadline.getTime() - 24*60*60*1000) : false;
      const isCompleted = u.progress >= 100;

      // Update task progress
      await db.query(
        `UPDATE tasks SET 
          progress=$1, progress_note=$2, progress_status='approved',
          status=$3, updated_at=NOW(),
          completed_on_time=$4,
          completed_at=$5
         WHERE id=$6`,
        [
          u.progress,
          u.note,
          isCompleted ? 'Completed' : 'In Progress',
          isCompleted ? isOnTime : null,
          isCompleted ? now : null,
          u.task_id
        ]
      );

      // Calculate incentive points earned
      const pointsEarned = calculateIncentivePoints(
        'approve', quality_score, isOvertime, isOnTime, isEarly
      );

      // Update member incentive points
      if (pointsEarned > 0) {
        await db.query(
          `UPDATE members SET incentive_points = COALESCE(incentive_points, 0) + $1 WHERE id=$2`,
          [pointsEarned, u.member_id]
        );
      }

      // Recalculate and update productivity score
      const productivityScore = await calculateProductivity(u.member_id);
      await db.query(
        `UPDATE members SET productivity_score=$1 WHERE id=$2`,
        [productivityScore, u.member_id]
      );

      res.json({
        success: true,
        message: 'Progress approved and applied to task',
        data: {
          productivity_score: productivityScore,
          incentive_points_earned: pointsEarned,
          is_overtime: isOvertime,
          completed_on_time: isOnTime
        }
      });
    } else {
      // Rejected
      await db.query(
        `UPDATE tasks SET progress_status='rejected', updated_at=NOW() WHERE id=$1`,
        [u.task_id]
      );
      res.json({ success: true, message: 'Progress update rejected' });
    }
  } catch (err) { next(err); }
};

// ── GET progress history for a task ────────────────────────────
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

// ── GET productivity summary for all members ────────────────────
const getProductivitySummary = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT 
        m.id, m.name, m.role, m.region,
        m.productivity_score, m.incentive_points,
        COUNT(t.id) as total_tasks,
        COUNT(CASE WHEN t.status='Completed' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN t.completed_on_time=true THEN 1 END) as on_time_tasks,
        ROUND(AVG(pu.quality_score),1) as avg_quality,
        COUNT(CASE WHEN 
          EXTRACT(HOUR FROM pu.created_at) >= 18 OR 
          EXTRACT(HOUR FROM pu.created_at) < 9 OR
          EXTRACT(DOW FROM pu.created_at) IN (0,6)
        THEN 1 END) as overtime_submissions
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