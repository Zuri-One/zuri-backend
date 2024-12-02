// routes/v1/pharmacy.route.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize, hasPermission } = require('../../middleware/auth.middleware');
const pharmacyController = require('../../controllers/pharmacy.controller');

// Apply authentication to all routes
router.use(authenticate);

// Inventory Management Routes
router.post(
  '/inventory',
  authorize(['pharmacist', 'admin']),
  hasPermission(['manage_pharmacy_inventory']),
  pharmacyController.addMedication
);

router.get(
  '/inventory',
  authorize(['pharmacist', 'doctor', 'nurse']),
  hasPermission(['view_pharmacy_inventory']),
  pharmacyController.getInventory
);

router.get(
  '/inventory/:id',
  authorize(['pharmacist', 'doctor', 'nurse']),
  hasPermission(['view_pharmacy_inventory']),
  pharmacyController.getMedicationById
);

router.put(
  '/inventory/:id',
  authorize(['pharmacist']),
  hasPermission(['manage_pharmacy_inventory']),
  pharmacyController.updateMedication
);

// Stock Management Routes
router.post(
  '/stock/adjustment/:id',
  authorize(['pharmacist']),
  hasPermission(['manage_pharmacy_inventory']),
  pharmacyController.updateStock
);

router.get(
  '/stock/low',
  authorize(['pharmacist', 'admin']),
  hasPermission(['view_pharmacy_inventory']),
  pharmacyController.getLowStockItems
);

router.get(
  '/stock/expiring',
  authorize(['pharmacist', 'admin']),
  hasPermission(['view_pharmacy_inventory']),
  pharmacyController.getExpiringItems
);

// Dispensing Routes
router.post(
  '/dispense',
  authorize(['pharmacist']),
  hasPermission(['dispense_medication']),
  pharmacyController.dispenseMedication
);

router.get(
  '/dispense/history',
  authorize(['pharmacist', 'admin']),
  hasPermission(['view_dispensing_history']),
  pharmacyController.getDispenseHistory
);

router.get(
  '/dispense/:id',
  authorize(['pharmacist', 'doctor']),
  hasPermission(['view_dispensing_history']),
  pharmacyController.getDispenseById
);

// Lab Integration Routes
router.get(
  '/lab-prescriptions',
  authorize(['pharmacist']),
  hasPermission(['view_lab_results']),
  pharmacyController.getLabBasedPrescriptions
);

// Report Routes
router.get(
  '/reports/inventory',
  authorize(['pharmacist', 'admin']),
  hasPermission(['view_pharmacy_reports']),
  pharmacyController.getInventoryReport
);

router.get(
  '/reports/dispensing',
  authorize(['pharmacist', 'admin']),
  hasPermission(['view_pharmacy_reports']),
  pharmacyController.getDispensingReport
);

module.exports = router;