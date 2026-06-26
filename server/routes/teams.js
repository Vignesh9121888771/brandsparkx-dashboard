const auth = require("../middleware/auth");
const router = require('express').Router();
const { getAllTeams, createTeam, deleteTeam } = require('../controllers/teamsController');

router.get('/', auth, getAllTeams);
router.post('/', auth, createTeam);
router.delete('/:id', auth, deleteTeam);

module.exports = router;