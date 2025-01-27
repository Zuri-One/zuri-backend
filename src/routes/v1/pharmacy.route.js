// routes/v1/pharmacy.route.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize, hasPermission } = require('../../middleware/auth.middleware');
const pharmacyController = require('../../controllers/pharmacy.controller');

/**
* @swagger
* components:
*   schemas:
*     Medication:
*       type: object
*       required:
*         - name
*         - category
*         - type
*         - strength
*         - currentStock
*         - unitPrice
*       properties:
*         id:
*           type: string
*           format: uuid
*         name:
*           type: string
*         genericName:
*           type: string
*         category:
*           type: string
*           enum: [ANTIBIOTIC, ANALGESIC, ANTIVIRAL, ANTIHISTAMINE, ANTIHYPERTENSIVE, ANTIDIABETIC, PSYCHIATRIC, CARDIAC, RESPIRATORY, SUPPLEMENTS, OTHER]
*         type:
*           type: string
*           enum: [TABLET, CAPSULE, SYRUP, INJECTION, CREAM, OINTMENT, DROPS, INHALER, POWDER, OTHER]
*         strength:
*           type: string
*         currentStock:
*           type: integer
*         minStockLevel:
*           type: integer
*         maxStockLevel:
*           type: integer
*         unitPrice:
*           type: number
*         expiryDate:
*           type: string
*           format: date
*     StockMovement:
*       type: object
*       properties:
*         medicationId:
*           type: string
*           format: uuid
*         type:
*           type: string
*           enum: [RECEIVED, DISPENSED, RETURNED, EXPIRED, DAMAGED, ADJUSTED]
*         quantity:
*           type: integer
*         reason:
*           type: string
*     MedicationDispense:
*       type: object
*       required:
*         - medicationId
*         - patientId
*         - quantity
*         - dosage
*         - frequency
*         - duration
*       properties:
*         medicationId:
*           type: string
*           format: uuid
*         patientId:
*           type: string
*           format: uuid
*         quantity:
*           type: integer
*         dosage:
*           type: string
*         frequency:
*           type: string
*         duration:
*           type: integer
*         instructions:
*           type: string
*/

// Apply authentication to all routes
router.use(authenticate);

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
*             $ref: '#/components/schemas/Medication'
*     responses:
*       201:
*         description: Medication added successfully
*/
router.post(
 '/inventory',
 authorize(['PHARMACIST', 'ADMIN']),
 hasPermission(['manage_pharmacy_inventory']),
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
*     responses:
*       200:
*         description: Inventory list retrieved successfully
*/
router.get(
 '/inventory',
//  authorize(['PHARMACIST', 'DOCTOR', 'NURSE']),
//  hasPermission(['view_pharmacy_inventory']),
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
 authorize(['PHARMACIST', 'DOCTOR', 'NURSE']),
 hasPermission(['view_pharmacy_inventory']),
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
*             $ref: '#/components/schemas/Medication'
*     responses:
*       200:
*         description: Medication updated successfully
*/
router.put(
 '/inventory/:id',
 authorize(['PHARMACIST']),
 hasPermission(['manage_pharmacy_inventory']),
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
*             $ref: '#/components/schemas/StockMovement'
*     responses:
*       200:
*         description: Stock adjusted successfully
*/
router.post(
 '/stock/adjustment/:id',
 authorize(['PHARMACIST']),
 hasPermission(['manage_pharmacy_inventory']),
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
  hasPermission(['view_pharmacy_inventory']),
  pharmacyController.getLowStockItems
 );
 
 /**
 * @swagger
 * /api/v1/pharmacy/stock/expiring:
 *   get:
 *     summary: Get medications nearing expiry
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Expiring medications retrieved successfully
 */
 router.get(
  '/stock/expiring',
  authorize(['PHARMACIST', 'ADMIN']),
  hasPermission(['view_pharmacy_inventory']),
  pharmacyController.getExpiringItems
 );
 
 /**
 * @swagger
 * /api/v1/pharmacy/dispense:
 *   post:
 *     summary: Dispense medication
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MedicationDispense'
 *     responses:
 *       200:
 *         description: Medication dispensed successfully
 */
 router.post(
  '/dispense',
  authorize(['PHARMACIST']),
  hasPermission(['dispense_medication']),
  pharmacyController.dispenseMedication
 );
 
 /**
 * @swagger
 * /api/v1/pharmacy/dispense/history:
 *   get:
 *     summary: Get dispensing history
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dispensing history retrieved successfully
 */
 router.get(
  '/dispense/history',
  authorize(['PHARMACIST', 'ADMIN']),
  hasPermission(['view_dispensing_history']),
  pharmacyController.getDispenseHistory
 );
 
 /**
 * @swagger
 * /api/v1/pharmacy/dispense/{id}:
 *   get:
 *     summary: Get dispense record by ID
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
 *         description: Dispense record retrieved successfully
 */
 router.get(
  '/dispense/:id',
  authorize(['PHARMACIST', 'DOCTOR']),
  hasPermission(['view_dispensing_history']),
  pharmacyController.getDispenseById
 );
 
 /**
 * @swagger
 * /api/v1/pharmacy/lab-prescriptions:
 *   get:
 *     summary: Get prescriptions based on lab results
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lab-based prescriptions retrieved successfully
 */
 router.get(
  '/lab-prescriptions',
  authorize(['PHARMACIST']),
  hasPermission(['view_lab_results']),
  pharmacyController.getLabBasedPrescriptions
 );
 
 /**
 * @swagger
 * /api/v1/pharmacy/reports/inventory:
 *   get:
 *     summary: Get inventory report
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Inventory report retrieved successfully
 */
 router.get(
  '/reports/inventory',
  authorize(['PHARMACIST', 'ADMIN']),
  hasPermission(['view_pharmacy_reports']),
  pharmacyController.getInventoryReport
 );
 
 /**
 * @swagger
 * /api/v1/pharmacy/reports/dispensing:
 *   get:
 *     summary: Get dispensing report
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Dispensing report retrieved successfully
 */
 router.get(
  '/reports/dispensing',
  authorize(['PHARMACIST', 'ADMIN']),
  hasPermission(['view_pharmacy_reports']),
  pharmacyController.getDispensingReport
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
  hasPermission(['view_pharmacy_reports']),
  pharmacyController.getPharmacyStats
 );
 
 /**
 * @swagger
 * /api/v1/pharmacy/dispense/validate:
 *   post:
 *     summary: Validate a medication dispense request
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
 *             properties:
 *               medicationId:
 *                 type: string
 *                 format: uuid
 *               quantity:
 *                 type: number
 *               prescriptionId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Validation results retrieved successfully
 */
 router.post(
  '/dispense/validate',
  authorize(['PHARMACIST']),
  hasPermission(['dispense_medication']),
  pharmacyController.validateDispense
 );
 
 /**
 * @swagger
 * /api/v1/pharmacy/dispense/pending:
 *   get:
 *     summary: Get pending dispense requests
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending dispense requests retrieved successfully
 */
 router.get(
  '/dispense/pending',
  authorize(['PHARMACIST']),
  hasPermission(['dispense_medication']),
  pharmacyController.getPendingDispenses
 );
 
 module.exports = router;