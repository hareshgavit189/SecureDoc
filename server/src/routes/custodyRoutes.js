'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/custodyController');

router.post('/', authenticate, ctrl.recordCustody);
router.get('/:itemId', authenticate, ctrl.getCustodyChain);

router.post('/custody', authenticate, ctrl.recordCustody);
router.get('/custody/:itemId', authenticate, ctrl.getCustodyChain);


module.exports = router;
