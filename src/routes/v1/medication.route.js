// routes/v1/medication.route.js
const express = require('express');
const router = express.Router();
const medicationController = require('../../controllers/medication.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

// Base medication routes
router.get('/', authenticate, medicationController.getAllMedications);
router.get('/search', authenticate, medicationController.searchMedications);
router.get('/low-stock', authenticate, medicationController.getLowStockMedications);
router.get('/:id', authenticate, medicationController.getMedication);

// Protected routes that require pharmacy role
router.use(authenticate);
router.use(authorize('PHARMACY'));

router.post('/', medicationController.createMedication);
router.patch('/:id', medicationController.updateMedication);
router.patch('/:id/stock', medicationController.updateStock);

// // Prescription routes
// router.post('/prescriptions', authenticate, medicationController.createPrescription);
// router.get('/prescriptions/:id', authenticate, medicationController.getPrescription);
// router.get('/doctor/prescriptions', authenticate, medicationController.getDoctorPrescriptions);
// router.get('/patient/prescriptions', authenticate, medicationController.getPatientPrescriptions);
// router.patch('/prescriptions/:id', authenticate, medicationController.updatePrescription);

module.exports = router;