// routes/v1/department.route.js
const express = require('express');
const router = express.Router();
const departmentController = require('../../controllers/department.controller');
const { authenticate, authorize, hasPermission } = require('../../middleware/auth.middleware');

// Apply authentication to all routes
router.use(authenticate);

// Routes for department management
router.post(
  '/',
  // authorize(['']),
  // hasPermission(['manage_departments']),
  departmentController.createDepartment
);

router.get(
  '/',
  // authorize(['ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']),
  departmentController.getDepartments
);

router.get(
  '/:id',
  // authorize(['ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']),
  departmentController.getDepartmentById
);

router.put(
  '/:id',
  // authorize(['ADMIN', 'HOSPITAL_ADMIN']),
  hasPermission(['manage_departments']),
  departmentController.updateDepartment
);

router.patch(
  '/:id/status',
  // authorize(['ADMIN', 'HOSPITAL_ADMIN']),
  // hasPermission(['manage_departments']),
  departmentController.toggleDepartmentStatus
);

router.get(
  '/:id/stats',
  // authorize(['ADMIN', 'HOSPITAL_ADMIN', 'WARD_MANAGER']),
  departmentController.getDepartmentStats
);

router.post(
  '/:departmentId/staff',
  // authorize(['ADMIN', 'HOSPITAL_ADMIN']),
  // hasPermission(['manage_departments']),
  departmentController.assignStaffToDepartment
);

router.put(
  '/:id/resources',
  // authorize(['ADMIN', 'HOSPITAL_ADMIN', 'WARD_MANAGER']),
  // hasPermission(['manage_department_resources']),
  departmentController.updateDepartmentResources
);

module.exports = router;