const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const adminController = require('../../controllers/admin.controller');

// Protected routes - require authentication and admin role
// router.use(authenticate, authorize(['doctor, lab_technician, pharmacist']));
router.get('/patients/basic-info', adminController.getPatientsBasicInfo);
router.get('/patients', adminController.getAllPatients);
router.get('/patients/:id', adminController.getPatientById);
router.get('/doctors', adminController.getAllDoctors);
router.get('/doctors/:id', adminController.getDoctorById);




module.exports = router;