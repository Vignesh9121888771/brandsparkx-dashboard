const router = require('express').Router();
const auth = require('../middleware/auth');
const { getAllAllocations, createAllocation, updateAllocation, deleteAllocation, getCapacity } = require('../controllers/allocationsController');

router.get('/capacity', auth, getCapacity);
router.get('/',         auth, getAllAllocations);
router.post('/',        auth, createAllocation);
router.put('/:id',      auth, updateAllocation);
router.delete('/:id',   auth, deleteAllocation);

module.exports = router;
