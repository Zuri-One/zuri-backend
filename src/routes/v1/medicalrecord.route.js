// src/routes/v1/medical-record.route.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const medicalRecordController = require('../../controllers/medical-record.controller');

/**
 * @swagger
 * components:
 *   schemas:
 *     MedicalRecord:
 *       type: object
 *       required:
 *         - patientId
 *         - visitType
 *         - chiefComplaint
 *         - vitalSigns
 *         - practitionerId
 *         - departmentId
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         visitType:
 *           type: string
 *           enum: [ROUTINE, FOLLOW_UP, EMERGENCY, SPECIALIST, PROCEDURE]
 *         visitDate:
 *           type: string
 *           format: date-time
 *         chiefComplaint:
 *           type: string
 *         presentIllness:
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
 *             temperature:
 *               type: object
 *               properties:
 *                 value:
 *                   type: number
 *                 unit:
 *                   type: string
 *             heartRate:
 *               type: number
 *             respiratoryRate:
 *               type: number
 *             oxygenSaturation:
 *               type: number
 *             weight:
 *               type: object
 *               properties:
 *                 value:
 *                   type: number
 *                 unit:
 *                   type: string
 *         physicalExamination:
 *           type: object
 *         diagnoses:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [PRIMARY, SECONDARY]
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, RESOLVED, CHRONIC]
 *         status:
 *           type: string
 *           enum: [DRAFT, FINALIZED, AMENDED]
 *           default: DRAFT
 *         confidentialityLevel:
 *           type: string
 *           enum: [NORMAL, SENSITIVE, HIGHLY_RESTRICTED]
 *           default: NORMAL
 *     
 *     ProgressNote:
 *       type: object
 *       required:
 *         - content
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         content:
 *           type: string
 *         createdBy:
 *           type: string
 *           format: uuid
 *         timestamp:
 *           type: string
 *           format: date-time
 *
 * @swagger
 * tags:
 *   name: Medical Records
 *   description: Medical record management endpoints
 */

/**
 * @swagger
 * /api/v1/medical-records:
 *   post:
 *     summary: Create a new medical record
 *     tags: [Medical Records]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MedicalRecord'
 *     responses:
 *       201:
 *         description: Medical record created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 record:
 *                   $ref: '#/components/schemas/MedicalRecord'
 *       403:
 *         description: Not authorized to create medical records
 */
router.post('/', authorize(['DOCTOR']), medicalRecordController.createMedicalRecord);

/**
 * @swagger
 * /api/v1/medical-records/patient/{patientId}:
 *   get:
 *     summary: Get patient's medical records
 *     tags: [Medical Records]
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
 *         name: visitType
 *         schema:
 *           type: string
 *           enum: [ROUTINE, FOLLOW_UP, EMERGENCY, SPECIALIST, PROCEDURE]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, FINALIZED, AMENDED]
 *     responses:
 *       200:
 *         description: Medical records retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 records:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MedicalRecord'
 */
router.get('/patient/:patientId', authorize(['DOCTOR', 'PATIENT', 'ADMIN']), 
  medicalRecordController.getPatientRecords);

/**
 * @swagger
 * /api/v1/medical-records/{id}:
 *   put:
 *     summary: Update medical record
 *     tags: [Medical Records]
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
 *             $ref: '#/components/schemas/MedicalRecord'
 *     responses:
 *       200:
 *         description: Medical record updated successfully
 */
router.put('/:id', authorize(['DOCTOR']), medicalRecordController.updateMedicalRecord);

/**
 * @swagger
 * /api/v1/medical-records/{id}/finalize:
 *   patch:
 *     summary: Finalize medical record
 *     tags: [Medical Records]
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
 *         description: Medical record finalized successfully
 */
router.patch('/:id/finalize', authorize(['DOCTOR']), medicalRecordController.finalizeMedicalRecord);

/**
 * @swagger
 * /api/v1/medical-records/{id}:
 *   get:
 *     summary: Get specific medical record
 *     tags: [Medical Records]
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
 *         description: Medical record retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MedicalRecord'
 */
router.get('/:id', authorize(['DOCTOR', 'PATIENT']), medicalRecordController.getMedicalRecord);

/**
 * @swagger
 * /api/v1/medical-records/{id}/progress-notes:
 *   post:
 *     summary: Add progress note to medical record
 *     tags: [Medical Records]
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
 *             $ref: '#/components/schemas/ProgressNote'
 *     responses:
 *       201:
 *         description: Progress note added successfully
 */
router.post('/:id/progress-notes', authorize(['DOCTOR', 'NURSE']), 
  medicalRecordController.addProgressNote);

module.exports = router;