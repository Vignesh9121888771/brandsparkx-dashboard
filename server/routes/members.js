const router = require('express').Router();
const { getAllMembers, createMember, createBulkMembers, updateMember, deleteMember } = require('../controllers/membersController');

router.get('/',         getAllMembers);
router.post('/',        createMember);
router.post('/bulk',    createBulkMembers);
router.put('/:id',      updateMember);
router.delete('/:id',   deleteMember);

module.exports = router;