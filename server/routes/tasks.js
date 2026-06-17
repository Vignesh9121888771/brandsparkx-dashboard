const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/tasksController');

console.log('CTRL KEYS:', Object.keys(ctrl));

router.get('/', auth, ctrl.getAllTasks);
router.post('/', auth, ctrl.createTask);
router.put('/:id', auth, ctrl.updateTask);
router.delete('/:id', auth, ctrl.deleteTask);

module.exports = router;