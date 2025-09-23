// routes/billing.routes.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const {
  addBillingItems,
  getCurrentBill,
  finalizePayment,
  getAvailablePackages,
  getAvailableItems,
  getBillingHistory,
  getBillingDetails,
  generateBillingReport,
  getReceipt,
} = require('../../controllers/billing.controller');

const {
  initializePaystack,
  verifyPaystack,
  paystackWebhook,
} = require('../../controllers/paystack.controller');

// Base path: /api/v1/billing

// Paystack webhook (no auth needed)
router.post('/paystack-webhook', paystackWebhook);

// Get available packages and items - no auth needed
router.get('/packages', getAvailablePackages);
router.get('/items', getAvailableItems);

// Protected routes
router.use(authenticate); // Changed from protect to authenticate

// Get current bill and insurance info
router.get('/patient/:patientId/current', getCurrentBill);

// Add items to bill
router.post(
  '/add-items',
  authorize(['NURSE', 'LAB_TECHNICIAN', 'PHARMACIST', 'BILLING_STAFF']), // Added array syntax for roles
  addBillingItems
);

// Finalize payment (reception only)
router.post(
  '/patient/:patientId/finalize',
  authorize(['RECEPTIONIST', 'BILLING_STAFF']), // Added array syntax for roles
  finalizePayment
);

// Get or regenerate receipt
router.get(
  '/receipt/:billingId',
  authorize(['RECEPTIONIST', 'ADMIN', 'BILLING_STAFF']),
  getReceipt
);

// Billing history and reports
router.get('/history', getBillingHistory);
router.get('/details/:id', getBillingDetails);
router.get(
  '/report',
  authorize(['ADMIN', 'FINANCE', 'BILLING_STAFF']),
  generateBillingReport
);

// Paystack integration
router.post(
  '/initialize-paystack',
  authorize(['RECEPTIONIST']),
  initializePaystack
);

router.get(
  '/verify-paystack/:reference',
  authorize(['RECEPTIONIST']),
  verifyPaystack
);

module.exports = router;
