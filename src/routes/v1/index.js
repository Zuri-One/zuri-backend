// src/routes/v1/index.js
const express = require('express');
const router = express.Router();

// Import routes
const authRoutes = require('./auth.route');
const doctorRoutes = require('./doctor.route');
const patientRoutes = require('./patient.route');
const appointmentRoutes = require('./appointment.route');
const meetingRoutes = require('./meetings.route');

// Mount routes
router.use('/auth', authRoutes);
router.use('/doctor', doctorRoutes);
router.use('/patient', patientRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/meetings', meetingRoutes);
// Health check route
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

module.exports = router;