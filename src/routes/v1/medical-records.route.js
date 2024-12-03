// src/routes/v1/medical-records.route.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const medicalRecordController = require('../../controllers/medical-document.controller');

// Apply auth middleware
router.use(authenticate);

// Regular document operations
router.post('/documents', medicalRecordController.uploadDocument);
router.get('/documents', medicalRecordController.getDocuments);
router.get('/documents/:id', medicalRecordController.getDocumentById);
router.patch('/documents/:id', medicalRecordController.updateDocument);
router.delete('/documents/:id', medicalRecordController.deleteDocument);

// Bulk operations
router.post('/documents/bulk', medicalRecordController.bulkUpdateDocuments);

module.exports = router;