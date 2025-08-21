// src/routes/v1/users.route.js
const express = require('express');
const multer = require('multer');
const router = express.Router();
const adminController = require('../../controllers/admin.controller');
const signatureController = require('../../controllers/signature.controller');
const { authenticate, authorizeAdmin } = require('../../middleware/auth.middleware');

// Configure multer for signature uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PNG, JPEG, GIF, and SVG files are allowed.'));
    }
  }
});

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

// ========== SIGNATURE ROUTES ==========

/**
 * @route POST /api/v1/users/signature
 * @desc Create/Upload user signature
 * @access Private
 */
router.post('/signature', authenticate, upload.single('signature'), signatureController.createSignature);

/**
 * @route GET /api/v1/users/signature
 * @desc Get user signature
 * @access Private
 */
router.get('/signature', authenticate, signatureController.getSignature);

/**
 * @route PUT /api/v1/users/signature
 * @desc Update user signature
 * @access Private
 */
router.put('/signature', authenticate, upload.single('signature'), signatureController.updateSignature);

/**
 * @route DELETE /api/v1/users/:userId/signature
 * @desc Delete user signature (Admin only)
 * @access Private (Admin)
 */
router.delete('/:userId/signature', authenticate, authorizeAdmin, signatureController.deleteSignature);

module.exports = router;