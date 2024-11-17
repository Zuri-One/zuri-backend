const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const appointmentController = require('../../controllers/appointment.controller');

// All routes require authentication
router.use(authenticate);

router.post('/', appointmentController.validateAppointmentCreation, appointmentController.createAppointment);
router.get('/', appointmentController.getAppointments);
router.get('/:id', appointmentController.getAppointmentById);
router.patch('/:id/status', appointmentController.updateAppointmentStatus);
router.patch('/:id/reschedule', appointmentController.rescheduleAppointment);
router.patch('/:id/notes', appointmentController.addAppointmentNotes);

// Remove the duplicate availability route
// router.get('/doctor/:doctorId/availability', appointmentController.getDoctorAvailability);

module.exports = router;