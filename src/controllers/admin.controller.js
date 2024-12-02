// src/controllers/admin.controller.js
const { User, Appointment, DoctorProfile, Prescription, TestResult } = require('../models');
const { Op } = require('sequelize');

exports.getAllPatients = async (req, res, next) => {
  try {
    const patients = await User.findAll({
      where: { role: 'patient' },
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Appointment,
          as: 'patientAppointments',
          include: [{
            model: User,
            as: 'doctor',
            attributes: ['id', 'name', 'email'],
            include: [{
              model: DoctorProfile,
              attributes: ['specialization']
            }]
          }]
        },
        {
          model: Prescription,
          as: 'patientPrescriptions',
          include: [{
            model: User,
            as: 'doctor',
            attributes: ['id', 'name', 'email']
          }]
        },
        {
          model: TestResult,
          as: 'testResults',
          include: [{
            model: User,
            as: 'referringDoctor',
            attributes: ['id', 'name', 'email']
          }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      patients: patients.map(patient => ({
        ...patient.toJSON(),
        totalAppointments: patient.patientAppointments?.length || 0,
        totalPrescriptions: patient.patientPrescriptions?.length || 0,
        totalTestResults: patient.testResults?.length || 0
      }))
    });
  } catch (error) {
    next(error);
  }
};


exports.getPatientsBasicInfo = async (req, res, next) => {
  try {
    const patients = await User.findAll({
      where: { 
        role: 'patient',
        deletedAt: null
      },
      attributes: [
        'id', 
        'name', 
        'email', 
        'contactNumber',
        'gender',
        'bloodGroup'
      ],
      raw: true
    });

    res.json({
      success: true,
      patients: patients || []
    });

  } catch (error) {
    console.error('Error in getPatientsBasicInfo:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });
  }
};

exports.getAllDoctors = async (req, res, next) => {
  try {
    const doctors = await User.findAll({
      where: { role: 'doctor' },
      attributes: { exclude: ['password'] },
      include: [
        {
          model: DoctorProfile,
          required: true
        },
        {
          model: Appointment,
          as: 'doctorAppointments',
          include: [{
            model: User,
            as: 'patient',
            attributes: ['id', 'name', 'email']
          }]
        },
        {
          model: Prescription,
          as: 'doctorPrescriptions',
          include: [{
            model: User,
            as: 'patient',
            attributes: ['id', 'name', 'email']
          }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Calculate metrics for each doctor
    const doctorsWithMetrics = doctors.map(doctor => {
      const doctorData = doctor.toJSON();
      const totalAppointments = doctorData.doctorAppointments?.length || 0;
      const completedAppointments = doctorData.doctorAppointments?.filter(
        apt => apt.status === 'completed'
      ).length || 0;
      const totalPrescriptions = doctorData.doctorPrescriptions?.length || 0;

      return {
        ...doctorData,
        metrics: {
          totalAppointments,
          completedAppointments,
          appointmentCompletionRate: totalAppointments 
            ? ((completedAppointments / totalAppointments) * 100).toFixed(2)
            : 0,
          totalPrescriptions
        }
      };
    });

    res.json({
      success: true,
      doctors: doctorsWithMetrics
    });
  } catch (error) {
    next(error);
  }
};

exports.getPatientById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const patient = await User.findOne({
      where: { id, role: 'patient' },
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Appointment,
          as: 'patientAppointments',
          include: [{
            model: User,
            as: 'doctor',
            attributes: ['id', 'name', 'email'],
            include: [{
              model: DoctorProfile,
              attributes: ['specialization']
            }]
          }]
        },
        {
          model: Prescription,
          as: 'patientPrescriptions',
          include: [{
            model: User,
            as: 'doctor',
            attributes: ['id', 'name', 'email']
          }]
        },
        {
          model: TestResult,
          as: 'testResults'
        }
      ]
    });

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    res.json({
      success: true,
      patient: {
        ...patient.toJSON(),
        totalAppointments: patient.patientAppointments?.length || 0,
        totalPrescriptions: patient.patientPrescriptions?.length || 0,
        totalTestResults: patient.testResults?.length || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getDoctorById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const doctor = await User.findOne({
      where: { id, role: 'doctor' },
      attributes: { exclude: ['password'] },
      include: [
        {
          model: DoctorProfile,
          required: true
        },
        {
          model: Appointment,
          as: 'doctorAppointments',
          include: [{
            model: User,
            as: 'patient',
            attributes: ['id', 'name', 'email']
          }]
        },
        {
          model: Prescription,
          as: 'doctorPrescriptions',
          include: [{
            model: User,
            as: 'patient',
            attributes: ['id', 'name', 'email']
          }]
        }
      ]
    });

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const doctorData = doctor.toJSON();
    const totalAppointments = doctorData.doctorAppointments?.length || 0;
    const completedAppointments = doctorData.doctorAppointments?.filter(
      apt => apt.status === 'completed'
    ).length || 0;

    res.json({
      success: true,
      doctor: {
        ...doctorData,
        metrics: {
          totalAppointments,
          completedAppointments,
          appointmentCompletionRate: totalAppointments 
            ? ((completedAppointments / totalAppointments) * 100).toFixed(2)
            : 0,
          totalPrescriptions: doctorData.doctorPrescriptions?.length || 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};