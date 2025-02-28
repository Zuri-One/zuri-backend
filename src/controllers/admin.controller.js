// src/controllers/admin.controller.js
const { User, Appointment, DoctorProfile, Prescription, TestResult, sequelize} = require('../models');
const { Op } = require('sequelize');

const { Triage, Department } = require('../models');


exports.getAllPatients = async (req, res, next) => {
  try {
    const patients = await User.findAll({
      where: { role: 'PATIENT' },
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Appointment,
          as: 'patientAppointments',
          include: [{
            model: User,
            as: 'DOCTOR',
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
            as: 'DOCTOR',
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
        role: 'PATIENT',
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
      where: { role: 'DOCTOR' },
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
            as: 'PATIENT',
            attributes: ['id', 'name', 'email']
          }]
        },
        {
          model: Prescription,
          as: 'doctorPrescriptions',
          include: [{
            model: User,
            as: 'PATIENT',
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
      where: { id, role: 'PATIENT' },
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Appointment,
          as: 'patientAppointments',
          include: [{
            model: User,
            as: 'DOCTOR',
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
            as: 'DOCTOR',
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
      where: { id, role: 'DOCTOR' },
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
            as: 'PATIENT',
            attributes: ['id', 'name', 'email']
          }]
        },
        {
          model: Prescription,
          as: 'doctorPrescriptions',
          include: [{
            model: User,
            as: 'PATIENT',
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
          role: 'PATIENT'
        }
      }),

      // New patients today
      User.count({
        where: {
          role: 'PATIENT',
          createdAt: {
            [Op.gte]: today
          }
        }
      }),

      // Active patients
      User.count({
        where: {
          role: 'PATIENT',
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
        where: { role: 'PATIENT' },
        attributes: [
          'gender',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['gender']
      }),

      // Weekly registration trend (last 7 days)
      User.findAll({
        where: {
          role: 'PATIENT',
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
        role: 'PATIENT'
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

exports.searchStaff = async (req, res, next) => {
  try {
    const { 
      q,                  // For general search (name, email, phone, employee ID)
      department,         // Filter by department
      role,               // Filter by role
      specialization,     // Filter by specialization (for doctors)
      status              // Filter by status
    } = req.query;
    
    // Build where conditions
    const whereConditions = {
      [Op.and]: [
        { role: { [Op.ne]: 'PATIENT' } },
        { role: { [Op.ne]: 'ADMIN' } }
      ]
    };
    
    // General search
    if (q && q.trim() !== '') {
      whereConditions[Op.or] = [
        { surname: { [Op.iLike]: `%${q}%` } },
        { otherNames: { [Op.iLike]: `%${q}%` } },
        { email: { [Op.iLike]: `%${q}%` } },
        { telephone1: { [Op.iLike]: `%${q}%` } },
        { employeeId: { [Op.iLike]: `%${q}%` } },
        { staffId: { [Op.iLike]: `%${q}%` } }
      ];
    }
    
    // Department filter
    if (department) {
      whereConditions.departmentId = department;
    }
    
    // Role filter
    if (role) {
      whereConditions.role = role.toUpperCase();
    }
    
    // Status filter
    if (status) {
      whereConditions.status = status.toLowerCase();
    }
    
    // Include options
    const includeOptions = [
      {
        model: Department,
        as: 'assignedDepartment',
        attributes: ['id', 'name', 'code']
      },
      {
        model: Department,
        as: 'primaryDepartment',
        attributes: ['id', 'name', 'code']
      }
    ];
    
    // If specialization filter is provided, add doctor profile include
    if (specialization) {
      includeOptions.push({
        model: DoctorProfile,
        required: true,
        where: {
          specialization: { [Op.contains]: [specialization] }
        }
      });
    } else {
      // Add DoctorProfile as optional include
      includeOptions.push({
        model: DoctorProfile,
        required: false
      });
    }
    
    // Find staff with filters
    const staff = await User.findAll({
      where: whereConditions,
      attributes: { 
        exclude: ['password', 'resetPasswordToken', 'emailVerificationToken', 'emailVerificationCode'] 
      },
      include: includeOptions,
      order: [['createdAt', 'DESC']]
    });
    
    // Format response
    const formattedStaff = staff.map(member => {
      const memberData = member.toJSON();
      
      return {
        id: memberData.id,
        fullName: `${memberData.surname} ${memberData.otherNames}`,
        email: memberData.email,
        employeeId: memberData.employeeId,
        staffId: memberData.staffId,
        role: memberData.role,
        department: memberData.assignedDepartment,
        primaryDepartment: memberData.primaryDepartment,
        telephone1: memberData.telephone1,
        telephone2: memberData.telephone2,
        designation: memberData.designation,
        specialization: memberData.specialization,
        licenseNumber: memberData.licenseNumber,
        status: memberData.status,
        isActive: memberData.isActive,
        // Include additional details for doctors
        doctorInfo: memberData.role.includes('DOCTOR') ? {
          specialization: memberData.DoctorProfile?.specialization || [],
          qualification: memberData.qualification || [],
          expertise: memberData.expertise || {}
        } : null
      };
    });
    
    res.json({
      success: true,
      staff: formattedStaff,
      count: formattedStaff.length
    });
    
  } catch (error) {
    console.error('Error searching staff:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search staff members',
      error: error.message
    });
  }
};

/**
 * Update specific staff details
 * @route PUT /api/v1/users/staff/:id/update-details
 */
exports.updateStaffDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      surname,
      otherNames,
      telephone1,
      telephone2,
      email,
      postalAddress,
      postalCode,
      town,
      areaOfResidence,
      departmentId,
      primaryDepartmentId,
      secondaryDepartments,
      designation,
      licenseNumber,
      specialization,
      expertise,
      dutySchedule,
      workSchedule
    } = req.body;

    // Find the staff member
    const staff = await User.findOne({
      where: { 
        id,
        role: {
          [Op.notIn]: ['PATIENT', 'ADMIN']
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

    // Validate if email is changed and is already in use
    if (email && email !== staff.email) {
      const existingUser = await User.findOne({
        where: {
          email: email.toLowerCase(),
          id: { [Op.ne]: id }
        }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already in use'
        });
      }
    }

    // Prepare update data (only include fields that are provided)
    const updateData = {};
    
    if (surname) updateData.surname = surname;
    if (otherNames) updateData.otherNames = otherNames;
    if (telephone1) updateData.telephone1 = telephone1;
    if (telephone2) updateData.telephone2 = telephone2;
    if (email) updateData.email = email.toLowerCase();
    if (postalAddress) updateData.postalAddress = postalAddress;
    if (postalCode) updateData.postalCode = postalCode;
    if (town) updateData.town = town;
    if (areaOfResidence) updateData.areaOfResidence = areaOfResidence;
    if (departmentId) updateData.departmentId = departmentId;
    if (primaryDepartmentId) updateData.primaryDepartmentId = primaryDepartmentId;
    if (secondaryDepartments) updateData.secondaryDepartments = secondaryDepartments;
    if (designation) updateData.designation = designation;
    if (licenseNumber) updateData.licenseNumber = licenseNumber;
    if (specialization) updateData.specialization = Array.isArray(specialization) ? specialization : [specialization];
    if (expertise) updateData.expertise = expertise;
    if (dutySchedule) updateData.dutySchedule = dutySchedule;
    if (workSchedule) updateData.workSchedule = workSchedule;

    // Update the staff member
    await staff.update(updateData);

    // If staff is a doctor and has additional profile details, update them
    if (staff.role.includes('DOCTOR') && specialization && staff.DoctorProfile) {
      await staff.DoctorProfile.update({
        specialization: Array.isArray(specialization) ? specialization : [specialization]
      });
    }

    // Get updated staff data
    const updatedStaff = await User.findOne({
      where: { id },
      attributes: { 
        exclude: ['password', 'resetPasswordToken', 'emailVerificationToken', 'emailVerificationCode'] 
      },
      include: [
        {
          model: Department,
          as: 'assignedDepartment',
          attributes: ['id', 'name', 'code']
        },
        {
          model: Department,
          as: 'primaryDepartment',
          attributes: ['id', 'name', 'code']
        },
        {
          model: DoctorProfile,
          required: false
        }
      ]
    });

    res.json({
      success: true,
      message: 'Staff details updated successfully',
      staff: updatedStaff
    });
  } catch (error) {
    console.error('Error updating staff details:', error);
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
          [Op.or]: [{ [Op.eq]: 'PATIENT' }, { [Op.eq]: 'PATIENT' }]
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
          { role: { [Op.ne]: 'PATIENT' } }, // handle one at a time instead of notIn
          { role: { [Op.ne]: 'ADMIN' } },
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


exports.getWaitingPatients = async (req, res, next) => {
  try {
    const waitingPatients = await User.findAll({
      where: { 
        role: 'PATIENT',
        isActive: true 
      },
      include: [{
        model: Triage,
        as: 'triageAssessments',
        required: false,
        where: {
          status: {
            [Op.notIn]: ['COMPLETED', 'TRANSFERRED']
          }
        },
        separate: true,
        limit: 1,
        order: [['createdAt', 'DESC']]
      }],
      attributes: ['id', 'name', 'registrationId', 'contactNumber', 'createdAt']
    });

    // Calculate waiting time and priority for each patient
    const formattedPatients = waitingPatients.map(patient => {
      const waitingTime = Math.floor(
        (new Date() - new Date(patient.createdAt)) / (1000 * 60)
      );

      // Determine priority level based on waiting time and any available triage data
      let priorityLevel = 'NORMAL';
      const triageAssessment = patient.triageAssessments?.[0];
      
      if (triageAssessment) {
        if (triageAssessment.category === 'RED') priorityLevel = 'HIGH';
        else if (triageAssessment.category === 'YELLOW') priorityLevel = 'MEDIUM';
      } else if (waitingTime > 45) {
        priorityLevel = 'HIGH';
      } else if (waitingTime > 30) {
        priorityLevel = 'MEDIUM';
      }

      return {
        id: patient.id,
        name: patient.name,
        registrationId: patient.registrationId,
        contactNumber: patient.contactNumber,
        waitingTime,
        priorityLevel,
        chiefComplaint: triageAssessment?.chiefComplaint || 'Awaiting assessment',
        createdAt: patient.createdAt
      };
    });

    // Sort patients by priority and waiting time
    const sortedPatients = formattedPatients.sort((a, b) => {
      if (a.priorityLevel === 'HIGH' && b.priorityLevel !== 'HIGH') return -1;
      if (a.priorityLevel !== 'HIGH' && b.priorityLevel === 'HIGH') return 1;
      return b.waitingTime - a.waitingTime;
    });

    res.json({
      success: true,
      patients: sortedPatients
    });

  } catch (error) {
    console.error('Error fetching waiting patients:', error);
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
          [Op.notIn]: ['PATIENT', 'ADMIN']
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
          [Op.notIn]: ['PATIENT', 'ADMIN']
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
          [Op.notIn]: ['PATIENT', 'ADMIN']
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
    if (staff.role === 'DOCTOR' && staff.DoctorProfile) {
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