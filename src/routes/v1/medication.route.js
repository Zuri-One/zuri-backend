// src/routes/v1/medication.route.js
const express = require('express');
const router = express.Router();
const medicationController = require('../../controllers/medication.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     Prescription:
 *       type: object
 *       required:
 *         - patientId
 *         - doctorId
 *         - medications
 *         - diagnosis
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
 *           description: ID of the prescribing doctor
 *         diagnosis:
 *           type: string
 *           description: Diagnosis related to the prescription
 *         medications:
 *           type: array
 *           items:
 *             type: object
 *             required:
 *               - name
 *               - dosage
 *               - frequency
 *               - duration
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the medication
 *               dosage:
 *                 type: string
 *                 description: Dosage amount (e.g., "500mg")
 *               frequency:
 *                 type: string
 *                 description: How often to take (e.g., "twice daily")
 *               duration:
 *                 type: integer
 *                 description: Duration in days
 *               instructions:
 *                 type: string
 *                 description: Special instructions
 *               sideEffects:
 *                 type: string
 *                 description: Potential side effects
 *         notes:
 *           type: string
 *           description: Additional notes for the prescription
 *         validUntil:
 *           type: string
 *           format: date-time
 *           description: Prescription validity period
 *         maxRefills:
 *           type: integer
 *           description: Maximum number of refills allowed
 *         status:
 *           type: string
 *           enum: [active, completed, cancelled, expired]
 *           default: active
 *         refillCount:
 *           type: integer
 *           default: 0
 *           description: Number of times refilled
 *
 * @swagger
 * tags:
 *   name: Medications
 *   description: Medication and prescription management endpoints
 */

/**
 * @swagger
 * /api/v1/medications/prescriptions/{id}:
 *   get:
 *     summary: Get prescription by ID (public)
 *     tags: [Medications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Prescription retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Prescription'
 */
router.get('/prescriptions/:id', medicationController.getPrescription);

// Protected routes below require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/medications/prescriptions:
 *   post:
 *     summary: Create new prescription (doctors only)
 *     tags: [Medications]
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
 *               - diagnosis
 *               - medications
 *             properties:
 *               patientId:
 *                 type: string
 *                 format: uuid
 *               diagnosis:
 *                 type: string
 *               medications:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - name
 *                     - dosage
 *                     - frequency
 *                     - duration
 *                   properties:
 *                     name:
 *                       type: string
 *                     dosage:
 *                       type: string
 *                     frequency:
 *                       type: string
 *                     duration:
 *                       type: integer
 *                     instructions:
 *                       type: string
 *               notes:
 *                 type: string
 *               validUntil:
 *                 type: string
 *                 format: date-time
 *               maxRefills:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Prescription created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 prescription:
 *                   $ref: '#/components/schemas/Prescription'
 */
router.post('/prescriptions', medicationController.createPrescription);

/**
 * @swagger
 * /api/v1/medications/doctor/prescriptions:
 *   get:
 *     summary: Get doctor's prescriptions
 *     tags: [Medications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, completed, cancelled, expired]
 *     responses:
 *       200:
 *         description: List of prescriptions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 prescriptions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Prescription'
 */
router.get('/doctor/prescriptions', medicationController.getDoctorPrescriptions);

/**
 * @swagger
 * /api/v1/medications/prescriptions/{id}:
 *   patch:
 *     summary: Update prescription (doctors only)
 *     tags: [Medications]
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
 *               status:
 *                 type: string
 *                 enum: [active, completed, cancelled]
 *               notes:
 *                 type: string
 *               refillCount:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Prescription updated successfully
 */
router.patch('/prescriptions/:id', medicationController.updatePrescription);

/**
 * @swagger
 * /api/v1/medications/patient/prescriptions:
 *   get:
 *     summary: Get patient's prescriptions
 *     tags: [Medications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Patient's prescriptions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 prescriptions:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/Prescription'
 *                       - type: object
 *                         properties:
 *                           doctor:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               email:
 *                                 type: string
 */
router.get('/patient/prescriptions', medicationController.getPatientPrescriptions);

module.exports = router;