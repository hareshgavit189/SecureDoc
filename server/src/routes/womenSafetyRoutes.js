'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/womenSafetyController');

// All endpoints require authentication; some require elevated roles
router.get('/deadlines', authenticate, ctrl.getDeadlines);
router.post('/transfers', authenticate, authorize('admin', 'sp', 'sho', 'io'), ctrl.zeroFirTransfer);
router.get('/ndso/check', authenticate, ctrl.ndsoCheck);

module.exports = router;
