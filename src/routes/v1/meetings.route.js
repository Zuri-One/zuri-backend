const express = require('express');
const router = express.Router();
const meetingsController = require('../../controllers/meetings.controller');
const { authenticate } = require('../../middleware/auth.middleware');

router.use(authenticate);

router.get('/', meetingsController.getVideoMeetings);
router.get('/:id', meetingsController.getMeetingById);

module.exports = router;