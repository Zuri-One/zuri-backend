const express = require('express');
const router = express.Router();
const prescriptionController = require('../../controllers/prescription.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

/**
 * @swagger
 * /api/v1/prescriptions:
 *   post:
 *     summary: Create a new prescription
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticate, prescriptionController.createPrescription);

/**
 * @swagger
 * /api/v1/prescriptions/{id}:
 *   get:
 *     summary: Get prescription by ID
 */
router.get('/:id', authenticate, prescriptionController.getPrescription);

/**
 * @swagger
 * /api/v1/prescriptions/patient/{patientId}:
 *   get:
 *     summary: Get all prescriptions for a patient
 */
router.get('/patient/:patientId', authenticate, prescriptionController.getPatientPrescriptions);

/**
 * @swagger
 * /api/v1/prescriptions/{id}/status:
 *   patch:
 *     summary: Update prescription status
 */
router.patch('/:id/status', authenticate, prescriptionController.updatePrescriptionStatus);

/**
 * @swagger
 * /api/v1/prescriptions/{id}/refill:
 *   post:
 *     summary: Refill a prescription
 */
router.post('/:id/refill', authenticate, prescriptionController.refillPrescription);

module.exports = router;