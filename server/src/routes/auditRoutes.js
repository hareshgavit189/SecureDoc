'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/auditController');

router.get('/audit', authenticate, authorize('admin', 'auditor', 'sp', 'sho', 'io'), ctrl.getAuditLog);
router.get('/reports/compliance', authenticate, authorize('admin', 'auditor', 'sp', 'sho', 'io'), ctrl.complianceReport);


module.exports = router;
