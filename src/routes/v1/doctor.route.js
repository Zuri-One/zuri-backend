// src/routes/v1/doctor.route.js
const express = require('express');
const router = express.Router();
const doctorController = require('../../controllers/doctor.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

// Apply authentication to all routes first
router.use(authenticate);

// Public doctor routes (need only authentication)
router.get('/available', doctorController.getAvailableDoctors);
router.get('/:id/availability', doctorController.validateAvailabilityQuery, doctorController.getDoctorAvailability);

// Protected doctor routes
// Note: Changed from 'doctor' to ['doctor'] to match the middleware expectation
router.use(authorize(['doctor']));

// These routes now require both authentication and doctor role
router.get('/stats', doctorController.getDoctorStats);
router.get('/calendar', doctorController.getCalendarData);
router.get('/profile', doctorController.getDoctorProfile);
router.put('/profile', doctorController.updateDoctorProfile);
router.get('/profile/:id', doctorController.getDoctorProfile);
router.get('/appointment-requests', doctorController.getAppointmentRequests);
router.post('/appointment-requests/:id/:action', doctorController.handleAppointmentRequest);
router.put('/availability', doctorController.updateAvailability);

module.exports = router;