const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const {
  getAllTasks, createTask, updateTask, deleteTask,
  submitProgressUpdate, getPendingUpdates, reviewProgressUpdate, getProgressHistory
} = require('../controllers/tasksController');

router.get('/',                              auth, getAllTasks);
router.post('/',                             auth, createTask);
router.put('/:id',                           auth, updateTask);
router.delete('/:id',                        auth, deleteTask);

// Progress routes
router.post('/:id/progress',                 auth, submitProgressUpdate);
router.get('/progress/pending',              auth, getPendingUpdates);
router.put('/progress/:update_id/review',    auth, reviewProgressUpdate);
router.get('/:id/progress/history',          auth, getProgressHistory);

module.exports = router;