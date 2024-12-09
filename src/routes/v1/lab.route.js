// src/routes/v1/lab.route.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const labTestController = require('../../controllers/lab-test.controller');

/**
 * @swagger
 * components:
 *   schemas:
 *     LabTest:
 *       type: object
 *       required:
 *         - patientId
 *         - referringDoctorId
 *         - testType
 *         - testCategory
 *         - specimenType
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Auto-generated unique identifier
 *         patientId:
 *           type: string
 *           format: uuid
 *           description: ID of the patient
 *         referringDoctorId:
 *           type: string
 *           format: uuid
 *           description: ID of the referring doctor
 *         technicianId:
 *           type: string
 *           format: uuid
 *           description: ID of the lab technician performing the test
 *         testType:
 *           type: string
 *           description: Type of laboratory test
 *         testCategory:
 *           type: string
 *           enum: [HEMATOLOGY, BIOCHEMISTRY, MICROBIOLOGY, IMMUNOLOGY, URINALYSIS, IMAGING, PATHOLOGY, MOLECULAR, SEROLOGY, TOXICOLOGY]
 *         priority:
 *           type: string
 *           enum: [ROUTINE, URGENT, STAT]
 *           default: ROUTINE
 *         status:
 *           type: string
 *           enum: [ORDERED, SPECIMEN_COLLECTED, RECEIVED, IN_PROGRESS, COMPLETED, VERIFIED, CANCELLED, REJECTED]
 *           default: ORDERED
 *         specimenType:
 *           type: string
 *           description: Type of specimen collected
 *         results:
 *           type: object
 *           description: Test results with values and reference ranges
 *         isAbnormal:
 *           type: boolean
 *           default: false
 *         isCritical:
 *           type: boolean
 *           default: false
 *         price:
 *           type: number
 *           description: Cost of the test
 *         billingStatus:
 *           type: string
 *           enum: [PENDING, BILLED, PAID, INSURANCE]
 *           default: PENDING
 *
 * @swagger
 * tags:
 *   name: Laboratory
 *   description: Laboratory test management endpoints
 */

/**
 * @swagger
 * /api/v1/labs/tests:
 *   post:
 *     summary: Create a new lab test order
 *     tags: [Laboratory]
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
 *               - testCategory
 *               - priority
 *               - specimenType
 *               - price
 *             properties:
 *               patientId:
 *                 type: string
 *                 format: uuid
 *               testType:
 *                 type: string
 *               testCategory:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [ROUTINE, URGENT, STAT]
 *               specimenType:
 *                 type: string
 *               notes:
 *                 type: string
 *               price:
 *                 type: number
 *     responses:
 *       201:
 *         description: Lab test created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 labTest:
 *                   $ref: '#/components/schemas/LabTest'
 */
router.post('/tests', authenticate, labTestController.createLabTest);

/**
 * @swagger
 * /api/v1/labs/tests:
 *   get:
 *     summary: Get all lab tests
 *     tags: [Laboratory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ORDERED, SPECIMEN_COLLECTED, RECEIVED, IN_PROGRESS, COMPLETED, VERIFIED, CANCELLED]
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [ROUTINE, URGENT, STAT]
 *       - in: query
 *         name: category
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
 *     responses:
 *       200:
 *         description: List of lab tests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 labTests:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LabTest'
 */
router.get('/tests', authenticate, labTestController.getLabTests);

/**
 * @swagger
 * /api/v1/labs/tests/{id}:
 *   get:
 *     summary: Get lab test by ID
 *     tags: [Laboratory]
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
 *         description: Lab test retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 labTest:
 *                   $ref: '#/components/schemas/LabTest'
 */
router.get('/tests/:id', authenticate, labTestController.getLabTestById);

/**
 * @swagger
 * /api/v1/labs/pending-tests:
 *   get:
 *     summary: Get pending lab tests
 *     tags: [Laboratory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending lab tests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 labTests:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LabTest'
 */
router.get('/pending-tests', authenticate, labTestController.getPendingTests);

/**
 * @swagger
 * /api/v1/labs/tests/{id}/status:
 *   patch:
 *     summary: Update lab test status
 *     tags: [Laboratory]
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
 *                 enum: [SPECIMEN_COLLECTED, RECEIVED, IN_PROGRESS, COMPLETED, VERIFIED]
 *               results:
 *                 type: object
 *               notes:
 *                 type: string
 *               isAbnormal:
 *                 type: boolean
 *               isCritical:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Lab test status updated successfully
 */
router.patch('/tests/:id/status', authenticate, labTestController.updateTestStatus);

/**
 * @swagger
 * /api/v1/labs/tests/{id}/critical:
 *   post:
 *     summary: Mark test result as critical
 *     tags: [Laboratory]
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
 *               - notifiedTo
 *             properties:
 *               notifiedTo:
 *                 type: string
 *                 description: Name or role of the person notified about critical value
 *     responses:
 *       200:
 *         description: Critical value notification recorded successfully
 */
router.post('/tests/:id/critical', authenticate, labTestController.markCriticalValue);

module.exports = router;