const express = require('express');
const router = express.Router();
const labController = require('../../controllers/lab-queue.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

/**
 * @swagger
 * /api/v1/lab/queue:
 *   get:
 *     summary: Get lab department queue
 *     tags: [Laboratory]
 *     security:
 *       - bearerAuth: []
 */
router.get('/queue', 
  authenticate, 
  authorize(['LAB_TECHNICIAN']), 
  labController.getLabQueue
);

/**
 * @swagger
 * /api/v1/lab/stats:
 *   get:
 *     summary: Get lab department statistics
 *     tags: [Laboratory]
 *     security:
 *       - bearerAuth: []
 */
router.get('/stats', 
  authenticate, 
  authorize(['LAB_TECHNICIAN']), 
  labController.getLabStats
);

/**
 * @swagger
 * /api/v1/lab/test/{queueEntryId}/start:
 *   post:
 *     summary: Start a lab test
 *     tags: [Laboratory]
 *     security:
 *       - bearerAuth: []
 */
router.post('/test/:queueEntryId/start', 
  authenticate, 
  authorize(['LAB_TECHNICIAN']), 
  labController.startLabTest
);

/**
 * @swagger
 * /api/v1/lab/test/{queueEntryId}:
 *   put:
 *     summary: Update a lab test
 *     tags: [Laboratory]
 *     security:
 *       - bearerAuth: []
 */
router.put('/test/:queueEntryId', 
  authenticate, 
  authorize(['LAB_TECHNICIAN']), 
  labController.updateLabTest
);

module.exports = router;