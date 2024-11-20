// backend/routes/video.routes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const { createWherebyRoom } = require('../../utils/video/whereby.util');

router.post('/create-room', authenticate, async (req, res) => {
  try {
    const { endDate, appointmentId } = req.body;
    
    const room = await createWherebyRoom({
      endDate,
      roomNamePattern: `/consultation-${appointmentId}`,
      isLocked: true
    });

    res.json(room);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create video room' });
  }
});

module.exports = router;