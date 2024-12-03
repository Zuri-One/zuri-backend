// src/routes/v1/medication.route.js
const express = require('express');
const router = express.Router();
const medicationController = require('../../controllers/medication.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

// Open route for viewing prescriptions
router.get(
  '/prescriptions/:id',  // Changed from /doctor/prescriptions/:id
  medicationController.getPrescription  // New controller method
);

// Protected routes
router.use(authenticate);

// Doctor routes
router.post(
  '/prescriptions',
  authorize(['doctor']),
  medicationController.createPrescription
);

router.get(
  '/doctor/prescriptions',
  authorize(['doctor']),
  medicationController.getDoctorPrescriptions
);

router.patch(
  '/prescriptions/:id',
  authorize(['doctor']),
  medicationController.updatePrescription
);

// Patient routes
router.get(
  '/patient/prescriptions',
  authorize(['patient']),
  medicationController.getPatientPrescriptions
);

module.exports = router;