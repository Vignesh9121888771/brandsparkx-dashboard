const router = require('express').Router();
const { getAllMembers, createMember, deleteMember } = require('../controllers/membersController');

router.get('/',       getAllMembers);
router.post('/',      createMember);
router.delete('/:id', deleteMember);

module.exports = router;