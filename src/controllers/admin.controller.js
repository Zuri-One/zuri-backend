// src/controllers/admin.controller.js
const { User, Appointment, DoctorProfile, Prescription, TestResult, sequelize} = require('../models');
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

exports.getPatientStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalPatients,
      newPatientsToday,
      activePatients,
      pendingAppointments,
      genderStats,
      weeklyRegistrations
    ] = await Promise.all([
      // Total patients count
      User.count({
        where: { 
          role: 'patient'
        }
      }),

      // New patients today
      User.count({
        where: {
          role: 'patient',
          createdAt: {
            [Op.gte]: today
          }
        }
      }),

      // Active patients
      User.count({
        where: {
          role: 'patient',
          isActive: true
        }
      }),

      // Pending appointments
      Appointment.count({
        where: {
          status: 'pending'
        }
      }),

      // Gender distribution
      User.findAll({
        where: { role: 'patient' },
        attributes: [
          'gender',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['gender']
      }),

      // Weekly registration trend (last 7 days)
      User.findAll({
        where: {
          role: 'patient',
          createdAt: {
            [Op.gte]: new Date(new Date() - 7 * 24 * 60 * 60 * 1000)
          }
        },
        attributes: [
          [sequelize.fn('date', sequelize.col('createdAt')), 'date'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: [sequelize.fn('date', sequelize.col('createdAt'))]
      })
    ]);

    // Process gender stats
    const patientsByGender = {
      male: 0,
      female: 0,
      other: 0
    };

    genderStats.forEach(stat => {
      const gender = stat.gender?.toLowerCase() || 'other';
      patientsByGender[gender] = parseInt(stat.dataValues.count);
    });

    // Format registration trend
    const registrationTrend = weeklyRegistrations.map(day => ({
      date: day.dataValues.date,
      count: parseInt(day.dataValues.count)
    }));

    // Fill in missing days with zero counts
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const filledRegistrationTrend = last7Days.map(date => ({
      date,
      count: registrationTrend.find(day => day.date === date)?.count || 0
    }));

    res.json({
      success: true,
      stats: {
        totalPatients,
        newPatientsToday,
        activePatients,
        pendingAppointments,
        patientsByGender,
        registrationTrend: filledRegistrationTrend
      }
    });

  } catch (error) {
    console.error('Error fetching patient stats:', error);
    next(error);
  }
};

// Add this endpoint for single patient retrieval by email
exports.getPatientByEmail = async (req, res, next) => {
  try {
    const { email } = req.params;

    const patient = await User.findOne({
      where: {
        email: email.toLowerCase(),
        role: 'patient'
      },
      attributes: { exclude: ['password'] }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    res.json({
      success: true,
      patient
    });

  } catch (error) {
    console.error('Error fetching patient by email:', error);
    next(error);
  }
};


exports.searchPatients = async (req, res, next) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim() === '') {
      return res.json({
        success: true,
        patients: []
      });
    }

    const patients = await User.findAll({
      where: {
        role: {
          [Op.or]: [{ [Op.eq]: 'patient' }, { [Op.eq]: 'patient' }]
        },
        [Op.or]: [
          { name: { [Op.iLike]: `%${q}%` } },
          { email: { [Op.iLike]: `%${q}%` } },
          { nationalId: { [Op.iLike]: `%${q}%` } },
          { registrationId: { [Op.iLike]: `%${q}%` } },
          { contactNumber: { [Op.iLike]: `%${q}%` } }
        ]
      },
      attributes: { 
        exclude: ['password'],
        include: [
          'id', 'name', 'email', 'contactNumber', 
          'gender', 'bloodGroup', 'nationalId', 
          'registrationId', 'isActive'
        ] 
      }
    });

    console.log('Search results:', patients);

    res.json({
      success: true,
      patients: patients.map(patient => patient.toJSON())
    });
  } catch (error) {
    console.error('Search error:', error);
    next(error);
  }
};

exports.getAllStaff = async (req, res, next) => {
  try {
    const staff = await User.findAll({
      where: {
        [Op.and]: [
          { role: { [Op.ne]: 'patient' } }, // handle one at a time instead of notIn
          { role: { [Op.ne]: 'admin' } },
          { isActive: true }
        ]
      },
      attributes: { exclude: ['password'] },
      include: [
        {
          model: DoctorProfile,
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      staff: staff.map(member => member.toJSON())
    });
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch staff members',
      error: error.message
    });
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