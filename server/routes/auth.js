const express = require('express');
const router  = express.Router();
const { register, registerManager, login, getMe, getUsers, toggleUser } = require('../controllers/authController');
const { authenticate, managerOnly } = require('../middleware/auth');

router.post('/register',                register);
router.post('/register-manager',        registerManager);
router.post('/login',                   login);
router.get('/me',                       authenticate, getMe);
router.get('/users',                    authenticate, managerOnly, getUsers);
router.put('/users/:id/toggle',         authenticate, managerOnly, toggleUser);

module.exports = router;