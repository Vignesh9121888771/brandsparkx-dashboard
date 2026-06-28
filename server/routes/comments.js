const router = require('express').Router();
const auth = require('../middleware/auth');
const { getTaskComments, createTaskComment } = require('../controllers/commentsController');

router.get('/:task_id', auth, getTaskComments);
router.post('/:task_id', auth, createTaskComment);

module.exports = router;
