// src/routes/v1/medical-records.route.js
const express = require('express');
const router = express.Router();
const medicalRecordController = require('../../controllers/medical-record.controller');
const consentController = require('../../controllers/consent.controller');
const { authenticate, authorize, hasPermission } = require('../../middleware/auth.middleware');
const medicalDocumentController = require('../../controllers/medical-document.controller');

// Apply auth middleware
router.use(authenticate);

router.post(
    '/',
    authorize(['DOCTOR', 'NURSE']),
    hasPermission(['create_medical_records']),
    medicalRecordController.createMedicalRecord
  );
  
  router.get(
    '/patient/:patientId',
    authorize(['DOCTOR', 'NURSE', 'PATIENT']),
    hasPermission(['view_medical_records']),
    medicalRecordController.getPatientRecords
  );
  
  router.get(
    '/:id',
    authorize(['DOCTOR', 'NURSE', 'PATIENT']),
    hasPermission(['view_medical_records']),
    medicalRecordController.getMedicalRecord
  );
  
  router.put(
    '/:id',
    authorize(['DOCTOR', 'NURSE']),
    hasPermission(['update_medical_records']),
    medicalRecordController.updateMedicalRecord
  );
  
  router.post(
    '/:id/finalize',
    authorize(['DOCTOR']),
    hasPermission(['finalize_medical_records']),
    medicalRecordController.finalizeMedicalRecord
  );
  
  router.post(
    '/:id/progress-notes',
    authorize(['DOCTOR', 'NURSE']),
    hasPermission(['add_progress_notes']),
    medicalRecordController.addProgressNote
  );
  
  // Consent Management Routes
  router.post(
    '/consent',
    authorize(['DOCTOR', 'NURSE']),
    hasPermission(['manage_consents']),
    consentController.createConsent
  );
  
  router.get(
    '/consent',
    authorize(['DOCTOR', 'NURSE', 'PATIENT']),
    consentController.getConsents
  );
  
  router.get(
    '/consent/:id',
    authorize(['DOCTOR', 'NURSE', 'PATIENT']),
    consentController.getConsentById
  );
  
  router.post(
    '/consent/:id/withdraw',
    authorize(['DOCTOR', 'NURSE', 'PATIENT']),
    consentController.withdrawConsent
  );
  
  router.get(
    '/consent/verify',
    authorize(['DOCTOR', 'NURSE']),
    consentController.verifyConsent
  );
  
  router.put(
    '/consent/:id',
    authorize(['DOCTOR', 'NURSE']),
    hasPermission(['manage_consents']),
    consentController.updateConsent
  );
  
  router.get(
    '/consent/history/:patientId',
    authorize(['DOCTOR', 'NURSE', 'PATIENT']),
    consentController.getConsentHistory
  );


// Regular document operations
router.post('/documents', medicalDocumentController.uploadDocument);
router.get('/documents', medicalDocumentController.getDocuments);
router.get('/documents/:id', medicalDocumentController.getDocumentById);
router.patch('/documents/:id', medicalDocumentController.updateDocument);
router.delete('/documents/:id', medicalDocumentController.deleteDocument);

// Bulk operations
router.post('/documents/bulk', medicalDocumentController.bulkUpdateDocuments);

module.exports = router;