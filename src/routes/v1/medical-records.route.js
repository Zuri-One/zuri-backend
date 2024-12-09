// src/routes/v1/medical-records.route.js
const express = require('express');
const router = express.Router();
const medicalRecordController = require('../../controllers/medical-record.controller');
const consentController = require('../../controllers/consent.controller');
const { authenticate, authorize, hasPermission } = require('../../middleware/auth.middleware');
const medicalDocumentController = require('../../controllers/medical-document.controller');

// Apply auth middleware

/**
 * @swagger
 * components:
 *   schemas:
 *     Consent:
 *       type: object
 *       required:
 *         - medicalRecordId
 *         - patientId
 *         - consentType
 *         - description
 *         - consentGivenBy
 *         - signature
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         consentType:
 *           type: string
 *           enum: [TREATMENT, PROCEDURE, DATA_SHARING, RESEARCH, PHOTOGRAPHY, TEACHING]
 *         description:
 *           type: string
 *         consentGivenBy:
 *           type: string
 *           enum: [PATIENT, GUARDIAN, NEXT_OF_KIN]
 *         validFrom:
 *           type: string
 *           format: date-time
 *         validUntil:
 *           type: string
 *           format: date-time
 *         status:
 *           type: string
 *           enum: [ACTIVE, WITHDRAWN, EXPIRED]
 *         signature:
 *           type: string
 *
 *     MedicalDocument:
 *       type: object
 *       required:
 *         - patientId
 *         - category
 *         - documentType
 *         - file
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         category:
 *           type: string
 *           enum: [GENERAL, SCANS, PRESCRIPTIONS, LAB_RESULTS, INSURANCE, RECEIPTS, REPORTS, OTHER]
 *         documentType:
 *           type: string
 *         fileName:
 *           type: string
 *         fileUrl:
 *           type: string
 *         fileSize:
 *           type: integer
 *         contentType:
 *           type: string
 *         description:
 *           type: string
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         isArchived:
 *           type: boolean
 *           default: false
 *
 * @swagger
 * tags:
 *   name: Medical Records Management
 *   description: Medical records, consents, and document management
 */

/**
 * @swagger
 * /api/v1/medical-records/consent:
 *   post:
 *     summary: Create new consent record
 *     tags: [Medical Records Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Consent'
 *     responses:
 *       201:
 *         description: Consent created successfully
 *   get:
 *     summary: Get all consents
 *     tags: [Medical Records Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, WITHDRAWN, EXPIRED]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of consents retrieved successfully
 */
router.post('/consent',  
  consentController.createConsent);
router.get('/consent',  consentController.getConsents);

/**
 * @swagger
 * /api/v1/medical-records/consent/{id}:
 *   get:
 *     summary: Get consent by ID
 *     tags: [Medical Records Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Consent retrieved successfully
 *   put:
 *     summary: Update consent
 *     tags: [Medical Records Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Consent'
 *     responses:
 *       200:
 *         description: Consent updated successfully
 */
router.get('/consent/:id',  
  consentController.getConsentById);
router.put('/consent/:id',  
  consentController.updateConsent);

/**
 * @swagger
 * /api/v1/medical-records/consent/{id}/withdraw:
 *   post:
 *     summary: Withdraw consent
 *     tags: [Medical Records Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Consent withdrawn successfully
 */
router.post('/consent/:id/withdraw', 
  consentController.withdrawConsent);

/**
 * @swagger
 * /api/v1/medical-records/documents:
 *   post:
 *     summary: Upload medical document
 *     tags: [Medical Records Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - category
 *               - documentType
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               patientId:
 *                 type: string
 *                 format: uuid
 *               category:
 *                 type: string
 *               documentType:
 *                 type: string
 *               description:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Document uploaded successfully
 *   get:
 *     summary: Get all documents
 *     tags: [Medical Records Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: isArchived
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Documents retrieved successfully
 */
router.post('/documents', medicalDocumentController.uploadDocument);
router.get('/documents', medicalDocumentController.getDocuments);

/**
 * @swagger
 * /api/v1/medical-records/documents/bulk:
 *   post:
 *     summary: Bulk update documents
 *     tags: [Medical Records Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - documents
 *             properties:
 *               documents:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - id
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     tags:
 *                       type: array
 *                       items:
 *                         type: string
 *                     isArchived:
 *                       type: boolean
 *     responses:
 *       200:
 *         description: Documents updated successfully
 */
router.post('/documents/bulk', medicalDocumentController.bulkUpdateDocuments);

/**
 * @swagger
 * /api/v1/medical-records/documents/{id}:
 *   get:
 *     summary: Get document by ID
 *     tags: [Medical Records Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Document retrieved successfully
 *   patch:
 *     summary: Update document
 *     tags: [Medical Records Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MedicalDocument'
 *     responses:
 *       200:
 *         description: Document updated successfully
 *   delete:
 *     summary: Delete document
 *     tags: [Medical Records Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Document deleted successfully
 */
router.get('/documents/:id', medicalDocumentController.getDocumentById);
router.patch('/documents/:id', medicalDocumentController.updateDocument);
router.delete('/documents/:id', medicalDocumentController.deleteDocument);

module.exports = router;