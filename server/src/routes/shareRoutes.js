'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/shareController');

router.post('/', authenticate, ctrl.createShare);
router.get('/', authenticate, ctrl.listShares);
router.put('/:id/approve', authenticate, authorize('admin', 'sp', 'sho'), ctrl.approveShare);
router.put('/:id/reject', authenticate, authorize('admin', 'sp', 'sho'), ctrl.rejectShare);

router.post('/shares', authenticate, ctrl.createShare);
router.get('/shares', authenticate, ctrl.listShares);
router.put('/shares/:id/approve', authenticate, authorize('admin', 'sp', 'sho'), ctrl.approveShare);
router.put('/shares/:id/reject', authenticate, authorize('admin', 'sp', 'sho'), ctrl.rejectShare);


module.exports = router;
