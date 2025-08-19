const express = require('express');
const router = express.Router();
const CCPController = require('../../controllers/ccp.controller');
const CCPImportController = require('../../controllers/ccpImport.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

// Create an instance of the controller
const ccpController = new CCPController();

// ========== EXTERNAL API ROUTES (CCP Token Authentication) ==========

// GET /api/v1/ccp/api/patients - External API: Paginated list of CCP patients
router.get('/api/patients', CCPController.ccpTokenAuth, CCPController.getPatients);

// GET /api/v1/ccp/api/patients/:id - External API: Get specific CCP patient
router.get('/api/patients/:id', CCPController.ccpTokenAuth, CCPController.getPatient);

// PUT /api/v1/ccp/api/patients/:id - External API: Update CCP patient
router.put('/api/patients/:id', CCPController.ccpTokenAuth, CCPController.updatePatient);

// GET /api/v1/ccp/api/followups - External API: Get CCP followups with filters
router.get('/api/followups', CCPController.ccpTokenAuth, CCPController.getFollowups);

// PUT /api/v1/ccp/api/followups/:id - External API: Update CCP followup
router.put('/api/followups/:id', CCPController.ccpTokenAuth, CCPController.updateFollowup);

// POST /api/v1/ccp/api/followups - External API: Create new followup
router.post('/api/followups', CCPController.ccpTokenAuth, CCPController.createFollowup);

// GET /api/v1/ccp/api/summary/insurers - External API: Get insurer summary
router.get('/api/summary/insurers', CCPController.ccpTokenAuth, CCPController.getInsurerSummary);

// GET /api/v1/ccp/api/summary/doctors - External API: Get doctor summary
router.get('/api/summary/doctors', CCPController.ccpTokenAuth, CCPController.getDoctorSummary);

// GET /api/v1/ccp/api/summary/monthly - External API: Get monthly followup summary
router.get('/api/summary/monthly', CCPController.ccpTokenAuth, CCPController.getMonthlySummary);

// ========== INTERNAL ROUTES (JWT Authentication) ==========

// GET /api/v1/ccp/patients - Internal: Get all CCP enrolled patients
router.get('/patients', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE', 'ADMIN', 'CCP_COORDINATOR']), 
  ccpController.getCCPPatientsList.bind(ccpController)
);

// GET /api/v1/ccp/patient/:patientId/profile - Internal: Get comprehensive CCP patient profile
router.get('/patient/:patientId/profile', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE', 'ADMIN', 'CCP_COORDINATOR']), 
  ccpController.getCCPPatientProfile.bind(ccpController)
);



// POST /api/v1/ccp/patient/:patientId/followups - Internal: Create CCP followup record
router.post('/patient/:patientId/followups', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE', 'ADMIN', 'CCP_COORDINATOR']), 
  ccpController.createCCPFollowup.bind(ccpController)
);

// GET /api/v1/ccp/patient/:patientId/followups - Internal: Get CCP followup records
router.get('/patient/:patientId/followups', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE', 'ADMIN', 'CCP_COORDINATOR']), 
  ccpController.getCCPFollowups.bind(ccpController)
);

// PUT /api/v1/ccp/followups/:followupId - Internal: Update CCP followup record
router.put('/followups/:followupId', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE', 'ADMIN', 'CCP_COORDINATOR']), 
  ccpController.updateCCPFollowup.bind(ccpController)
);

// POST /api/v1/ccp/followups/:followupId/complete - Internal: Complete CCP followup
router.post('/followups/:followupId/complete', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE', 'ADMIN', 'CCP_COORDINATOR']), 
  ccpController.completeCCPFollowup.bind(ccpController)
);

// GET /api/v1/ccp/followups/dashboard - Internal: Get CCP followup dashboard
router.get('/followups/dashboard', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE', 'ADMIN', 'CCP_COORDINATOR']), 
  ccpController.getCCPFollowupDashboard.bind(ccpController)
);

// GET /api/v1/ccp/followups/overdue - Internal: Get overdue CCP followups
router.get('/followups/overdue', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE', 'ADMIN', 'CCP_COORDINATOR']), 
  ccpController.getOverdueCCPFollowups.bind(ccpController)
);



// Import routes (existing functionality)
router.post('/import', CCPImportController.importCCPData);

module.exports = router;