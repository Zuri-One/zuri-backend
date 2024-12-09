// src/routes/v1/doctor.route.js
const express = require('express');
const router = express.Router();
const doctorController = require('../../controllers/doctor.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     DoctorAvailability:
 *       type: object
 *       properties:
 *         weeklySchedule:
 *           type: object
 *           description: Weekly schedule with slots for each day
 *           example:
 *             monday:
 *               - startTime: "09:00"
 *                 endTime: "17:00"
 *                 isAvailable: true
 *                 slotDuration: 30
 *         exceptions:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               isAvailable:
 *                 type: boolean
 *         defaultSlotDuration:
 *           type: integer
 *           description: Default appointment duration in minutes
 *           default: 30
 *         bufferTime:
 *           type: integer
 *           description: Buffer time between appointments in minutes
 *           default: 5
 *         maxDailyAppointments:
 *           type: integer
 *           description: Maximum number of appointments per day
 *           default: 20
 *         isAcceptingAppointments:
 *           type: boolean
 *           default: true
 *
 *     DoctorProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         specialization:
 *           type: string
 *         licenseNumber:
 *           type: string
 *         qualifications:
 *           type: array
 *           items:
 *             type: string
 *         experience:
 *           type: integer
 *         consultationFee:
 *           type: number
 *         bio:
 *           type: string
 *         languagesSpoken:
 *           type: array
 *           items:
 *             type: string
 *         rating:
 *           type: number
 *         isAvailableForVideo:
 *           type: boolean
 *
 * @swagger
 * tags:
 *   name: Doctors
 *   description: Doctor management and availability endpoints
 */

/**
 * @swagger
 * /api/v1/doctors/availability/current:
 *   get:
 *     summary: Get doctor's current availability settings
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current availability settings retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/DoctorAvailability'
 */
router.get('/availability/current', authenticate, authorize(['DOCTOR']), 
  doctorController.getCurrentAvailability);

/**
 * @swagger
 * /api/v1/doctors/availability/update:
 *   put:
 *     summary: Update doctor's availability settings
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DoctorAvailability'
 *     responses:
 *       200:
 *         description: Availability updated successfully
 */
router.put('/availability/update', authenticate, authorize(['DOCTOR']), 
  doctorController.updateAvailability);

/**
 * @swagger
 * /api/v1/doctors/available:
 *   get:
 *     summary: Get list of available doctors
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: specialization
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of available doctors retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DoctorProfile'
 */
router.get('/available', authenticate, doctorController.getAvailableDoctors);

/**
 * @swagger
 * /api/v1/doctors/departments/{departmentId}/doctors:
 *   get:
 *     summary: Get all doctors in a department
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: departmentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of doctors retrieved successfully
 */
router.get('/departments/:departmentId/doctors', authenticate, 
  doctorController.getDepartmentDoctors);

/**
 * @swagger
 * /api/v1/doctors/stats:
 *   get:
 *     summary: Get doctor's statistics
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Doctor statistics retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalAppointments:
 *                   type: integer
 *                 newAppointments:
 *                   type: integer
 *                 cancelledAppointments:
 *                   type: integer
 *                 appointmentsToday:
 *                   type: integer
 *                 totalPatients:
 *                   type: integer
 */
router.get('/stats', authenticate, authorize(['DOCTOR']), doctorController.getDoctorStats);

/**
 * @swagger
 * /api/v1/doctors/calendar:
 *   get:
 *     summary: Get doctor's calendar data
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Calendar data retrieved successfully
 */
router.get('/calendar', authenticate, authorize(['DOCTOR']), doctorController.getCalendarData);

/**
 * @swagger
 * /api/v1/doctors/profile:
 *   get:
 *     summary: Get doctor's profile
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DoctorProfile'
 *   put:
 *     summary: Update doctor's profile
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DoctorProfile'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.get('/profile', authenticate, authorize(['DOCTOR']), doctorController.getDoctorProfile);
router.put('/profile', authenticate, authorize(['DOCTOR']), doctorController.updateDoctorProfile);

/**
 * @swagger
 * /api/v1/doctors/appointment-requests:
 *   get:
 *     summary: Get pending appointment requests
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Appointment requests retrieved successfully
 */
router.get('/appointment-requests', authenticate, authorize(['DOCTOR']), 
  doctorController.getAppointmentRequests);

/**
 * @swagger
 * /api/v1/doctors/appointment-requests/{id}/{action}:
 *   post:
 *     summary: Handle appointment request (accept/reject)
 *     tags: [Doctors]
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
router.post('/appointment-requests/:id/:action', authenticate, authorize(['DOCTOR']), 
  doctorController.handleAppointmentRequest);

module.exports = router;