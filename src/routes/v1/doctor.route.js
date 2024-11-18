const express = require('express');
const router = express.Router();
const doctorController = require('../../controllers/doctor.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

// Public routes that only need authentication
router.get('/available', authenticate, doctorController.getAvailableDoctors);
router.get('/:id/availability', 
 authenticate,
 doctorController.validateAvailabilityQuery, 
 doctorController.getDoctorAvailability
);

// Apply authentication and doctor authorization for protected routes
router.use(authenticate, authorize(['doctor']));

// Protected routes for doctors only
router.get('/stats', doctorController.getDoctorStats);
router.get('/calendar', doctorController.getCalendarData);
router.get('/profile', doctorController.getDoctorProfile);
router.put('/profile', doctorController.updateDoctorProfile);
router.get('/profile/:id', doctorController.getDoctorProfile);
router.get('/appointment-requests', doctorController.getAppointmentRequests);

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