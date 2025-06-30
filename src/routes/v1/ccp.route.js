// routes/v1/ccp.route.js
const express = require('express');
const router = express.Router();
const CCPController = require('../../controllers/ccp.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

// Create an instance of the controller
const ccpController = new CCPController();

/**
 * @swagger
 * /api/v1/ccp/patients:
 *   get:
 *     summary: Get all CCP enrolled patients
 *     tags: [CCP]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *           default: active
 */
router.get('/patients', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE', 'ADMIN', 'CCP_COORDINATOR']), 
  ccpController.getCCPPatientsList.bind(ccpController)
);

/**
 * @swagger
 * /api/v1/ccp/patient/{patientId}/profile:
 *   get:
 *     summary: Get comprehensive CCP patient profile
 *     tags: [CCP]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/patient/:patientId/profile', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE', 'ADMIN', 'CCP_COORDINATOR']), 
  ccpController.getCCPPatientProfile.bind(ccpController)
);

/**
 * @swagger
 * /api/v1/ccp/patient/{patientId}/medical-history:
 *   get:
 *     summary: Get CCP patient medical history
 *     tags: [CCP]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
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
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 */
router.get('/patient/:patientId/medical-history', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE', 'ADMIN', 'CCP_COORDINATOR']), 
  ccpController.getCCPMedicalHistory.bind(ccpController)
);

/**
 * @swagger
 * /api/v1/ccp/patient/{patientId}/vital-trends:
 *   get:
 *     summary: Get CCP patient vital signs trends
 *     tags: [CCP]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
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
 *       - in: query
 *         name: metric
 *         schema:
 *           type: string
 *           enum: [bloodPressure, weight, temperature, heartRate, bmi, oxygenSaturation]
 */
router.get('/patient/:patientId/vital-trends', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE', 'ADMIN', 'CCP_COORDINATOR']), 
  ccpController.getCCPVitalTrends.bind(ccpController)
);

/**
 * @swagger
 * /api/v1/ccp/patient/{patientId}/lab-history:
 *   get:
 *     summary: Get CCP patient laboratory test history
 *     tags: [CCP]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: testType
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, SAMPLE_COLLECTED, IN_PROGRESS, COMPLETED, CANCELLED]
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
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 */
router.get('/patient/:patientId/lab-history', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE', 'ADMIN', 'CCP_COORDINATOR', 'LAB_TECHNICIAN']), 
  ccpController.getCCPLabHistory.bind(ccpController)
);

/**
 * @swagger
 * /api/v1/ccp/patient/{patientId}/medications:
 *   get:
 *     summary: Get CCP patient current medications and prescription history
 *     tags: [CCP]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/patient/:patientId/medications', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE', 'ADMIN', 'CCP_COORDINATOR', 'PHARMACIST']), 
  ccpController.getCCPCurrentMedications.bind(ccpController)
);

/**
 * @swagger
 * /api/v1/ccp/patient/{patientId}/billing:
 *   get:
 *     summary: Get CCP patient billing history and cost analysis
 *     tags: [CCP]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
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
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [PENDING, PAID, WAIVED]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 */
router.get('/patient/:patientId/billing', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE', 'ADMIN', 'CCP_COORDINATOR', 'BILLING_CLERK']), 
  ccpController.getCCPBillingHistory.bind(ccpController)
);

/**
 * @swagger
 * /api/v1/ccp/patient/{patientId}/follow-up:
 *   get:
 *     summary: Get CCP patient follow-up schedule
 *     tags: [CCP]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/patient/:patientId/follow-up', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE', 'ADMIN', 'CCP_COORDINATOR']), 
  ccpController.getCCPFollowUpSchedule.bind(ccpController)
);

/**
 * @swagger
 * /api/v1/ccp/patient/{patientId}/report:
 *   get:
 *     summary: Generate comprehensive CCP patient report
 *     tags: [CCP]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
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
 *       - in: query
 *         name: includeVitals
 *         schema:
 *           type: boolean
 *           default: true
 *       - in: query
 *         name: includeLabs
 *         schema:
 *           type: boolean
 *           default: true
 *       - in: query
 *         name: includeMedications
 *         schema:
 *           type: boolean
 *           default: true
 */
router.get('/patient/:patientId/report', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE', 'ADMIN', 'CCP_COORDINATOR']), 
  ccpController.generateCCPReport.bind(ccpController)
);

/**
 * @swagger
 * /api/v1/ccp/analytics:
 *   get:
 *     summary: Get CCP program analytics and metrics
 *     tags: [CCP]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 */
router.get('/analytics', 
  authenticate, 
  authorize(['ADMIN', 'CCP_COORDINATOR', 'DOCTOR']), 
  ccpController.getCCPAnalytics.bind(ccpController)
);

module.exports = router;