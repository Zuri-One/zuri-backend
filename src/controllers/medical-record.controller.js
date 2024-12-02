// src/controllers/medical-record.controller.js
const { MedicalRecord, User } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');
const sendEmail = require('../utils/email.util');

exports.createMedicalRecord = async (req, res, next) => {
  try {
    const doctorId = req.user.id;
    const {
      patientId,
      visitDate,
      chiefComplaint,
      diagnosis,
      vitalSigns,
      symptoms,
      treatment,
      notes,
      followUpDate,
      attachments
    } = req.body;

    // Validate doctor and patient
    const [doctor, patient] = await Promise.all([
      User.findOne({ where: { id: doctorId, role: 'doctor' }}),
      User.findOne({ where: { id: patientId, role: 'patient' }})
    ]);

    if (!doctor || !patient) {
      return res.status(404).json({ message: 'Doctor or patient not found' });
    }

    const medicalRecord = await MedicalRecord.create({
      doctorId,
      patientId,
      visitDate,
      chiefComplaint,
      diagnosis,
      vitalSigns,
      symptoms,
      treatment,
      notes,
      followUpDate,
      attachments,
      status: 'draft'
    });

    res.status(201).json({
      message: 'Medical record created successfully',
      medicalRecord
    });
  } catch (error) {
    next(error);
  }
};

exports.updateMedicalRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doctorId = req.user.id;
    const updateData = req.body;

    const medicalRecord = await MedicalRecord.findOne({
      where: { id, doctorId }
    });

    if (!medicalRecord) {
      return res.status(404).json({ message: 'Medical record not found' });
    }

    // Only allow updates if record is in draft status
    if (medicalRecord.status === 'final') {
      return res.status(400).json({ message: 'Cannot update finalized record' });
    }

    await medicalRecord.update(updateData);

    res.json({
      message: 'Medical record updated successfully',
      medicalRecord
    });
  } catch (error) {
    next(error);
  }
};

exports.finalizeMedicalRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doctorId = req.user.id;

    const medicalRecord = await MedicalRecord.findOne({
      where: { id, doctorId },
      include: [{
        model: User,
        as: 'patient',
        attributes: ['id', 'name', 'email']
      }]
    });

    if (!medicalRecord) {
      return res.status(404).json({ message: 'Medical record not found' });
    }

    if (medicalRecord.status === 'final') {
      return res.status(400).json({ message: 'Record already finalized' });
    }

    await medicalRecord.update({ status: 'final' });

    res.json({
      message: 'Medical record finalized successfully',
      medicalRecord
    });
  } catch (error) {
    next(error);
  }
};

exports.getMedicalRecords = async (req, res, next) => {
  try {
    const where = {};
    
    // Filter based on user role
    if (req.user.role === 'patient') {
      where.patientId = req.user.id;
    } else if (req.user.role === 'doctor') {
      where.doctorId = req.user.id;
    }

    const medicalRecords = await MedicalRecord.findAll({
      where,
      include: [
        {
          model: User,
          as: 'patient',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'doctor',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['visitDate', 'DESC']]
    });

    res.json({ medicalRecords });
  } catch (error) {
    next(error);
  }
};

exports.getPatientMedicalRecords = async (req, res, next) => {
    try {
      const { patientId } = req.params;
  
      // Check if user has permission (doctor viewing their patient, the patient themselves, or admin)
      const isAuthorized = 
        req.user.role === 'admin' || 
        req.user.id === patientId || 
        (req.user.role === 'doctor');
  
      if (!isAuthorized) {
        return res.status(403).json({ 
          success: false,
          message: 'Not authorized to view these records' 
        });
      }
  
      const records = await MedicalRecord.findAll({
        where: { patientId },
        include: [
          {
            model: User,
            as: 'doctor',
            attributes: ['id', 'name', 'email']
          },
          {
            model: User,
            as: 'patient',
            attributes: ['id', 'name', 'email']
          }
        ],
        order: [['visitDate', 'DESC']]
      });
  
      res.json({
        success: true,
        count: records.length,
        records
      });
    } catch (error) {
      next(error);
    }
  };

  
exports.getMedicalRecordById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const where = { id };

    // Add user-specific conditions
    if (req.user.role === 'patient') {
      where.patientId = req.user.id;
    } else if (req.user.role === 'doctor') {
      where.doctorId = req.user.id;
    }

    const medicalRecord = await MedicalRecord.findOne({
      where,
      include: [
        {
          model: User,
          as: 'patient',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'doctor',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!medicalRecord) {
      return res.status(404).json({ message: 'Medical record not found' });
    }

    res.json({ medicalRecord });
  } catch (error) {
    next(error);
  }
};