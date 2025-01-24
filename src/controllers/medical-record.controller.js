// controllers/medical-record.controller.js
const { MedicalRecord, Patient, User, DepartmentQueue } = require('../models');
const { Op } = require('sequelize');


exports.getPatientMedicalHistory = async (req, res, next) => {
  try {
    const { patientId } = req.params;

    // Validate patient exists
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Fetch all medical records for the patient
    const records = await MedicalRecord.findAll({
      where: { patientId },
      include: [
        {
          model: User,
          as: 'doctor',
          attributes: ['id', 'surname', 'otherNames']
        }
      ],
      order: [['createdAt', 'DESC']] // Most recent first
    });

    res.json({
      success: true,
      data: records
    });

  } catch (error) {
    console.error('Error fetching medical history:', error);
    next(error);
  }
};


exports.createMedicalRecord = async (req, res, next) => {
  try {
    const {
      patientId,
      queueEntryId,
      complaints,
      hpi,
      medicalHistory,
      familySocialHistory,
      allergies,
      impressions,
      diagnosis,
      notes
    } = req.body;

    const doctorId = req.user.id;

    // Validate queue entry exists and belongs to doctor's department
    const queueEntry = await DepartmentQueue.findOne({
      where: {
        id: queueEntryId,
        patientId,
        status: 'IN_PROGRESS'
      },
      include: [{
        model: Patient
      }]
    });

    if (!queueEntry) {
      return res.status(404).json({
        success: false,
        message: 'Invalid queue entry or consultation not in progress'
      });
    }

    // Create medical record
    const medicalRecord = await MedicalRecord.create({
      patientId,
      doctorId,
      queueEntryId,
      complaints,
      hpi,
      medicalHistory,
      familySocialHistory,
      allergies,
      impressions,
      diagnosis,
      notes
    });

    // Update queue entry status
    await queueEntry.update({
      status: 'COMPLETED',
      endTime: new Date(),
      actualWaitTime: Math.floor(
        (new Date() - new Date(queueEntry.startTime)) / (1000 * 60)
      )
    });

    // Update patient record
    await queueEntry.Patient.update({
      status: 'CONSULTATION_COMPLETE'
    });

    // Fetch complete record with associations
    const completeRecord = await MedicalRecord.findByPk(medicalRecord.id, {
      include: [
        {
          model: Patient,
          attributes: ['id', 'patientNumber', 'surname', 'otherNames']
        },
        {
          model: User,
          as: 'doctor',
          attributes: ['id', 'surname', 'otherNames']
        }
      ]
    });

    res.status(201).json({
      success: true,
      data: completeRecord
    });

  } catch (error) {
    console.error('Error creating medical record:', error);
    next(error);
  }
};

exports.getPatientMedicalHistory = async (req, res, next) => {
  try {
    const { patientId } = req.params;

    const medicalRecords = await MedicalRecord.findAll({
      where: { patientId },
      include: [
        {
          model: User,
          as: 'doctor',
          attributes: ['id', 'surname', 'otherNames']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: medicalRecords
    });

  } catch (error) {
    console.error('Error fetching medical history:', error);
    next(error);
  }
};