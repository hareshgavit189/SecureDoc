'use strict';

const express = require('express');
const router = express.Router();
const caseController = require('../controllers/caseController');
const { authenticate, authorize } = require('../middleware/auth');

const SP_ROLES = ['admin', 'sp', 'sho'];

router.get('/', authenticate, caseController.listCases);
router.post('/', authenticate, authorize(...SP_ROLES), caseController.createCase);
router.get('/:id', authenticate, caseController.getCase);
router.put('/:id', authenticate, authorize(...SP_ROLES), caseController.updateCase);
router.post('/:id/team', authenticate, authorize(...SP_ROLES), caseController.updateTeam);
router.get('/:id/documents', authenticate, caseController.getCaseDocuments);
router.get('/:id/timeline', authenticate, caseController.getCaseTimeline);

module.exports = router;
