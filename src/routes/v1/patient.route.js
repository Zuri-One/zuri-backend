// src/routes/v1/patient.route.js
const express = require('express');
const router = express.Router();
const patientController = require('../../controllers/patient.controller');
const patientConsentController = require('../../controllers/patient-consent.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     DashboardData:
 *       type: object
 *       properties:
 *         upcomingAppointments:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 format: uuid
 *               doctorName:
 *                 type: string
 *               specialty:
 *                 type: string
 *               dateTime:
 *                 type: string
 *                 format: date-time
 *               type:
 *                 type: string
 *                 enum: [in-person, video]
 *               status:
 *                 type: string
 *         recentPrescriptions:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               prescription:
 *                 type: object
 *         stats:
 *           type: object
 *           properties:
 *             totalAppointments:
 *               type: integer
 *             upcomingCount:
 *               type: integer
 *             todayCount:
 *               type: integer
 *     
 *     HealthMetrics:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         type:
 *           type: string
 *           enum: [BLOOD_PRESSURE, BLOOD_SUGAR, WEIGHT, TEMPERATURE, HEART_RATE]
 *         value:
 *           type: number
 *         unit:
 *           type: string
 *         timestamp:
 *           type: string
 *           format: date-time
 *         notes:
 *           type: string
 *
 * @swagger
 * tags:
 *   name: Patient Portal
 *   description: Patient-specific access to medical information and services
 */

/**
 * @swagger
 * /api/v1/patient/dashboard:
 *   get:
 *     summary: Get patient's dashboard data
 *     tags: [Patient Portal]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardData'
 */
router.get('/dashboard', patientController.getPatientDashboard);

/**
 * @swagger
 * /api/v1/patient/doctors:
 *   get:
 *     summary: Search available doctors
 *     tags: [Patient Portal]
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
 *         description: Doctors list retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   name:
 *                     type: string
 *                   specialization:
 *                     type: string
 *                   qualifications:
 *                     type: array
 *                     items:
 *                       type: string
 *                   experience:
 *                     type: integer
 *                   availability:
 *                     type: object
 */
router.get('/doctors', patientController.searchDoctors);

/**
 * @swagger
 * /api/v1/patient/appointments/history:
 *   get:
 *     summary: Get patient's appointment history
 *     tags: [Patient Portal]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, completed, cancelled]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Appointment history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   doctorName:
 *                     type: string
 *                   specialty:
 *                     type: string
 *                   dateTime:
 *                     type: string
 *                     format: date-time
 *                   type:
 *                     type: string
 *                   status:
 *                     type: string
 *                   diagnosis:
 *                     type: string
 *                   prescription:
 *                     type: object
 */
router.get('/appointments/history', patientController.getAppointmentHistory);
router.get('/appointments', patientController.getAppointmentHistory);

/**
 * @swagger
 * /api/v1/patient/test-results:
 *   get:
 *     summary: Get patient's test results
 *     tags: [Patient Portal]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Test results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 testResults:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       type:
 *                         type: string
 *                       date:
 *                         type: string
 *                         format: date-time
 *                       results:
 *                         type: object
 *                       isAbnormal:
 *                         type: boolean
 *                       doctorComments:
 *                         type: string
 */
router.get('/test-results', patientController.getTestResults);

/**
 * @swagger
 * /api/v1/patient/health-metrics:
 *   get:
 *     summary: Get patient's health metrics
 *     tags: [Patient Portal]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Health metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 metrics:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/HealthMetrics'
 */
router.get('/health-metrics', patientController.getHealthMetrics);

router.post(
    '/:patientId/request-access',
    authenticate,
    // authorize(['DOCTOR']),
    patientConsentController.requestAccess
  );
  
  router.post(
    '/consent/response/:token',
    authenticate,
    // authorize(['PATIENT']),
    patientConsentController.handleAccessResponse
  );
  
  router.get(
    '/:patientId/access-status',
    authenticate,
    // authorize(['DOCTOR']),
    patientConsentController.checkAccessStatus
  );

module.exports = router;