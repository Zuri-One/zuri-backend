// routes/v1/triage.route.js
const express = require('express');
const router = express.Router();
const triageController = require('../../controllers/triage.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

// Apply authentication to all routes
router.use(authenticate);


router.get('/stats',  triageController.getTriageStats);
// Create new triage assessment
router.post(
  '/',
  // authorize(['NURSE', 'DOCTOR', 'EMERGENCY_PHYSICIAN']),
  triageController.createTriageAssessment
);

// Get all active triage cases
router.get(
  '/active',
  // authorize(['NURSE', 'DOCTOR', 'EMERGENCY_PHYSICIAN']),
  triageController.getActiveTriages
);

// Get specific triage assessment
router.get(
  '/:id',
  // authorize(['NURSE', 'DOCTOR', 'EMERGENCY_PHYSICIAN']),
  triageController.getTriageById
);

// Update triage assessment
router.put(
  '/:id',
  // authorize(['NURSE', 'DOCTOR', 'EMERGENCY_PHYSICIAN']),
  triageController.updateTriageAssessment
);



// Reassess patient
router.post(
  '/:id/reassess',
  // authorize(['NURSE', 'DOCTOR', 'EMERGENCY_PHYSICIAN']),
  triageController.reassessPatient
);

module.exports = router;