const router = require('express').Router();
const { getAllTasks, createTask, updateTask, deleteTask } = require('../controllers/tasksController');

router.get('/', getAllTasks);
router.post('/', createTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

module.exports = router;