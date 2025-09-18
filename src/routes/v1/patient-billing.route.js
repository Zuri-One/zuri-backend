// routes/v1/patient-billing.route.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const patientBillingController = require('../../controllers/patient-billing.controller');

// Apply authentication to all routes
router.use(authenticate);

// Patient search
router.get(
  '/patients/search',
  authorize(['PHARMACIST', 'RECEPTIONIST', 'ADMIN']),
  patientBillingController.searchPatients
);

// Medication search and management
router.get(
  '/medications/search',
  authorize(['PHARMACIST', 'RECEPTIONIST', 'ADMIN']),
  patientBillingController.searchMedications
);

router.get(
  '/medications/:id',
  authorize(['PHARMACIST', 'RECEPTIONIST', 'ADMIN']),
  patientBillingController.getMedicationById
);

router.put(
  '/medications/:id/price',
  authorize(['PHARMACIST', 'RECEPTIONIST', 'ADMIN']),
  patientBillingController.updateMedicationPrice
);

// Add or update medication (allow Pharmacist, Receptionist, Doctor, Lab Technician, Admin)
router.post(
  '/medications',
  authorize(['PHARMACIST', 'RECEPTIONIST', 'DOCTOR', 'LAB_TECHNICIAN', 'ADMIN']),
  patientBillingController.addOrUpdateMedication
);

// Pharmacy billing
router.post(
  '/bills',
  authorize(['PHARMACIST', 'RECEPTIONIST', 'ADMIN']),
  patientBillingController.createPharmacyBill
);

router.get(
  '/bills',
  authorize(['PHARMACIST', 'RECEPTIONIST', 'ADMIN']),
  patientBillingController.getPharmacyBills
);

// Get all bills for a specific patient
router.get(
  '/patients/:patientId/bills',
  authorize(['PHARMACIST', 'RECEPTIONIST', 'ADMIN']),
  patientBillingController.getPatientBills
);

router.get(
  '/bills/:id',
  authorize(['PHARMACIST', 'RECEPTIONIST', 'ADMIN']),
  patientBillingController.getBillDetails
);

router.put(
  '/bills/:id/status',
  authorize(['PHARMACIST', 'RECEPTIONIST', 'ADMIN']),
  patientBillingController.updateBillStatus
);

module.exports = router;