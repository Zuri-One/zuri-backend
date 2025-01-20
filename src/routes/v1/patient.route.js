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

/**
 * @swagger
 * /api/v1/patient/registrations:
 *   get:
 *     summary: Get patient registrations within a date range
 *     tags: [Patient Portal]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD). If not provided, defaults to startDate
 *     responses:
 *       200:
 *         description: Patient registrations retrieved successfully
 */
router.get('/registrations', 
  authenticate, 
  // authorize(['ADMIN', 'RECEPTIONIST']), 
  patientController.getPatientRegistrations
);


/**
 * @swagger
 * /api/v1/patient/details/{identifier}:
 *   get:
 *     summary: Get patient details by ID or patient number
 *     tags: [Patient Portal]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: identifier
 *         required: true
 *         schema:
 *           type: string
 *         description: Patient ID (UUID) or patient number (e.g., ZH000001)
 *     responses:
 *       200:
 *         description: Patient details retrieved successfully
 *       404:
 *         description: Patient not found
 */
router.get('/details/:identifier', 
  authenticate, 
  // authorize(['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']), 
  patientController.getPatientDetails
);

/**
 * @swagger
 * /api/v1/patient/all:
 *   get:
 *     summary: Get all patients with optional pagination
 *     tags: [Patient Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number for pagination (optional)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of records per page (optional, default 10)
 *       - in: query
 *         name: noPagination
 *         schema:
 *           type: boolean
 *         description: If true, returns all records without pagination
 *     responses:
 *       200:
 *         description: List of patients retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     patients:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           patientNumber:
 *                             type: string
 *                           fullName:
 *                             type: string
 *                           age:
 *                             type: integer
 *                           sex:
 *                             type: string
 *                           contact:
 *                             type: string
 *                           status:
 *                             type: string
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 */
router.get('/all', 
  authenticate, 
  // authorize(['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']), 
  patientController.getAllPatients
);

/**
 * @swagger
 * /api/v1/patient/search:
 *   get:
 *     summary: Search patients by phone number, patient number, or email
 *     tags: [Patient Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: searchTerm
 *         required: true
 *         schema:
 *           type: string
 *         description: Phone number, patient number, or email to search for
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 patients:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       personalInfo:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           patientNumber:
 *                             type: string
 *                           surname:
 *                             type: string
 *                           otherNames:
 *                             type: string
 *                           fullName:
 *                             type: string
 *                           sex:
 *                             type: string
 *                           dateOfBirth:
 *                             type: string
 *                           age:
 *                             type: integer
 *                           nationality:
 *                             type: string
 *                           occupation:
 *                             type: string
 *                       contactInfo:
 *                         type: object
 *                         properties:
 *                           telephone1:
 *                             type: string
 *                           telephone2:
 *                             type: string
 *                           email:
 *                             type: string
 *                           residence:
 *                             type: string
 *                           town:
 *                             type: string
 *                           postalAddress:
 *                             type: string
 *                           postalCode:
 *                             type: string
 *                       identification:
 *                         type: object
 *                         properties:
 *                           idType:
 *                             type: string
 *                           idNumber:
 *                             type: string
 *                       emergencyContact:
 *                         type: object
 *                       medicalInfo:
 *                         type: object
 *                         properties:
 *                           medicalHistory:
 *                             type: object
 *                           insuranceInfo:
 *                             type: object
 *                       status:
 *                         type: object
 *                         properties:
 *                           isEmergency:
 *                             type: boolean
 *                           isRevisit:
 *                             type: boolean
 *                           currentStatus:
 *                             type: string
 *                           isActive:
 *                             type: boolean
 *                       registrationInfo:
 *                         type: object
 *                         properties:
 *                           registeredOn:
 *                             type: string
 *                           registrationNotes:
 *                             type: string
 *                           lastUpdated:
 *                             type: string
 *                           paymentScheme:
 *                             type: object
 *       400:
 *         description: Search term is required
 */
router.get('/search', 
  authenticate, 
  // authorize(['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']), 
  patientController.searchPatients
);

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