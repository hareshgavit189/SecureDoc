'use strict';

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/register', authenticate, authorize('admin'), authController.register);
router.post('/login', authController.login);
router.post('/2fa/setup', authenticate, authController.setup2FA);
router.post('/2fa/verify', authenticate, authController.verify2FA);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);
router.get('/users', authenticate, authorize('admin'), authController.listUsers);
router.put('/users/:id', authenticate, authorize('admin'), authController.updateUser);


module.exports = router;
