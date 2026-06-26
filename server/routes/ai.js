const auth = require("../middleware/auth");
const router = require('express').Router();
const { getAISuggestion } = require('../controllers/aiController');

router.post('/suggest', auth, getAISuggestion);

module.exports = router;