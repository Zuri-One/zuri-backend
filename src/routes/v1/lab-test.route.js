const express = require('express');
const router = express.Router();
const labTestController = require('../../controllers/lab-test.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

// Base route: /api/v1/lab-test

/**
 * @swagger
 * /api/v1/lab-test:
 *   post:
 *     summary: Create a new lab test request
 *     tags: [Lab Tests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - testType
 *             properties:
 *               patientId:
 *                 type: string
 *                 format: uuid
 *               queueEntryId:
 *                 type: string
 *                 format: uuid
 *               testType:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [NORMAL, URGENT]
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Lab test created successfully
 */
router.post('/', authenticate, labTestController.createLabTest);


/**
 * @swagger
 * /api/v1/lab-test/available-types:
 *   get:
 *     summary: Get available test types from catalog
 *     tags: [Lab Tests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Available test types retrieved successfully
 */
router.get('/available-types', authenticate, labTestController.getAvailableTestTypes);

/**
 * @swagger
 * /api/v1/lab-test:
 *   get:
 *     summary: Get all lab tests with filters
 *     tags: [Lab Tests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *       - in: query
 *         name: testType
 *         schema:
 *           type: string
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of lab tests retrieved successfully
 */
router.get('/', authenticate, labTestController.getLabTests);

/**
 * @swagger
 * /api/v1/lab-test/pending:
 *   get:
 *     summary: Get all pending lab tests
 *     tags: [Lab Tests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending lab tests retrieved successfully
 */
router.get('/pending', authenticate, labTestController.getPendingTests);

/**
 * @swagger
 * /api/v1/lab-test/current-session:
 *   get:
 *     summary: Get test results from current session (today)
 *     tags: [Lab Tests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current session test results retrieved successfully
 */
router.get('/current-session', 
  authenticate, 
  authorize(['LAB_TECHNICIAN']), 
  labTestController.getCurrentSessionResults
);

/**
 * @swagger
 * /api/v1/lab-test/analytics:
 *   get:
 *     summary: Get analytics data for lab tests
 *     tags: [Lab Tests]
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
 *     responses:
 *       200:
 *         description: Lab analytics data retrieved successfully
 */
router.get('/analytics', 
  authenticate, 
  authorize(['LAB_TECHNICIAN', 'ADMIN']), 
  labTestController.getLabAnalytics
);

/**
 * @swagger
 * /api/v1/lab-test/stats/samples:
 *   get:
 *     summary: Get sample collection stats
 *     tags: [Lab Tests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sample collection stats retrieved successfully
 */
router.get('/stats/samples',
  authenticate,
  authorize(['LAB_TECHNICIAN', 'ADMIN']),
  labTestController.getSampleStats
);

/**
 * @swagger
 * /api/v1/lab-test/patient/{patientId}/history:
 *   get:
 *     summary: Get patient test history
 *     tags: [Lab Tests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *         name: testType
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Patient test history retrieved successfully
 */
router.get('/patient/:patientId/history',
  authenticate,
  labTestController.getPatientTestHistory
);

/**
 * @swagger
 * /api/v1/lab-test/{id}:
 *   get:
 *     summary: Get a specific lab test by ID
 *     tags: [Lab Tests]
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
 *         description: Lab test details retrieved successfully
 *       404:
 *         description: Lab test not found
 */
router.get('/:id', authenticate, labTestController.getLabTestById);

/**
 * @swagger
 * /api/v1/lab-test/{id}/status:
 *   patch:
 *     summary: Update lab test status
 *     tags: [Lab Tests]
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
 *                 enum: [PENDING, SAMPLE_COLLECTED, IN_PROGRESS, COMPLETED, CANCELLED]
 *               notes:
 *                 type: string
 *               isAbnormal:
 *                 type: boolean
 *               isCritical:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Lab test status updated successfully
 *       404:
 *         description: Lab test not found
 */
router.patch('/:id/status', authenticate, labTestController.updateTestStatus);

/**
 * @swagger
 * /api/v1/lab-test/{id}/collect-sample:
 *   post:
 *     summary: Collect sample for lab test
 *     tags: [Lab Tests]
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
 *               - sampleCollectionMethod
 *             properties:
 *               sampleCollectionMethod:
 *                 type: string
 *               patientPreparation:
 *                 type: string
 *               sampleCollectionNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Sample collected successfully
 *       404:
 *         description: Lab test not found
 */
router.post('/:id/collect-sample', 
  authenticate, 
  authorize(['LAB_TECHNICIAN']), 
  labTestController.collectSample
);

/**
 * @swagger
 * /api/v1/lab-test/{id}/approve-sample:
 *   post:
 *     summary: Approve or reject collected sample
 *     tags: [Lab Tests]
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
 *               - approved
 *             properties:
 *               approved:
 *                 type: boolean
 *               rejectionReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Sample approval status updated successfully
 *       404:
 *         description: Lab test not found
 */
router.post('/:id/approve-sample',
  authenticate,
  authorize(['LAB_TECHNICIAN']),
  labTestController.approveSample
);

/**
 * @swagger
 * /api/v1/lab-test/{id}/results:
 *   post:
 *     summary: Add test results
 *     tags: [Lab Tests]
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
 *               - results
 *             properties:
 *               results:
 *                 type: object
 *               referenceRange:
 *                 type: object
 *               isAbnormal:
 *                 type: boolean
 *               isCritical:
 *                 type: boolean
 *               requiresFollowUp:
 *                 type: boolean
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Test results added successfully
 *       404:
 *         description: Lab test not found
 */
router.post('/:id/results',
  authenticate,
  authorize(['LAB_TECHNICIAN']),
  labTestController.addTestResults
);

/**
 * @swagger
 * /api/v1/lab-test/{id}/critical:
 *   post:
 *     summary: Mark a lab test as critical
 *     tags: [Lab Tests]
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
 *             properties:
 *               notifiedTo:
 *                 type: string
 *               criticalValues:
 *                 type: array
 *                 items:
 *                   type: string
 *               notificationMethod:
 *                 type: string
 *     responses:
 *       200:
 *         description: Critical value notification recorded
 *       404:
 *         description: Lab test not found
 */
router.post('/:id/critical', authenticate, labTestController.markCriticalValue);

/**
 * @swagger
 * /api/v1/lab-test/{id}/report:
 *   get:
 *     summary: Generate and download lab report
 *     tags: [Lab Tests]
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
 *         description: Lab report generated successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Lab test not found
 */
router.get('/:id/report', authenticate, labTestController.generateReport);

/**
 * @swagger
 * /api/v1/lab-test/{id}/email-results:
 *   post:
 *     summary: Send lab results to patient via email
 *     tags: [Lab Tests]
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emailAddress:
 *                 type: string
 *                 format: email
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Test results sent successfully
 *       404:
 *         description: Lab test not found
 */
router.post('/:id/email-results', 
  authenticate, 
  authorize(['LAB_TECHNICIAN', 'DOCTOR']), 
  labTestController.emailResults
);

module.exports = router;