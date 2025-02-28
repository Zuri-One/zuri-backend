// src/routes/v1/users.route.js
const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/admin.controller');
const { authenticate, authorizeAdmin } = require('../../middleware/auth.middleware');

// Existing routes
router.get('/patients/waiting', adminController.getWaitingPatients);
router.get('/patients/stats', adminController.getPatientStats);
router.get('/patients/basic-info', adminController.getPatientsBasicInfo);
router.get('/patients/search', adminController.searchPatients);
router.get('/patients/email/:email', adminController.getPatientByEmail);
router.get('/patients/:id', adminController.getPatientById);
router.get('/doctors', adminController.getAllDoctors);
router.get('/staff', adminController.getAllStaff);
router.patch('/staff/:id/status', adminController.updateStaffStatus);
router.delete('/staff/:id', adminController.deleteStaff);
router.put('/staff/:id', adminController.updateStaff);

// New route for searching staff with filters
/**
 * @route GET /api/v1/users/staff/search
 * @desc Search staff members with filters
 * @access Private (Admin)
 */
router.get('/staff/search', authenticate, authorizeAdmin, adminController.searchStaff);

/**
 * @route PUT /api/v1/users/staff/:id/update-details
 * @desc Update specific staff details (contact info, etc.)
 * @access Private (Admin)
 */
router.put('/staff/:id/update-details', authenticate, authorizeAdmin, adminController.updateStaffDetails);

module.exports = router;