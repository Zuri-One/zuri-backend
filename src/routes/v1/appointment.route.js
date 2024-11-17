const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const appointmentController = require('../../controllers/appointment.controller');

// Create appointment
router.post(
  '/', 
  authenticate, 
  appointmentController.createAppointment
);

// Get all appointments
router.get(
  '/', 
  authenticate, 
  appointmentController.getAppointments
);

// Get specific appointment
router.get(
  '/:id', 
  authenticate, 
  appointmentController.getAppointmentById
);

// Update appointment status
router.patch(
  '/:id/status', 
  authenticate, 
  appointmentController.updateAppointmentStatus
);

// Reschedule appointment
router.patch(
  '/:id/reschedule', 
  authenticate, 
  appointmentController.rescheduleAppointment
);

// Add notes to appointment
router.patch(
  '/:id/notes', 
  authenticate, 
  appointmentController.addAppointmentNotes
);

// Get doctor availability
router.get(
  '/doctor/:doctorId/availability', 
  authenticate, 
  appointmentController.getDoctorAvailability
);

module.exports = router;