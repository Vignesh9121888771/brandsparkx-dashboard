const router = require('express').Router();
const { getAllAllocations, createAllocation, updateAllocation, deleteAllocation, getCapacity } = require('../controllers/allocationsController');

router.get('/capacity', getCapacity);
router.get('/',         getAllAllocations);
router.post('/',        createAllocation);
router.put('/:id',      updateAllocation);
router.delete('/:id',   deleteAllocation);

module.exports = router;