const router = require('express').Router();
const { getAISuggestion } = require('../controllers/aiController');

router.post('/suggest', getAISuggestion);

module.exports = router;