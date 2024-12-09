// src/routes/v1/users.route.js
const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/admin.controller');

/**
 * @swagger
 * components:
 *   schemas:
 *     Patient:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         contactNumber:
 *           type: string
 *         gender:
 *           type: string
 *           enum: [MALE, FEMALE, OTHER]
 *         bloodGroup:
 *           type: string
 *           enum: [A+, A-, B+, B-, AB+, AB-, O+, O-]
 *         registrationId:
 *           type: string
 *         totalAppointments:
 *           type: integer
 *         totalPrescriptions:
 *           type: integer
 *         totalTestResults:
 *           type: integer
 *     
 *     Staff:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         email:
 *           type: string
 *         role:
 *           type: string
 *           enum: [DOCTOR, NURSE, LAB_TECHNICIAN, PHARMACIST, RECEPTIONIST]
 *         department:
 *           type: string
 *         status:
 *           type: string
 *           enum: [active, suspended, on_leave, terminated]
 *         licenseNumber:
 *           type: string
 *         specialization:
 *           type: string
 *         contactNumber:
 *           type: string
 *
 * @swagger
 * tags:
 *   name: Users Management
 *   description: User administration and management endpoints
 */

/**
 * @swagger
 * /api/v1/users/patients/waiting:
 *   get:
 *     summary: Get list of waiting patients
 *     tags: [Users Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of waiting patients retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 patients:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       waitingTime:
 *                         type: integer
 *                       priorityLevel:
 *                         type: string
 *                         enum: [HIGH, MEDIUM, NORMAL]
 */
router.get('/patients/waiting', adminController.getWaitingPatients);

/**
 * @swagger
 * /api/v1/users/patients/stats:
 *   get:
 *     summary: Get patient statistics
 *     tags: [Users Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Patient statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalPatients:
 *                   type: integer
 *                 newPatientsToday:
 *                   type: integer
 *                 activePatients:
 *                   type: integer
 *                 patientsByGender:
 *                   type: object
 *                 registrationTrend:
 *                   type: array
 */
router.get('/patients/stats', adminController.getPatientStats);

/**
 * @swagger
 * /api/v1/users/patients/basic-info:
 *   get:
 *     summary: Get basic patient information
 *     tags: [Users Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Basic patient information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 patients:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Patient'
 */
router.get('/patients/basic-info', adminController.getPatientsBasicInfo);

/**
 * @swagger
 * /api/v1/users/patients/search:
 *   get:
 *     summary: Search patients
 *     tags: [Users Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query (name, email, ID, phone)
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 */
router.get('/patients/search', adminController.searchPatients);

/**
 * @swagger
 * /api/v1/users/patients/email/{email}:
 *   get:
 *     summary: Get patient by email
 *     tags: [Users Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Patient retrieved successfully
 */
router.get('/patients/email/:email', adminController.getPatientByEmail);

/**
 * @swagger
 * /api/v1/users/patients/{id}:
 *   get:
 *     summary: Get patient by ID
 *     tags: [Users Management]
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
 *         description: Patient retrieved successfully
 */
router.get('/patients/:id', adminController.getPatientById);

/**
 * @swagger
 * /api/v1/users/doctors:
 *   get:
 *     summary: Get all doctors
 *     tags: [Users Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of doctors retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 doctors:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/Staff'
 *                       - type: object
 *                         properties:
 *                           metrics:
 *                             type: object
 */
router.get('/doctors', adminController.getAllDoctors);

/**
 * @swagger
 * /api/v1/users/staff:
 *   get:
 *     summary: Get all staff members
 *     tags: [Users Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of staff members retrieved successfully
 */
router.get('/staff', adminController.getAllStaff);

/**
 * @swagger
 * /api/v1/users/staff/{id}:
 *   put:
 *     summary: Update staff member
 *     tags: [Users Management]
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
 *             $ref: '#/components/schemas/Staff'
 *     responses:
 *       200:
 *         description: Staff member updated successfully
 *   patch:
 *     summary: Update staff status
 *     tags: [Users Management]
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
 *                 enum: [active, suspended, on_leave, terminated]
 *     responses:
 *       200:
 *         description: Staff status updated successfully
 *   delete:
 *     summary: Delete staff member
 *     tags: [Users Management]
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
 *         description: Staff member deleted successfully
 */
router.patch('/staff/:id/status', adminController.updateStaffStatus);
router.delete('/staff/:id', adminController.deleteStaff);
router.put('/staff/:id', adminController.updateStaff);

module.exports = router;