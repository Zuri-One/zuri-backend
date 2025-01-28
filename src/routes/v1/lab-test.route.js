const express = require('express');
const router = express.Router();
const labTestController = require('../../controllers/lab-test.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

// Base route: /lab-tests

/**
 * @swagger
 * /api/v1/lab-tests:
 *   post:
 *     summary: Create a new lab test request
 */
router.post('/', authenticate, labTestController.createLabTest);

/**
 * @swagger
 * /api/v1/lab-tests/pending:
 *   get:
 *     summary: Get all pending lab tests
 */
router.get('/pending', authenticate, labTestController.getPendingTests);

/**
 * @swagger
 * /api/v1/lab-tests:
 *   get:
 *     summary: Get all lab tests with filters
 */
router.get('/', authenticate, labTestController.getLabTests);

/**
 * @swagger
 * /api/v1/lab-tests/{id}:
 *   get:
 *     summary: Get a specific lab test by ID
 */
router.get('/:id', authenticate, labTestController.getLabTestById);

/**
 * @swagger
 * /api/v1/lab-tests/{id}/status:
 *   patch:
 *     summary: Update lab test status
 */
router.patch('/:id/status', authenticate, labTestController.updateTestStatus);

/**
 * @swagger
 * /api/v1/lab-tests/{id}/critical:
 *   post:
 *     summary: Mark a lab test as critical
 */
router.post('/:id/critical', authenticate, labTestController.markCriticalValue);

module.exports = router;