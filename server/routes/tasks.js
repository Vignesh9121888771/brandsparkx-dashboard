const router = require('express').Router();
const {
  getAllTasks, createTask, updateTask, deleteTask,
  getPendingProgressUpdates, reviewProgressUpdate
} = require('../controllers/tasksController');

router.get('/', getAllTasks);
router.post('/', createTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

// Progress updates
router.get('/progress/pending', getPendingProgressUpdates);
router.put('/progress/:update_id/review', reviewProgressUpdate);

module.exports = router;
