// src/routes/v1/index.js
const express = require('express');
const router = express.Router();

// Import routes
const authRoutes = require('./auth.route');
const doctorRoutes = require('./doctor.route');
const patientRoutes = require('./patient.route');
const appointmentRoutes = require('./appointment.route');
const meetingRoutes = require('./meetings.route');
const userRoutes = (require('./users.route'))
const prescriptionRoutes = (require('./prescription.route'))
const recordRoutes = (require('./medical-record.route'))
const labRoutes = (require('./lab.route'))
const labTestRoutes = (require('./lab-test.route'))
const labTemplateRoutes = require('./lab-template.route'); 
const pharmacyRoutes = require('./pharmacy.route'); 
const uploadRoutes = require('./medical-records.route'); 
const videoRoutes = require('./video.route');
// const consultationQueueRoutes = require('./consultation-queue.route');
const billingRoutes = require('./billing.route');
const queueRoutes = require('./queue.route');
const examinationRoutes = require('./examination.route');
const icdRoutes = require('./icd.route'); 
const labTestCatalogRoutes = require('./lab-test-catalog.route');
const ccpRoutes = require('./ccp.route');


// New route imports
// const progressNoteRoutes = require('./progress-note.route');
// const consentRoutes = require('./consent.route');
const departmentRoutes = require('./department.route');
const triageRoutes = require('./triage.route');
const medicationRoutes = require('./medication.route')

// Mount routes
router.use('/auth', authRoutes);
router.use('/doctor', doctorRoutes);
router.use('/patient', patientRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/meetings', meetingRoutes);
router.use('/users', userRoutes);
router.use('/video', videoRoutes);
router.use('/prescriptions', prescriptionRoutes);
router.use('/records', recordRoutes);
router.use('/labs', labRoutes);
router.use('/lab-test', labTestRoutes);
router.use('/lab-templates', labTemplateRoutes);
router.use('/pharmacy', pharmacyRoutes);
router.use('/medical-records', uploadRoutes);
router.use('/medication', medicationRoutes);
// router.use('/consultation-queue', consultationQueueRoutes);
router.use('/billing', billingRoutes);
router.use('/queue', queueRoutes);
router.use('/examinations', examinationRoutes);
router.use('/icd', icdRoutes); // Mount ICD routes
router.use('/lab-test-catalog', labTestCatalogRoutes);
router.use('/ccp', ccpRoutes);

// Mount new routes
// router.use('/progress-notes', progressNoteRoutes);
// router.use('/consents', consentRoutes);
router.use('/departments', departmentRoutes);
router.use('/triage', triageRoutes);

// Health check route
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

module.exports = router;