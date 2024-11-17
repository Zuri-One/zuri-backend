// src/routes/index.routes.js
const express = require('express');
const router = express.Router();
const v1Routes = require('./v1');
const landingPage = require('../utils/landingPage');

// Landing page route
router.get('/', (req, res) => {
    res.send(landingPage);
});

// API version 1 routes
router.use('/v1', v1Routes);

module.exports = router;