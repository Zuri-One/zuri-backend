const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const billingController = require('../../controllers/billing.controller');

router.post('/bills', authenticate, billingController.createBill);
router.post('/initialize', authenticate, billingController.initializePayment);
router.get('/verify/:reference', authenticate, billingController.verifyPayment);
router.get('/bills', authenticate, billingController.getBills);
router.get('/bills/:id', authenticate, billingController.getBill);
router.put('/bills/:id', authenticate, billingController.updateBill);
router.post('/bills/:id/cancel', authenticate, billingController.cancelBill);

module.exports = router;