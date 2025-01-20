// routes/v1/examination.route.js
const express = require('express');
const router = express.Router();
const examinationController = require('../../controllers/examination.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

// Place static routes BEFORE parameterized routes
// Get available procedures
router.get('/procedures/available', 
  authenticate, 
  examinationController.getAvailableProcedures
);

// Get body systems for systemic examination
router.get('/body-systems', 
  authenticate, 
  examinationController.getBodySystems
);

// Get all examinations for a patient
router.get('/patient/:patientId', 
  authenticate, 
  examinationController.getPatientExaminations
);

// Create new examination record
router.post('/', 
  authenticate, 
  authorize(['NURSE', 'DOCTOR']), 
  examinationController.createExamination
);

// Get specific examination (place parameterized routes last)
router.get('/:id', 
  authenticate, 
  examinationController.getExamination
);

module.exports = router;