'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/searchController');

router.get('/', authenticate, ctrl.search);
router.get('/search', authenticate, ctrl.search);


module.exports = router;
