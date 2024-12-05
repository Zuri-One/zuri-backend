// src/routes/v1/medical-record.route.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const medicalRecordController = require('../../controllers/medical-record.controller');

// Apply authentication to all routes
router.use(authenticate);

// Create new medical record
router.post(
  '/',
  authorize(['DOCTOR']),
  medicalRecordController.createMedicalRecord
);

// Get patient's records
router.get(
  '/patient/:patientId',
  authorize(['DOCTOR', 'PATIENT', 'ADMIN']),
  medicalRecordController.getPatientRecords  // Changed from getPatientMedicalRecords
);

// Update medical record
router.put(
  '/:id',
  authorize(['DOCTOR']),
  medicalRecordController.updateMedicalRecord
);

// Finalize medical record
router.patch(
  '/:id/finalize',
  authorize(['DOCTOR']),
  medicalRecordController.finalizeMedicalRecord
);

// Get specific medical record
router.get(
  '/:id',
  authorize(['DOCTOR', 'PATIENT']),
  medicalRecordController.getMedicalRecord  // Changed from getMedicalRecordById
);

// Add progress note to medical record
router.post(
  '/:id/progress-notes',
  authorize(['DOCTOR', 'NURSE']),
  medicalRecordController.addProgressNote
);

module.exports = router;