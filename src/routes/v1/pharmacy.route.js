// routes/v1/pharmacy.route.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize, hasPermission } = require('../../middleware/auth.middleware');
const pharmacyController = require('../../controllers/pharmacy.controller');

// Apply authentication to all routes
router.use(authenticate);

// ====================================
// SUPPLIER ROUTES
// ====================================

/**
 * @swagger
 * /api/v1/pharmacy/suppliers:
 *   get:
 *     summary: Get all suppliers
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Suppliers retrieved successfully
 */
router.get(
  '/suppliers',
  authorize(['PHARMACIST', 'ADMIN']),
  // hasPermission(['view_pharmacy_inventory']),
  pharmacyController.getSuppliers
);


router.get(
  '/dispense/pending',
  authorize(['PHARMACIST']),
  // hasPermission(['dispense_medication']),
  pharmacyController.getPendingDispenses
);

// For viewing all pending prescriptions
router.get(
  '/pending',
  authorize(['PHARMACIST']),
  pharmacyController.getPendingPrescriptions
);

// For viewing a specific dispensed prescription
router.get(
  '/prescriptions/dispensed/:id',
  authorize(['PHARMACIST']),
  pharmacyController.getDispensedPrescriptionDetails
);



 
/**
 * @swagger
 * /api/v1/pharmacy/dispense/prescription:
 *   post:
 *     summary: Dispense medications for a prescription
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prescriptionId
 *               - medicationDispenses
 *             properties:
 *               prescriptionId:
 *                 type: string
 *                 format: uuid
 *               medicationDispenses:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     medicationId:
 *                       type: string
 *                     patientId:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *                     dosage:
 *                       type: string
 *                     frequency:
 *                       type: string
 *                     duration:
 *                       type: string
 *     responses:
 *       200:
 *         description: Medications dispensed successfully
 */
router.post(
  '/dispense/prescription',
  authorize(['PHARMACIST']),
  // hasPermission(['dispense_medication']),
  pharmacyController.manualDispensePrescription
);

/**
 * @swagger
 * /api/v1/pharmacy/suppliers/{id}:
 *   get:
 *     summary: Get supplier by ID
 *     tags: [Pharmacy]
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
 *         description: Supplier retrieved successfully
 */
router.get(
  '/suppliers/:id',
  authorize(['PHARMACIST', 'ADMIN']),
  // hasPermission(['view_pharmacy_inventory']),
  pharmacyController.getSupplierById
);

/**
 * @swagger
 * /api/v1/pharmacy/suppliers:
 *   post:
 *     summary: Add new supplier
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               supplierId:
 *                 type: string
 *               contactPerson:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               email:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       201:
 *         description: Supplier added successfully
 */
router.post(
  '/suppliers',
  authorize(['PHARMACIST', 'ADMIN']),
  // hasPermission(['manage_pharmacy_inventory']),
  pharmacyController.addSupplier
);

/**
 * @swagger
 * /api/v1/pharmacy/suppliers/{id}:
 *   put:
 *     summary: Update supplier
 *     tags: [Pharmacy]
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
 *             properties:
 *               name:
 *                 type: string
 *               supplierId:
 *                 type: string
 *               contactPerson:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               email:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       200:
 *         description: Supplier updated successfully
 */
router.put(
  '/suppliers/:id',
  authorize(['PHARMACIST', 'ADMIN']),
  // hasPermission(['manage_pharmacy_inventory']),
  pharmacyController.updateSupplier
);

// ====================================
// INVENTORY RECEIPT ROUTES
// ====================================

/**
 * @swagger
 * /api/v1/pharmacy/inventory-receipts:
 *   post:
 *     summary: Add new inventory receipt with medications
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - supplierId
 *               - medications
 *             properties:
 *               supplierId:
 *                 type: string
 *                 format: uuid
 *               invoiceNumber:
 *                 type: string
 *               deliveryDate:
 *                 type: string
 *                 format: date
 *               deliveryMethod:
 *                 type: string
 *               notes:
 *                 type: string
 *               medications:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Inventory receipt created successfully
 */
router.post(
  '/inventory-receipts',
  authorize(['PHARMACIST', 'ADMIN']),
  // hasPermission(['manage_pharmacy_inventory']),
  pharmacyController.addInventoryReceipt
);

/**
 * @swagger
 * /api/v1/pharmacy/inventory-receipts:
 *   get:
 *     summary: Get all inventory receipts
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: supplierId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Inventory receipts retrieved successfully
 */
router.get(
  '/inventory-receipts',
  authorize(['PHARMACIST', 'ADMIN']),
  // hasPermission(['view_pharmacy_inventory']),
  pharmacyController.getInventoryReceipts
);

/**
 * @swagger
 * /api/v1/pharmacy/inventory-receipts/{id}:
 *   get:
 *     summary: Get inventory receipt by ID
 *     tags: [Pharmacy]
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
 *         description: Inventory receipt retrieved successfully
 */
router.get(
  '/inventory-receipts/:id',
  authorize(['PHARMACIST', 'ADMIN']),
  // hasPermission(['view_pharmacy_inventory']),
  pharmacyController.getInventoryReceiptById
);

// ====================================
// STOCK TRANSFER ROUTES
// ====================================

/**
 * @swagger
 * /api/v1/pharmacy/stock/transfer:
 *   post:
 *     summary: Transfer stock between locations
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - medicationId
 *               - quantity
 *               - fromLocation
 *               - toLocation
 *             properties:
 *               medicationId:
 *                 type: string
 *                 format: uuid
 *               quantity:
 *                 type: integer
 *               fromLocation:
 *                 type: string
 *                 enum: [STORE, MEDICAL_CAMP, PHARMACY]
 *               toLocation:
 *                 type: string
 *                 enum: [STORE, MEDICAL_CAMP, PHARMACY]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Stock transferred successfully
 */
