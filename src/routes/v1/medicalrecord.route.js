// src/routes/v1/medical-record.routes.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const medicalRecordController = require('../../controllers/medical-record.controller');

// Protected routes - require authentication
router.use(authenticate);


router.post(
  '/',
  authorize(['doctor']),
  medicalRecordController.createMedicalRecord
);

router.get(
  '/patient/:patientId',
  authorize(['doctor', 'patient', 'admin']),
  medicalRecordController.getPatientMedicalRecords
);

router.put(
  '/:id',
  authorize(['doctor']),
  medicalRecordController.updateMedicalRecord
);

router.patch(
  '/:id/finalize',
  authorize(['doctor']),
  medicalRecordController.finalizeMedicalRecord
);

// Routes for both doctors and patients
router.get(
  '/',
  authorize(['doctor', 'patient']),
  medicalRecordController.getMedicalRecords
);

router.get(
  '/:id',
  authorize(['doctor', 'patient']),
  medicalRecordController.getMedicalRecordById
);

module.exports = router;