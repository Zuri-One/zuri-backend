const router = require('express').Router();

const authRoutes = require('./auth.route');
const patientRoutes = require('./patient.route');
const doctorRoutes = require('./doctor.route');
const appointmentRoutes = require('./appointment.route');
const medicalRecordRoutes = require('./medicalrecord.route');
const inventoryRoutes = require('./inventory.route');
const billRoutes = require('./billing.route');
const pharmacyRoutes = require('./pharmacy.route');

// Auth routes
router.use('/auth', authRoutes);

// Protected routes
router.use('/patients', patientRoutes);
router.use('/doctors', doctorRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/medical-records', medicalRecordRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/bills', billRoutes);
router.use('/pharmacy', pharmacyRoutes);

module.exports = router;