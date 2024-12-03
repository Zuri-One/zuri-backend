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


exports.getAllStaff = async (req, res, next) => {
  try {
    const staff = await User.findAll({
      where: { 
        role: {
          [Op.notIn]: ['patient', 'admin']
        }
      },
      attributes: { exclude: ['password'] },
      include: [
        {
          model: DoctorProfile,
          required: false // Make it optional since not all staff are doctors
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      staff: staff.map(member => ({
        ...member.toJSON(),
      }))
    });
  } catch (error) {
    next(error);
  }
};

// Update staff status
exports.updateStaffStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['active', 'suspended', 'on_leave'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const staff = await User.findOne({
      where: { 
        id,
        role: {
          [Op.notIn]: ['patient', 'admin']
        }
      }
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    await staff.update({ status });

    res.json({
      success: true,
      message: 'Staff status updated successfully',
      staff: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        status: staff.status
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete staff member
exports.deleteStaff = async (req, res, next) => {
  try {
    const { id } = req.params;

    const staff = await User.findOne({
      where: { 
        id,
        role: {
          [Op.notIn]: ['patient', 'admin']
        }
      }
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    // Soft delete
    await staff.update({ isActive: false });
    // If you want hard delete instead:
    // await staff.destroy();

    res.json({
      success: true,
      message: 'Staff member deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Update staff details
exports.updateStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      department,
      licenseNumber,
      specialization,
      contactNumber
    } = req.body;

    const staff = await User.findOne({
      where: { 
        id,
        role: {
          [Op.notIn]: ['patient', 'admin']
        }
      },
      include: [
        {
          model: DoctorProfile,
          required: false
        }
      ]
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    // Update basic staff details
    await staff.update({
      name,
      department,
      licenseNumber,
      contactNumber
    });

    // If staff is a doctor, update their profile
    if (staff.role === 'doctor' && staff.DoctorProfile) {
      await staff.DoctorProfile.update({
        specialization
      });
    }

    res.json({
      success: true,
      message: 'Staff details updated successfully',
      staff: {
        ...staff.toJSON(),
        DoctorProfile: staff.DoctorProfile
      }
    });
  } catch (error) {
    next(error);
  }
};