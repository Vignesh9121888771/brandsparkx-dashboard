const router = require('express').Router();
const auth = require('../middleware/auth');
const { getAllMembers, createMember, createBulkMembers, updateMember, deleteMember } = require('../controllers/membersController');

router.get('/',         auth, getAllMembers);
router.post('/',        auth, createMember);
router.post('/bulk',    auth, createBulkMembers);
router.put('/:id',      auth, updateMember);
router.delete('/:id',   auth, deleteMember);

module.exports = router;
