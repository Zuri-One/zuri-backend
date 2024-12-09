// src/routes/v1/consultation-queue.route.js
const express = require('express');
const router = express.Router();
const consultationQueueController = require('../../controllers/consultation-queue.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     ConsultationQueue:
 *       type: object
 *       required:
 *         - triageId
 *         - patientId
 *         - departmentId
 *         - doctorId
 *         - priority
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Auto-generated unique identifier
 *         triageId:
 *           type: string
 *           format: uuid
 *           description: ID of the triage assessment
 *         patientId:
 *           type: string
 *           format: uuid
 *           description: ID of the patient
 *         departmentId:
 *           type: string
 *           format: uuid
 *           description: ID of the department
 *         doctorId:
 *           type: string
 *           format: uuid
 *           description: ID of the assigned doctor
 *         queueNumber:
 *           type: integer
 *           description: Sequential queue number for the day
 *         tokenNumber:
 *           type: string
 *           description: Unique token number for display
 *         priority:
 *           type: integer
 *           description: Priority level (0: Normal, 1: High, 2: Urgent)
 *         status:
 *           type: string
 *           enum: [WAITING, WAITING_FOR_DOCTOR, IN_PROGRESS, PENDING_LABS, PENDING_IMAGING, PENDING_PHARMACY, PENDING_BILLING, COMPLETED, CANCELLED]
 *           default: WAITING
 *         checkInTime:
 *           type: string
 *           format: date-time
 *           description: Time when patient checked in
 *         estimatedStartTime:
 *           type: string
 *           format: date-time
 *           description: Estimated consultation start time
 *         actualStartTime:
 *           type: string
 *           format: date-time
 *           description: Actual consultation start time
 *         completionTime:
 *           type: string
 *           format: date-time
 *           description: Consultation completion time
 *         patientCondition:
 *           type: object
 *           properties:
 *             vitalSigns:
 *               type: object
 *             urgencyLevel:
 *               type: string
 *             triageCategory:
 *               type: string
 *             primaryComplaint:
 *               type: string
 *         notes:
 *           type: object
 *           properties:
 *             nurseNotes:
 *               type: string
 *             triageNotes:
 *               type: string
 *             patientRequirements:
 *               type: array
 *               items:
 *                 type: string
 *             specialInstructions:
 *               type: string
 *
 * @swagger
 * tags:
 *   name: Consultation Queue
 *   description: Consultation queue management endpoints
 */

/**
 * @swagger
 * /api/v1/consultation-queue:
 *   post:
 *     summary: Create new queue entry
 *     tags: [Consultation Queue]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - triageId
 *               - departmentId
 *               - doctorId
 *               - priority
 *             properties:
 *               triageId:
 *                 type: string
 *                 format: uuid
 *               departmentId:
 *                 type: string
 *                 format: uuid
 *               doctorId:
 *                 type: string
 *                 format: uuid
 *               priority:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 2
 *     responses:
 *       201:
 *         description: Queue entry created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 queue:
 *                   $ref: '#/components/schemas/ConsultationQueue'
 *                 estimatedStartTime:
 *                   type: string
 *                   format: date-time
 *                 queueNumber:
 *                   type: integer
 *                 tokenNumber:
 *                   type: string
 *       400:
 *         description: Invalid input or triage record not found
 */
router.post('/', authenticate, consultationQueueController.createConsultationQueue);

/**
 * @swagger
 * /api/v1/consultation-queue/department/{departmentId}:
 *   get:
 *     summary: Get consultation queue for a department
 *     tags: [Consultation Queue]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: departmentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Department queue retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 queue:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ConsultationQueue'
 */
router.get('/department/:departmentId', consultationQueueController.getDepartmentQueue);

/**
 * @swagger
 * /api/v1/consultation-queue/doctor/{doctorId}:
 *   get:
 *     summary: Get consultation queue for a doctor
 *     tags: [Consultation Queue]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Doctor's queue retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 queue:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/ConsultationQueue'
 *                       - type: object
 *                         properties:
 *                           patient:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               email:
 *                                 type: string
 */
router.get('/doctor/:doctorId', consultationQueueController.getDoctorQueue);

/**
 * @swagger
 * /api/v1/consultation-queue/{id}/status:
 *   patch:
 *     summary: Update queue entry status
 *     tags: [Consultation Queue]
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [WAITING, IN_PROGRESS, COMPLETED, CANCELLED, PENDING_LABS, PENDING_IMAGING, PENDING_PHARMACY, PENDING_BILLING]
 *     responses:
 *       200:
 *         description: Queue status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 queue:
 *                   $ref: '#/components/schemas/ConsultationQueue'
 */
router.patch('/:id/status', consultationQueueController.updateQueueStatus);

module.exports = router;