router.post(
  '/stock/transfer',
  authorize(['PHARMACIST', 'ADMIN']),
  // hasPermission(['manage_pharmacy_inventory']),
  pharmacyController.transferStock
);

// ====================================
// STOCK MOVEMENT ROUTES
// ====================================

/**
 * @swagger
 * /api/v1/pharmacy/stock/movements:
 *   get:
 *     summary: Get stock movement history
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: medicationId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Stock movements retrieved successfully
 */
router.get(
  '/stock/movements',
  authorize(['PHARMACIST', 'ADMIN']),
  // hasPermission(['view_pharmacy_inventory']),
  pharmacyController.getStockMovements
);

// ====================================
// MEDICATION ROUTES
// ====================================

/**
 * @swagger
 * /api/v1/pharmacy/inventory:
 *   post:
 *     summary: Add new medication to inventory
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - batchNumber
 *               - category
 *               - type
 *               - strength
 *               - expiryDate
 *             properties:
 *               name:
 *                 type: string
 *               genericName:
 *                 type: string
 *               batchNumber:
 *                 type: string
 *               category:
 *                 type: string
 *               type:
 *                 type: string
 *               strength:
 *                 type: string
 *               manufacturer:
 *                 type: string
 *               currentStock:
 *                 type: integer
 *               minStockLevel:
 *                 type: integer
 *               maxStockLevel:
 *                 type: integer
 *               supplierId:
 *                 type: string
 *                 format: uuid
 *               markedPrice:
 *                 type: number
 *               markupPercentage:
 *                 type: number
 *               storageLocation:
 *                 type: string
 *                 enum: [STORE, MEDICAL_CAMP, PHARMACY]
 *               expiryDate:
 *                 type: string
 *                 format: date
 *               imageUrl:
 *                 type: string
 *               prescriptionRequired:
 *                 type: boolean
 *               location:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Medication added successfully
 */
router.post(
  '/inventory',
  authorize(['PHARMACIST', 'ADMIN']),
  // hasPermission(['manage_pharmacy_inventory']),
  pharmacyController.addMedication
);

/**
 * @swagger
 * /api/v1/pharmacy/inventory:
 *   get:
 *     summary: Get all medications in inventory
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: supplierId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: storageLocation
 *         schema:
 *           type: string
 *           enum: [STORE, MEDICAL_CAMP, PHARMACY]
 *       - in: query
 *         name: lowStock
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: expiringSoon
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Inventory list retrieved successfully
 */
router.get(
  '/inventory',
  authorize(['PHARMACIST', 'DOCTOR', 'NURSE', 'ADMIN']),
  // hasPermission(['view_pharmacy_inventory']),
  pharmacyController.getInventory
);

/**
 * @swagger
 * /api/v1/pharmacy/inventory/{id}:
 *   get:
 *     summary: Get medication by ID
 *     tags: [Pharmacy]
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
 *         description: Medication details retrieved successfully
 */
router.get(
  '/inventory/:id',
  authorize(['PHARMACIST', 'DOCTOR', 'NURSE', 'ADMIN']),
  // hasPermission(['view_pharmacy_inventory']),
  pharmacyController.getMedicationById
);

/**
 * @swagger
 * /api/v1/pharmacy/inventory/{id}:
 *   put:
 *     summary: Update medication details
 *     tags: [Pharmacy]
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
 *     responses:
 *       200:
 *         description: Medication updated successfully
 */
router.put(
  '/inventory/:id',
  authorize(['PHARMACIST', 'ADMIN']),
  // hasPermission(['manage_pharmacy_inventory']),
  pharmacyController.updateMedication
);

/**
 * @swagger
 * /api/v1/pharmacy/stock/adjustment/{id}:
 *   post:
 *     summary: Adjust stock level for a medication
 *     tags: [Pharmacy]
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
 *               - quantity
 *               - type
 *             properties:
 *               quantity:
 *                 type: integer
 *               type:
 *                 type: string
 *                 enum: [RECEIVED, DISPENSED, RETURNED, EXPIRED, DAMAGED, ADJUSTED]
 *               reason:
 *                 type: string
 *               batchNumber:
 *                 type: string
 *               expiryDate:
 *                 type: string
 *                 format: date
 *               markedPrice:
 *                 type: number
 *               markupPercentage:
 *                 type: number
 *               storageLocation:
 *                 type: string
 *                 enum: [STORE, MEDICAL_CAMP, PHARMACY]
 *     responses:
 *       200:
 *         description: Stock adjusted successfully
 */
router.post(
  '/stock/adjustment/:id',
  authorize(['PHARMACIST', 'ADMIN']),
  // hasPermission(['manage_pharmacy_inventory']),
  pharmacyController.updateStock
);

/**
 * @swagger
 * /api/v1/pharmacy/stock/low:
 *   get:
 *     summary: Get medications with low stock levels
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Low stock medications retrieved successfully
 */
router.get(
  '/stock/low',
  authorize(['PHARMACIST', 'ADMIN']),
  // hasPermission(['view_pharmacy_inventory']),
  pharmacyController.getLowStockItems
);

/**
 * @swagger
 * /api/v1/pharmacy/stats:
 *   get:
 *     summary: Get pharmacy statistics
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get(
  '/stats',
  authorize(['PHARMACIST', 'ADMIN']),
  // hasPermission(['view_pharmacy_reports']),
  pharmacyController.getPharmacyStats
);

module.exports = router;