// src/routes/v1/queue.route.js
const express = require('express');
const router = express.Router();
const queueController = require('../../controllers/queue.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');


// Add this logging middleware function at the top of the file
const logRequest = (req, res, next) => {
  console.log(`=== ${req.method} ${req.path} ===`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('Params:', req.params);
  console.log('Query:', req.query);
  next();
};

// Update the consultation route
router.post('/consultation/:queueId', 
  authenticate, 
  authorize(['DOCTOR']),
  logRequest,  // Add this logging middleware
  queueController.submitConsultation
);


/**
 * @swagger
 * /api/v1/queue/add:
 *   post:
 *     summary: Add patient to department queue
 *     tags: [Queue Management]
 *     security:
 *       - bearerAuth: []
 */
router.post('/add', 
  authenticate, 
  authorize(['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']), 
  queueController.addToQueue
);

/**
 * @swagger
 * /api/v1/queue/patient/{patientId}/history:
 *   get:
 *     summary: Get patient's queue history across all departments
 *     tags: [Queue Management]
 *     security:
 *       - bearerAuth: []
 */
router.get('/patient/:patientId/history', 
    authenticate, 
    authorize(['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']), 
    queueController.getPatientQueueHistory
  );



  router.get('/doctor-queue', 
    authenticate, 
    authorize(['DOCTOR', 'LAB_TECHNICIAN']), 
    queueController.getDoctorDepartmentQueue
  );


  router.get('/lab-queue', 
    authenticate, 
    authorize(['LAB_TECHNICIAN']), 
    queueController.getLabQueue
  );


  router.post('/consultation/:queueId', 
    authenticate, 
    authorize(['DOCTOR']), 
    queueController.submitConsultation
  );
  
/**
 * @swagger
 * /api/v1/queue/department/{departmentId}:
 *   get:
 *     summary: Get department queue
 *     tags: [Queue Management]
 *     security:
 *       - bearerAuth: []
 */
router.get('/department/:departmentId', 
  authenticate, 
  authorize(['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PHARMACIST']), 
  queueController.getDepartmentQueue
);

/**
 * @swagger
 * /api/v1/queue/{queueId}/status:
 *   put:
 *     summary: Update queue entry status
 *     tags: [Queue Management]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:queueId/status', 
  authenticate, 
  authorize(['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'LAB_TECHNICIAN']), 
  queueController.updateQueueStatus
);

/**
 * @swagger
 * /api/v1/queue/{queueId}/assign:
 *   put:
 *     summary: Assign doctor to queue entry
 *     tags: [Queue Management]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:queueId/assign', 
  authenticate, 
  authorize(['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']), 
  queueController.assignDoctor
);

/**
 * @swagger
 * /api/v1/queue/{queueId}/transfer:
 *   post:
 *     summary: Transfer patient to another department
 *     tags: [Queue Management]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:queueId/transfer', 
  authenticate, 
  authorize(['ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE']), 
  queueController.transferToAnotherDepartment
);

module.exports = router;