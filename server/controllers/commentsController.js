const db = require('../db');

const getTaskComments = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT c.*, u.name as user_name, u.role as user_role
      FROM task_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.task_id = $1
      ORDER BY c.created_at ASC
    `, [req.params.task_id]);
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

const createTaskComment = async (req, res, next) => {
  try {
    const { content } = req.body;
    const { task_id } = req.params;
    if (!content) return res.status(400).json({ success: false, message: 'Comment content required' });

    const result = await db.query(
      'INSERT INTO task_comments (task_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
      [task_id, req.user.id, content]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

module.exports = { getTaskComments, createTaskComment };
