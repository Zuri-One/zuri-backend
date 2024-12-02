// src/routes/v1/index.js
const express = require('express');
const router = express.Router();

// Import routes
const authRoutes = require('./auth.route');
const doctorRoutes = require('./doctor.route');
const patientRoutes = require('./patient.route');
const appointmentRoutes = require('./appointment.route');
const meetingRoutes = require('./meetings.route');
const userRoutes = (require('./users.route'))
const prescriptionRoutes = (require('./medication.route'))
const recordRoutes = (require('./medicalrecord.route'))
const labRoutes = (require('./lab.route'))
const labTemplateRoutes = require('./lab-template.route'); 
const pharmacyRoutes = require('./pharmacy.route'); 

const videoRoutes = require('./video.route')

// Mount routes
router.use('/auth', authRoutes);
router.use('/doctor', doctorRoutes);
router.use('/patient', patientRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/meetings', meetingRoutes);
router.use('/users', userRoutes);
router.use('/video', videoRoutes);
router.use('/prescription', prescriptionRoutes);
router.use('/records', recordRoutes);
router.use('/labs', labRoutes);
router.use('/lab-templates', labTemplateRoutes);
router.use('/pharmacy', pharmacyRoutes);
// Health check route
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

module.exports = router;