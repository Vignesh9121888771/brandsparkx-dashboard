const auth = require("../middleware/auth");
const router = require('express').Router();
const { getAllRequests, createRequest, updateRequestStatus } = require('../controllers/requestsController');

router.get('/', auth, getAllRequests);
router.post('/', auth, createRequest);
router.put('/:id', auth, updateRequestStatus);

module.exports = router;