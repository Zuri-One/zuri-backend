const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const adminController = require('../../controllers/admin.controller');

// Existing routes
router.get('/patients/basic-info', adminController.getPatientsBasicInfo);
router.get('/patients', adminController.getAllPatients);
router.get('/patients/:id', adminController.getPatientById);
router.get('/doctors', adminController.getAllDoctors);
router.get('/doctors/:id', adminController.getDoctorById);

// New staff management routes
router.get('/staff', adminController.getAllStaff);
router.patch('/staff/:id/status', adminController.updateStaffStatus);
router.delete('/staff/:id', adminController.deleteStaff);
router.put('/staff/:id', adminController.updateStaff);

module.exports = router;