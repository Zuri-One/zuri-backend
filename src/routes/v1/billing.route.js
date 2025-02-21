// routes/billing.routes.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const {
  addBillingItems,
  getCurrentBill,
  finalizePayment,
  getAvailablePackages,
  getAvailableItems
} = require('../../controllers/billing.controller');

// Base path: /api/v1/billing

// Get available packages and items - no auth needed
router.get('/packages', getAvailablePackages);
router.get('/items', getAvailableItems);

// Protected routes
router.use(authenticate); // Changed from protect to authenticate

// Get current bill and insurance info
router.get('/patient/:patientId/current', getCurrentBill);

// Add items to bill
router.post('/add-items', 
  authorize(['NURSE', 'LAB_TECHNICIAN', 'PHARMACIST']), // Added array syntax for roles
  addBillingItems
);

// Finalize payment (reception only)
router.post('/patient/:patientId/finalize',
  authorize(['RECEPTIONIST']), // Added array syntax for roles
  finalizePayment
);

module.exports = router;