'use strict';

const express = require('express');
const router = express.Router();
const integrityController = require('../controllers/integrityController');
const { authenticate, authorize } = require('../middleware/auth');

// Authenticated routes
router.get('/verify-chain', authenticate, integrityController.verifyChain);
router.get('/proof/:docId', authenticate, integrityController.getMerkleProof);
router.get('/batches', authenticate, integrityController.listBatches);
router.post('/run-batch', authenticate, authorize('admin', 'auditor'), integrityController.runBatchManual);

// Public verify page (no auth)
router.get('/verify/:hash', integrityController.publicVerify);


module.exports = router;
