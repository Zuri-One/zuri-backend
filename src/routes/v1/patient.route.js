// src/routes/v1/patient.route.js
const express = require('express');
const router = express.Router();
const patientController = require('../../controllers/patient.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

// Apply middleware
router.use(authenticate);
router.use(authorize('patient'));

// Only include routes that have corresponding controller methods
router.get('/dashboard', patientController.getPatientDashboard);
router.get('/doctors', patientController.searchDoctors);
router.get('/appointments/history', patientController.getAppointmentHistory);

// New routes should match your controller method names
router.get('/appointments', patientController.getAppointmentHistory); 
router.get('/test-results', patientController.getTestResults);
router.get('/health-metrics', patientController.getHealthMetrics);

module.exports = router;