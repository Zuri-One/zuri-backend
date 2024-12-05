const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const adminController = require('../../controllers/admin.controller');


router.get('/patients/stats', adminController.getPatientStats);
router.get('/patients/basic-info', adminController.getPatientsBasicInfo);
router.get('/patients/search', adminController.searchPatients);  // Move this up
router.get('/patients/email/:email', adminController.getPatientByEmail);
router.get('/patients/:id', adminController.getPatientById);
router.get('/patients', adminController.getAllPatients);

router.get('/doctors', adminController.getAllDoctors);
router.get('/doctors/:id', adminController.getDoctorById);

// Staff management routes
router.get('/staff', adminController.getAllStaff);
router.patch('/staff/:id/status', adminController.updateStaffStatus);
router.delete('/staff/:id', adminController.deleteStaff);
router.put('/staff/:id', adminController.updateStaff);

module.exports = router;