const router = require('express').Router();
const { getAllRequests, createRequest, updateRequestStatus } = require('../controllers/requestsController');

router.get('/', getAllRequests);
router.post('/', createRequest);
router.put('/:id', updateRequestStatus);

module.exports = router;