const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/tasksController');

router.get('/productivity/summary', auth, ctrl.getProductivitySummary);
router.get('/progress/pending', auth, ctrl.getPendingUpdates);
router.put('/progress/:update_id/review', auth, ctrl.reviewProgressUpdate);
router.get('/', auth, ctrl.getAllTasks);
router.post('/', auth, ctrl.createTask);
router.put('/:id', auth, ctrl.updateTask);
router.delete('/:id', auth, ctrl.deleteTask);
router.post('/:id/progress', auth, ctrl.submitProgressUpdate);
router.get('/:id/progress/history', auth, ctrl.getProgressHistory);

module.exports = router;