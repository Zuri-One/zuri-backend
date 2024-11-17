const express = require('express');
const router = express.Router();
const doctorController = require('../../controllers/doctor.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

// Public routes (require only authentication)
router.get('/available', authenticate, doctorController.getAvailableDoctors);
router.get('/:id/availability', authenticate, doctorController.validateAvailabilityQuery, doctorController.getDoctorAvailability);

// Protected routes (require doctor role)
router.use(authorize('doctor'));

router.get('/stats', doctorController.getDoctorStats);
router.get('/profile', doctorController.getDoctorProfile);
router.put('/profile', doctorController.updateDoctorProfile);
router.get('/profile/:id', doctorController.getDoctorProfile);
router.get('/appointment-requests', doctorController.getAppointmentRequests);
router.post('/appointment-requests/:id/:action', doctorController.handleAppointmentRequest);
router.put('/availability', doctorController.updateAvailability);

module.exports = router;