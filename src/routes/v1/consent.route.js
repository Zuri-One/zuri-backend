const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const consentController = require('../../controllers/consent.controller');

// Base consent routes
router.post('/', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE']), 
  consentController.createConsent
);

router.get('/', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE', 'PATIENT']), 
  consentController.getConsents
);

router.get('/:id', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE', 'PATIENT']), 
  consentController.getConsentById
);

router.post('/:id/withdraw', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE', 'PATIENT']), 
  consentController.withdrawConsent
);

router.get('/verify', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE']), 
  consentController.verifyConsent
);

router.put('/:id', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE']), 
  consentController.updateConsent
);

router.get('/history/:patientId', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE', 'PATIENT']), 
  consentController.getConsentHistory
);

// Records access routes
router.post('/request-access', 
  authenticate, 
  authorize(['DOCTOR']), 
  consentController.requestAccess
);

router.get('/pending-requests', 
  authenticate, 
  authorize(['PATIENT']), 
  consentController.getPendingRequests
);

router.post('/:id/response', 
  authenticate, 
  authorize(['PATIENT']), 
  consentController.handleAccessResponse
);

module.exports = router;