// src/routes/v1/doctor.route.js
const express = require('express');
const router = express.Router();
const doctorController = require('../../controllers/doctor.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

// Apply authentication to all routes
router.use(authenticate);

// Apply doctor authorization to all routes except public ones
router.use((req, res, next) => {
  // Skip authorization for public routes
  if (req.path === '/available' || req.path.match(/^\/\w+\/availability$/)) {
    return next();
  }
  return authorize(['doctor'])(req, res, next);
});

// Public routes (authentication only)
router.get('/available', doctorController.getAvailableDoctors);
router.get('/:id/availability', 
  doctorController.validateAvailabilityQuery, 
  doctorController.getDoctorAvailability
);

// Protected routes (authentication + doctor role)
router.get('/stats', doctorController.getDoctorStats);
router.get('/calendar', doctorController.getCalendarData);
router.get('/profile', doctorController.getDoctorProfile);
router.put('/profile', doctorController.updateDoctorProfile);
router.get('/profile/:id', doctorController.getDoctorProfile);
router.get('/appointment-requests', doctorController.getAppointmentRequests);

// Important: Move specific routes before parameterized routes
router.post('/appointment-requests/:id/accept', async (req, res, next) => {
  req.params.action = 'accept';
  doctorController.handleAppointmentRequest(req, res, next);
});

router.post('/appointment-requests/:id/reject', async (req, res, next) => {
  req.params.action = 'reject';
  doctorController.handleAppointmentRequest(req, res, next);
});

router.put('/availability', doctorController.updateAvailability);

module.exports = router;