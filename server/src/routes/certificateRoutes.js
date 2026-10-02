'use strict';

const express = require('express');
const router = express.Router();
const certController = require('../controllers/certificateController');
const { authenticate } = require('../middleware/auth');

router.get('/documents/:id/certificate', authenticate, certController.generateCertificate);

module.exports = router;
