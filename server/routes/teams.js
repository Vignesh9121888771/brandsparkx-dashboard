const router = require('express').Router();
const { getAllTeams, createTeam, deleteTeam } = require('../controllers/teamsController');

router.get('/',    getAllTeams);
router.post('/',   createTeam);
router.delete('/:id', deleteTeam);

module.exports = router;