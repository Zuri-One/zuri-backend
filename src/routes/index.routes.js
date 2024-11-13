const router = require('express').Router();
const v1Routes = require('./v1/index');
const landingPage = require('../utils/landingPage');

// Landing page route
router.get('/', (req, res) => {
    res.send(landingPage);
});

// API version 1 routes
router.use('/v1', v1Routes);

module.exports = router;