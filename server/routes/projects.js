const router = require('express').Router();
const { getAllProjects, createProject, updateProject, deleteProject } = require('../controllers/projectsController');

router.get('/',        getAllProjects);
router.post('/',       createProject);
router.put('/:id',     updateProject);
router.delete('/:id',  deleteProject);

module.exports = router;