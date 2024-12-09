// src/routes/v1/billing.route.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const billingController = require('../../controllers/billing.controller');

/**
 * @swagger
 * components:
 *   schemas:
 *     Bill:
 *       type: object
 *       required:
 *         - patientId
 *         - departmentId
 *         - billType
 *         - items
 *         - totalAmount
 *         - paymentMethod
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Auto-generated unique identifier
 *         patientId:
 *           type: string
 *           format: uuid
 *           description: ID of the patient
 *         departmentId:
 *           type: string
 *           format: uuid
 *           description: ID of the department generating the bill
 *         billType:
 *           type: string
 *           description: Type of bill (e.g., CONSULTATION, PHARMACY, LAB_TEST)
 *         items:
 *           type: array
 *           description: List of items in the bill
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               quantity:
 *                 type: integer
 *               unitPrice:
 *                 type: number
 *               totalPrice:
 *                 type: number
 *         subtotal:
 *           type: number
 *           description: Sum of all items before tax and discounts
 *         tax:
 *           type: number
 *           description: Tax amount
 *         discount:
 *           type: number
 *           description: Discount amount
 *         totalAmount:
 *           type: number
 *           description: Final amount after tax and discounts
 *         paymentMethod:
 *           type: string
 *           enum: [CASH, MPESA, CARD, INSURANCE]
 *         paymentStatus:
 *           type: string
 *           enum: [PENDING, PAID, FAILED, CANCELLED]
 *         currency:
 *           type: string
 *           default: KES
 *         reference:
 *           type: string
 *           description: Unique reference number for the bill
 *         dueDate:
 *           type: string
 *           format: date-time
 *         insuranceDetails:
 *           type: object
 *           properties:
 *             provider:
 *               type: string
 *             policyNumber:
 *               type: string
 *             approvalCode:
 *               type: string
 *     PaymentInitiation:
 *       type: object
 *       required:
 *         - billId
 *         - email
 *       properties:
 *         billId:
 *           type: string
 *           format: uuid
 *         email:
 *           type: string
 *           format: email
 *         metadata:
 *           type: object
 *           properties:
 *             phone:
 *               type: string
 *
 * @swagger
 * tags:
 *   name: Billing
 *   description: Billing and payment management endpoints
 */

/**
 * @swagger
 * /api/v1/billing/bills:
 *   post:
 *     summary: Create a new bill
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Bill'
 *     responses:
 *       201:
 *         description: Bill created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Bill'
 *       400:
 *         description: Invalid input data
 */
router.post('/bills', authenticate, billingController.createBill);

/**
 * @swagger
 * /api/v1/billing/initialize:
 *   post:
 *     summary: Initialize payment for a bill
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentInitiation'
 *     responses:
 *       200:
 *         description: Payment initialized successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     authorization_url:
 *                       type: string
 *                     reference:
 *                       type: string
 *                     paymentMethod:
 *                       type: string
 */
router.post('/initialize', authenticate, billingController.initializePayment);

/**
 * @swagger
 * /api/v1/billing/verify/{reference}:
 *   get:
 *     summary: Verify payment status
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reference
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment verification successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [success, pending, failed]
 */
router.get('/verify/:reference', authenticate, billingController.verifyPayment);

/**
 * @swagger
 * /api/v1/billing/bills:
 *   get:
 *     summary: Get all bills
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, PAID, FAILED, CANCELLED]
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Bills retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Bill'
 */
router.get('/bills', authenticate, billingController.getBills);

/**
 * @swagger
 * /api/v1/billing/bills/{id}:
 *   get:
 *     summary: Get bill by ID
 *     tags: [Billing]
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
 *         description: Bill retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Bill'
 */
router.get('/bills/:id', authenticate, billingController.getBill);

/**
 * @swagger
 * /api/v1/billing/bills/{id}:
 *   put:
 *     summary: Update bill details
 *     tags: [Billing]
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
 *             $ref: '#/components/schemas/Bill'
 *     responses:
 *       200:
 *         description: Bill updated successfully
 */
router.put('/bills/:id', authenticate, billingController.updateBill);

/**
 * @swagger
 * /api/v1/billing/bills/{id}/cancel:
 *   post:
 *     summary: Cancel a bill
 *     tags: [Billing]
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
 *         description: Bill cancelled successfully
 */
router.post('/bills/:id/cancel', authenticate, billingController.cancelBill);

module.exports = router;