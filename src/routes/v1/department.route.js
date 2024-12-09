// src/routes/v1/department.route.js
const express = require('express');
const router = express.Router();
const departmentController = require('../../controllers/department.controller');
const { authenticate, authorize, hasPermission } = require('../../middleware/auth.middleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     Department:
 *       type: object
 *       required:
 *         - name
 *         - code
 *         - type
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Auto-generated unique identifier
 *         name:
 *           type: string
 *           description: Name of the department
 *         code:
 *           type: string
 *           description: Unique department code
 *         type:
 *           type: string
 *           description: Type of department
 *         description:
 *           type: string
 *           description: Detailed description of the department
 *         location:
 *           type: string
 *           description: Physical location of the department
 *         operatingHours:
 *           type: object
 *           description: Department operating hours
 *         capacity:
 *           type: integer
 *           description: Department capacity
 *         headOfDepartmentId:
 *           type: string
 *           format: uuid
 *           description: ID of the department head
 *         isActive:
 *           type: boolean
 *           description: Department active status
 *       example:
 *         name: "Cardiology"
 *         code: "CARD-001"
 *         type: "CLINICAL"
 *         description: "Cardiovascular healthcare services"
 *         location: "Building A, 3rd Floor"
 *         operatingHours: {"monday": "9:00-17:00"}
 *         capacity: 50
 *         isActive: true
 */

/**
 * @swagger
 * tags:
 *   name: Departments
 *   description: Department management endpoints
 */

/**
 * @swagger
 * /api/v1/departments:
 *   post:
 *     summary: Create a new department
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Department'
 *     responses:
 *       201:
 *         description: Department created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 department:
 *                   $ref: '#/components/schemas/Department'
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.post('/', authenticate, departmentController.createDepartment);

/**
 * @swagger
 * /api/v1/departments:
 *   get:
 *     summary: Get all departments
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all departments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 departments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Department'
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, departmentController.getDepartments);

/**
 * @swagger
 * /api/v1/departments/{id}:
 *   get:
 *     summary: Get department by ID
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Department ID
 *     responses:
 *       200:
 *         description: Department details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 department:
 *                   $ref: '#/components/schemas/Department'
 *       404:
 *         description: Department not found
 */
router.get('/:id', authenticate, departmentController.getDepartmentById);

/**
 * @swagger
 * /api/v1/departments/{id}:
 *   put:
 *     summary: Update department details
 *     tags: [Departments]
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
 *             $ref: '#/components/schemas/Department'
 *     responses:
 *       200:
 *         description: Department updated successfully
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Department not found
 */
router.put('/:id', authenticate, hasPermission(['manage_departments']), departmentController.updateDepartment);

/**
 * @swagger
 * /api/v1/departments/{id}/status:
 *   patch:
 *     summary: Toggle department active status
 *     tags: [Departments]
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
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Department status updated successfully
 *       404:
 *         description: Department not found
 */
router.patch('/:id/status', authenticate, departmentController.toggleDepartmentStatus);

/**
 * @swagger
 * /api/v1/departments/{id}/stats:
 *   get:
 *     summary: Get department statistics
 *     tags: [Departments]
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
 *         description: Department statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalStaff:
 *                       type: integer
 *                     staffDistribution:
 *                       type: object
 *                     operatingHours:
 *                       type: object
 *                     capacity:
 *                       type: integer
 *                     resourceCount:
 *                       type: integer
 */
router.get('/:id/stats', authenticate, departmentController.getDepartmentStats);

/**
 * @swagger
 * /api/v1/departments/{departmentId}/staff:
 *   post:
 *     summary: Assign staff to department
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: departmentId
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
 *               staffIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Staff assigned successfully
 *       404:
 *         description: Department not found
 */
router.post('/:departmentId/staff', authenticate, departmentController.assignStaffToDepartment);

/**
 * @swagger
 * /api/v1/departments/{departmentId}/doctors:
 *   get:
 *     summary: Get all doctors in a department
 *     tags: [Departments]
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       specialization:
 *                         type: string
 */
router.get('/:departmentId/doctors', authenticate, departmentController.getDoctorsByDepartment);

module.exports = router;