// src/routes/v1/appointment.route.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const appointmentController = require('../../controllers/appointment.controller');

/**
 * @swagger
 * components:
 *   schemas:
 *     Appointment:
 *       type: object
 *       required:
 *         - patientId
 *         - doctorId
 *         - dateTime
 *         - type
 *         - reason
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Auto-generated unique identifier
 *         patientId:
 *           type: string
 *           format: uuid
 *           description: ID of the patient
 *         doctorId:
 *           type: string
 *           format: uuid
 *           description: ID of the doctor
 *         dateTime:
 *           type: string
 *           format: date-time
 *           description: Appointment date and time
 *         type:
 *           type: string
 *           enum: [in-person, video]
 *           description: Type of appointment
 *         status:
 *           type: string
 *           enum: [pending, confirmed, in-progress, completed, cancelled, upcoming, no-show]
 *           description: Current status of the appointment
 *         reason:
 *           type: string
 *           description: Reason for the appointment
 *         symptoms:
 *           type: array
 *           items:
 *             type: string
 *           description: List of symptoms
 *         notes:
 *           type: string
 *           description: Additional notes about the appointment
 *         diagnosis:
 *           type: string
 *           description: Diagnosis after consultation
 *         meetingLink:
 *           type: string
 *           description: Video consultation meeting link
 *         duration:
 *           type: integer
 *           description: Duration in minutes
 *           default: 30
 *         paymentStatus:
 *           type: string
 *           enum: [pending, completed, refunded]
 *           description: Payment status of the appointment
 *       example:
 *         doctorId: "uuid-here"
 *         dateTime: "2024-12-10T14:30:00Z"
 *         type: "in-person"
 *         reason: "Annual checkup"
 *         symptoms: ["headache", "fever"]
 */

/**
 * @swagger
 * tags:
 *   name: Appointments
 *   description: Appointment management endpoints
 */

/**
 * @swagger
 * /api/v1/appointments:
 *   post:
 *     summary: Create a new appointment
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - doctorId
 *               - dateTime
 *               - type
 *               - reason
 *             properties:
 *               doctorId:
 *                 type: string
 *                 format: uuid
 *               dateTime:
 *                 type: string
 *                 format: date-time
 *               type:
 *                 type: string
 *                 enum: [in-person, video]
 *               reason:
 *                 type: string
 *               symptoms:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Appointment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 appointment:
 *                   $ref: '#/components/schemas/Appointment'
 *       400:
 *         description: Invalid input or time slot not available
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticate, appointmentController.validateAppointmentCreation, appointmentController.createAppointment);

/**
 * @swagger
 * /api/v1/appointments:
 *   get:
 *     summary: Get all appointments
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [in-person, video]
 *         description: Filter by appointment type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, in-progress, completed, cancelled]
 *         description: Filter by appointment status
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [upcoming, today, past]
 *         description: Filter by time frame
 *     responses:
 *       200:
 *         description: List of appointments retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 appointments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Appointment'
 */
router.get('/', appointmentController.getAppointments);

/**
 * @swagger
 * /api/v1/appointments/{id}/handle-request/{action}:
 *   post:
 *     summary: Handle appointment request (accept/reject)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: action
 *         required: true
 *         schema:
 *           type: string
 *           enum: [accept, reject]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               platform:
 *                 type: string
 *                 enum: [zoom, whereby]
 *                 description: Required for video appointments
 *     responses:
 *       200:
 *         description: Appointment request handled successfully
 */
router.post('/:id/handle-request/:action', authenticate, appointmentController.handleAppointmentRequest);

/**
 * @swagger
 * /api/v1/appointments/{id}:
 *   get:
 *     summary: Get appointment by ID
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Appointment details retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 appointment:
 *                   $ref: '#/components/schemas/Appointment'
 *       404:
 *         description: Appointment not found
 */
router.get('/:id', appointmentController.getAppointmentById);

/**
 * @swagger
 * /api/v1/appointments/{id}/status:
 *   patch:
 *     summary: Update appointment status
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [confirmed, completed, cancelled]
 *               reason:
 *                 type: string
 *                 description: Required if status is cancelled
 *     responses:
 *       200:
 *         description: Appointment status updated successfully
 */
router.patch('/:id/status', appointmentController.updateAppointmentStatus);

/**
 * @swagger
 * /api/v1/appointments/{id}/reschedule:
 *   patch:
 *     summary: Reschedule an appointment
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newDateTime
 *             properties:
 *               newDateTime:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Appointment rescheduled successfully
 *       400:
 *         description: Invalid time slot or scheduling conflict
 */
router.patch('/:id/reschedule', appointmentController.rescheduleAppointment);

/**
 * @swagger
 * /api/v1/appointments/{id}/notes:
 *   patch:
 *     summary: Add notes to an appointment
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - notes
 *             properties:
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Notes added successfully
 *       403:
 *         description: Only doctors can add notes
 */
router.patch('/:id/notes', appointmentController.addAppointmentNotes);

module.exports = router;