const { Medication, Prescription, User, Appointment, PrescriptionMedications } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');
const sendEmail = require('../utils/email.util');
const { generatePrescriptionEmail } = require('../utils/email-templates.util');



exports.createPrescription = async (req, res, next) => {
  try {
    const { patientId, appointmentId, diagnosis, medications, notes, validUntil, maxRefills } = req.body;
    const doctorId = req.user.id;

    // Validate doctor and patient
    const [doctor, patient] = await Promise.all([
      User.findOne({ where: { id: doctorId, role: 'doctor' }}),
      User.findOne({ where: { id: patientId, role: 'patient' }})
    ]);

    if (!doctor || !patient) {
      return res.status(404).json({ message: 'Doctor or patient not found' });
    }

    // Create prescription
    const prescription = await Prescription.create({
      patientId,
      doctorId,
      appointmentId,
      diagnosis,
      notes,
      validUntil,
      maxRefills,
      status: 'active'
    });

    // Add medications to prescription
    for (const med of medications) {
      const medication = await Medication.findOrCreate({
        where: { name: med.name },
        defaults: {
          ...med
        }
      });

      await prescription.addMedication(medication[0], {
        through: { 
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration,
          instructions: med.instructions
        }
      });
    }

    await sendEmail({
      to: patient.email,
      subject: 'New Prescription Added',
      html: generatePrescriptionEmail('new', {
        patientName: patient.name,
        doctorName: doctor.name,
        dateIssued: moment().format('MMMM D, YYYY'),
        validUntil: moment(validUntil).format('MMMM D, YYYY'),
        diagnosis,
        notes,
        medications: medications.map(med => ({
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: `${med.duration} days`,
          instructions: med.instructions
        }))
      })
    });

    res.status(201).json({
      message: 'Prescription created successfully',
      prescription
    });
  } catch (error) {
    next(error);
  }
};

exports.getPatientPrescriptions = async (req, res, next) => {
  try {
    const patientId = req.user.id;
    const { status, startDate, endDate } = req.query;

    const whereClause = { patientId };
    
    if (status) {
      whereClause.status = status;
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate);
      if (endDate) whereClause.createdAt[Op.lte] = new Date(endDate);
    }

    const prescriptions = await Prescription.findAll({
      where: whereClause,
      include: [
        {
          model: Medication,
          through: { attributes: ['dosage', 'frequency', 'duration', 'instructions'] }
        },
        {
          model: User,
          as: 'doctor',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ prescriptions });
  } catch (error) {
    next(error);
  }
};

exports.getDoctorPrescriptions = async (req, res, next) => {
  try {
    const doctorId = req.user.id;
    const { patientId, status } = req.query;

    const whereClause = { doctorId };
    
    if (patientId) {
      whereClause.patientId = patientId;
    }
    
    if (status) {
      whereClause.status = status;
    }

    const prescriptions = await Prescription.findAll({
      where: whereClause,
      include: [
        {
          model: Medication,
          through: {
            model: PrescriptionMedications,
            attributes: ['quantity', 'specialInstructions']
          }
        },
        {
          model: User,
          as: 'patient',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ prescriptions });
  } catch (error) {
    next(error);
  }
};

exports.updatePrescription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes, refillCount } = req.body;
    const doctorId = req.user.id;

    const prescription = await Prescription.findOne({
      where: { id, doctorId },
      include: [
        {
          model: User,
          as: 'patient',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    // Update prescription
    await prescription.update({
      status,
      notes,
      refillCount: refillCount || prescription.refillCount
    });

// Update this line
await sendEmail({
  to: prescription.patient.email,
  subject: 'Prescription Updated',
  html: generatePrescriptionEmail('update', {
    patientName: prescription.patient.name,
    doctorName: req.user.name,
    dateUpdated: moment().format('MMMM D, YYYY'),
    validUntil: moment(prescription.validUntil).format('MMMM D, YYYY'),
    notes,
    status
  })
});

    res.json({
      message: 'Prescription updated successfully',
      prescription
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;