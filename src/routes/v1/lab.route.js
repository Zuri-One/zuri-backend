// src/routes/v1/lab.route.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const labTestController = require('../../controllers/lab-test.controller');

// Protected routes
router.use(authenticate);

// Routes for doctors
router.post(
  '/tests',
  // authorize(['doctor, lab_technician']),
  labTestController.createLabTest
);

router.get(
  '/tests',
  // authorize(['doctor', 'lab_technician']),
  labTestController.getLabTests
);

router.get(
  '/tests/:id',
  // authorize(['doctor', 'lab_technician']),
  labTestController.getLabTestById
);

// Routes for lab technicians
router.get(
  '/pending-tests',
  // authorize(['lab_technician']),
  labTestController.getPendingTests
);

router.patch(
  '/tests/:id/status',
  // authorize(['lab_technician']),
  labTestController.updateTestStatus
);

router.post(
  '/tests/:id/critical',
  // authorize(['lab_technician']),
  labTestController.markCriticalValue
);

// Base route check
router.get('/', (req, res) => {
  res.json({ message: 'Lab routes working' });
});

module.exports = router;