// routes/v1/medical-record.route.js
const express = require('express');
const router = express.Router();
const medicalRecordController = require('../../controllers/medical-record.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

router.post('/', 
  authenticate, 
  authorize(['DOCTOR']), 
  medicalRecordController.createMedicalRecord
);

router.get('/patient/:patientId', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE']), 
  medicalRecordController.getPatientMedicalHistory
);

router.get('/patient/:patientId', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE']), 
  medicalRecordController.getPatientMedicalHistory
);

module.exports = router;