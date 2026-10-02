'use strict';

const express = require('express');
const router = express.Router();
const sigController = require('../controllers/signatureController');
const { authenticate } = require('../middleware/auth');

router.post('/documents/:id/sign', authenticate, sigController.signDocument);
router.get('/documents/:id/signatures', authenticate, sigController.getSignatures);
router.post('/esign/initiate', authenticate, sigController.initiateESign);
router.post('/esign/callback', sigController.esignCallback); // called by mock ESP

module.exports = router;
