// routes/v1/consultation-queue.route.js
const express = require('express');
const router = express.Router();
const consultationQueueController = require('../../controllers/consultation-queue.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

// Apply authentication to all routes
router.use(authenticate);

// Create new queue entry
router.post('/', consultationQueueController.createConsultationQueue);
// router.post('/', authenticate, consultationQueueController.createConsultationQueue);

// Get department queue
router.get('/department/:departmentId', consultationQueueController.getDepartmentQueue);

// Get doctor's queue
router.get('/doctor/:doctorId', consultationQueueController.getDoctorQueue);

// Update queue status
router.patch('/:id/status', consultationQueueController.updateQueueStatus);


module.exports = router;