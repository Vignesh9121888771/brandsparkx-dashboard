const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const {
  getAllTasks, createTask, updateTask, deleteTask,
  submitProgressUpdate, getPendingUpdates, reviewProgressUpdate, getProgressHistory
} = require('../controllers/tasksController');

// IMPORTANT: specific routes before param routes
router.get('/progress/pending',           auth, getPendingUpdates);
router.put('/progress/:update_id/review', auth, reviewProgressUpdate);

router.get('/',                           auth, getAllTasks);
router.post('/',                          auth, createTask);
router.put('/:id',                        auth, updateTask);
router.delete('/:id',                     auth, deleteTask);
router.post('/:id/progress',              auth, submitProgressUpdate);
router.get('/:id/progress/history',       auth, getProgressHistory);

module.exports = router;