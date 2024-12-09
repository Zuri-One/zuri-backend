// src/routes/v1/triage.route.js
const express = require('express');
const router = express.Router();
const triageController = require('../../controllers/triage.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     TriageAssessment:
 *       type: object
 *       required:
 *         - patientId
 *         - chiefComplaint
 *         - vitalSigns
 *         - consciousness
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         patientId:
 *           type: string
 *           format: uuid
 *         assessedBy:
 *           type: string
 *           format: uuid
 *         assessmentDateTime:
 *           type: string
 *           format: date-time
 *         category:
 *           type: string
 *           enum: [RED, YELLOW, GREEN, BLACK]
 *           description: RED=Immediate, YELLOW=Urgent, GREEN=Non-urgent, BLACK=Deceased
 *         chiefComplaint:
 *           type: string
 *         vitalSigns:
 *           type: object
 *           properties:
 *             bloodPressure:
 *               type: object
 *               properties:
 *                 systolic:
 *                   type: number
 *                 diastolic:
 *                   type: number
 *                 isAbnormal:
 *                   type: boolean
 *             temperature:
 *               type: object
 *               properties:
 *                 value:
 *                   type: number
 *                 unit:
 *                   type: string
 *                 isAbnormal:
 *                   type: boolean
 *             heartRate:
 *               type: object
 *               properties:
 *                 value:
 *                   type: number
 *                 isAbnormal:
 *                   type: boolean
 *             respiratoryRate:
 *               type: object
 *               properties:
 *                 value:
 *                   type: number
 *                 isAbnormal:
 *                   type: boolean
 *             oxygenSaturation:
 *               type: object
 *               properties:
 *                 value:
 *                   type: number
 *                 isAbnormal:
 *                   type: boolean
 *             painScore:
 *               type: object
 *               properties:
 *                 value:
 *                   type: number
 *                 location:
 *                   type: string
 *         consciousness:
 *           type: string
 *           enum: [ALERT, VERBAL, PAIN, UNRESPONSIVE]
 *         priorityScore:
 *           type: integer
 *           description: Calculated score based on assessment criteria
 *         recommendedAction:
 *           type: string
 *           enum: [IMMEDIATE_TREATMENT, URGENT_CARE, STANDARD_CARE, REFERRAL, DISCHARGE]
 *         status:
 *           type: string
 *           enum: [IN_PROGRESS, COMPLETED, REASSESSED, TRANSFERRED]
 *           default: IN_PROGRESS
 *
 * @swagger
 * tags:
 *   name: Triage
 *   description: Emergency triage and assessment management
 */

/**
 * @swagger
 * /api/v1/triage/waiting-count:
 *   get:
 *     summary: Get count of waiting patients
 *     tags: [Triage]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Waiting count retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 */
router.get('/waiting-count', authenticate, triageController.getWaitingCount);

/**
 * @swagger
 * /api/v1/triage/stats:
 *   get:
 *     summary: Get triage statistics
 *     tags: [Triage]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Triage statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 RED:
 *                   type: integer
 *                 YELLOW:
 *                   type: integer
 *                 GREEN:
 *                   type: integer
 *                 BLACK:
 *                   type: integer
 *                 vitalAlerts:
 *                   type: integer
 */
router.get('/stats', triageController.getTriageStats);

/**
 * @swagger
 * /api/v1/triage:
 *   post:
 *     summary: Create new triage assessment
 *     tags: [Triage]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TriageAssessment'
 *     responses:
 *       201:
 *         description: Triage assessment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 triage:
 *                   $ref: '#/components/schemas/TriageAssessment'
 */
router.post('/', triageController.createTriageAssessment);

/**
 * @swagger
 * /api/v1/triage/active:
 *   get:
 *     summary: Get all active triage cases
 *     tags: [Triage]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active triage cases retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 triages:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/TriageAssessment'
 *                       - type: object
 *                         properties:
 *                           waitingTime:
 *                             type: integer
 */
router.get('/active', triageController.getActiveTriages);

/**
 * @swagger
 * /api/v1/triage/{id}:
 *   get:
 *     summary: Get specific triage assessment
 *     tags: [Triage]
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
 *         description: Triage assessment retrieved successfully
 *   put:
 *     summary: Update triage assessment
 *     tags: [Triage]
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
 *             $ref: '#/components/schemas/TriageAssessment'
 *     responses:
 *       200:
 *         description: Triage assessment updated successfully
 */
router.get('/:id', triageController.getTriageById);
router.put('/:id', triageController.updateTriageAssessment);

/**
 * @swagger
 * /api/v1/triage/{id}/reassess:
 *   post:
 *     summary: Reassess patient triage
 *     tags: [Triage]
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
 *               - vitalSigns
 *             properties:
 *               vitalSigns:
 *                 type: object
 *     responses:
 *       200:
 *         description: Patient reassessed successfully
 */
router.post('/:id/reassess', triageController.reassessPatient);

/**
 * @swagger
 * /api/v1/triage/{id}/status:
 *   patch:
 *     summary: Update triage status
 *     tags: [Triage]
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
 *                 enum: [IN_PROGRESS, COMPLETED, REASSESSED, TRANSFERRED]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Triage status updated successfully
 */
router.patch('/:id/status', triageController.updateTriageStatus);

module.exports = router;