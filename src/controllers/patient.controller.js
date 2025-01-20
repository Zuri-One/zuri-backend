// src/controllers/patient.controller.js
const { Op } = require('sequelize');
const { User, Appointment, DoctorProfile, DoctorAvailability, TestResult, HealthMetric, Patient } = require('../models');
const moment = require('moment');
const { validate: isUUID } = require('uuid');


exports.getPatientDashboard = async (req, res, next) => {
  try {
    const patientId = req.user.id;
    const today = moment().startOf('day');
    const endOfDay = moment().endOf('day');

    // Get various appointment and health statistics
    const [
      upcomingAppointments,
      pastAppointments,
      todayAppointments,
      recentPrescriptions
    ] = await Promise.all([
      // Upcoming appointments
      Appointment.findAll({
        where: {
          patientId,
          dateTime: {
            [Op.gt]: new Date()
          },
          status: {
            [Op.notIn]: ['cancelled', 'completed']
          }
        },
        include: [
          {
            model: User,
            as: 'DOCTOR',
            attributes: ['id', 'name'],
            include: [
              {
                model: DoctorProfile,
                attributes: ['specialization']
              }
            ]
          }
        ],
        order: [['dateTime', 'ASC']],
        limit: 5
      }),
      // Past appointments
      Appointment.findAll({
        where: {
          patientId,
          dateTime: {
            [Op.lt]: new Date()
          }
        },
        order: [['dateTime', 'DESC']],
        limit: 5
      }),
      // Today's appointments
      Appointment.findAll({
        where: {
          patientId,
          dateTime: {
            [Op.between]: [today.toDate(), endOfDay.toDate()]
          }
        },
        include: [
          {
            model: User,
            as: 'DOCTOR',
            attributes: ['id', 'name'],
            include: [
              {
                model: DoctorProfile,
                attributes: ['specialization']
              }
            ]
          }
        ]
      }),
      // Recent prescriptions from appointments
      Appointment.findAll({
        where: {
          patientId,
          prescription: {
            [Op.not]: null
          }
        },
        order: [['updatedAt', 'DESC']],
        limit: 5,
        attributes: ['id', 'dateTime', 'prescription']
      })
    ]);

    // Format the dashboard data
    const dashboardData = {
      upcomingAppointments: upcomingAppointments.map(apt => ({
        id: apt.id,
        doctorName: apt.doctor.name,
        specialty: apt.doctor.DoctorProfile?.specialization,
        dateTime: moment(apt.dateTime).format('MMMM Do YYYY, h:mm a'),
        type: apt.type,
        status: apt.status
      })),
      todayAppointments: todayAppointments.map(apt => ({
        id: apt.id,
        doctorName: apt.doctor.name,
        specialty: apt.doctor.DoctorProfile?.specialization,
        time: moment(apt.dateTime).format('h:mm a'),
        type: apt.type
      })),
      recentPrescriptions: recentPrescriptions.map(apt => ({
        id: apt.id,
        date: moment(apt.dateTime).format('MMMM Do YYYY'),
        prescription: apt.prescription
      })),
      stats: {
        totalAppointments: pastAppointments.length + upcomingAppointments.length,
        upcomingCount: upcomingAppointments.length,
        todayCount: todayAppointments.length
      }
    };

    res.json(dashboardData);
  } catch (error) {
    next(error);
  }
};

exports.searchDoctors = async (req, res, next) => {
  try {
    const { specialization, date } = req.query;
    const whereClause = {
      role: 'DOCTOR',
      isActive: true
    };

    const doctors = await User.findAll({
      where: whereClause,
      include: [
        {
          model: DoctorProfile,
          where: specialization ? { specialization } : {},
        },
        {
          model: DoctorAvailability,
          attributes: ['weeklySchedule', 'exceptions']
        }
      ]
    });

    // If date is provided, filter doctors based on availability
    let availableDoctors = doctors;
    if (date) {
      const requestedDate = moment(date);
      const dayOfWeek = requestedDate.format('dddd').toLowerCase();

      availableDoctors = doctors.filter(doctor => {
        const availability = doctor.DoctorAvailability;
        if (!availability) return false;

        // Check if doctor has slots on the requested day
        const daySchedule = availability.weeklySchedule[dayOfWeek];
        if (!daySchedule || !daySchedule.length) return false;

        // Check for exceptions
        const hasException = availability.exceptions.some(exc =>
          moment(exc.date).isSame(requestedDate, 'day') && !exc.isAvailable
        );
        if (hasException) return false;

        return true;
      });
    }

    const formattedDoctors = availableDoctors.map(doctor => ({
      id: doctor.id,
      name: doctor.name,
      specialization: doctor.DoctorProfile?.specialization,
      qualifications: doctor.DoctorProfile?.qualifications,
      experience: doctor.DoctorProfile?.experience,
      consultationFee: doctor.DoctorProfile?.consultationFee,
      rating: doctor.DoctorProfile?.rating,
      availability: doctor.DoctorAvailability?.weeklySchedule
    }));

    res.json({ doctors: formattedDoctors });
  } catch (error) {
    next(error);
  }
};

exports.getPatientAppointments = async (req, res, next) => {
  try {
    const patientId = req.user.id;
    const today = moment().startOf('day');
    const endOfDay = moment().endOf('day');

    const appointments = await Appointment.findAll({
      where: {
        patientId,
        dateTime: {
          [Op.gt]: new Date()
        },
        status: {
          [Op.notIn]: ['cancelled', 'completed']
        }
      },
      include: [
        {
          model: User,
          as: 'DOCTOR',
          attributes: ['id', 'name'],
          include: [
            {
              model: DoctorProfile,
              attributes: ['specialization']
            }
          ]
        }
      ],
      order: [['dateTime', 'ASC']],
      limit: 5
    });

    const formattedAppointments = appointments.map(apt => ({
      id: apt.id,
      doctorName: apt.doctor.name,
      specialty: apt.doctor.DoctorProfile?.specialization,
      date: moment(apt.dateTime).format('MMMM Do YYYY'),
      time: moment(apt.dateTime).format('h:mm a'),
      type: apt.type,
      status: apt.status
    }));

    res.json({
      success: true,
      appointments: appointments || [] // Already in correct format
    });
  } catch (error) {
    next(error);
  }
};

exports.getHealthMetrics = async (req, res, next) => {
  try {
    const metrics = await HealthMetric.findAll({
      where: {
        patientId: req.user.id
      },
      order: [['createdAt', 'DESC']],
      limit: 30
    });

    res.json({
      success: true,
      metrics: metrics || [] // Standardize to always return an object with metrics array
    });
  } catch (error) {
    next(error);
  }
};
exports.getTestResults = async (req, res, next) => {
  try {
    const results = await TestResult.findAll({
      where: {
        patientId: req.user.id
      },
      order: [['date', 'DESC']],
      limit: 10
    });

    res.json({
      success: true,
      testResults: results || [] // Standardize to match other responses
    });
  } catch (error) {
    next(error);
  }
};

exports.getAppointmentHistory = async (req, res, next) => {
  try {
    const patientId = req.user.id;
    const { status, startDate, endDate } = req.query;

    const whereClause = {
      patientId
    };

    if (status) {
      whereClause.status = status;
    }

    if (startDate || endDate) {
      whereClause.dateTime = {};
      if (startDate) whereClause.dateTime[Op.gte] = new Date(startDate);
      if (endDate) whereClause.dateTime[Op.lte] = new Date(endDate);
    }

    const appointments = await Appointment.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'DOCTOR',
          attributes: ['id', 'name'],
          include: [
            {
              model: DoctorProfile,
              attributes: ['specialization']
            }
          ]
        }
      ],
      order: [['dateTime', 'DESC']]
    });

    const formattedAppointments = appointments.map(apt => ({
      id: apt.id,
      doctorName: apt.doctor.name,
      specialty: apt.doctor.DoctorProfile?.specialization,
      dateTime: moment(apt.dateTime).format('MMMM Do YYYY, h:mm a'),
      type: apt.type,
      status: apt.status,
      notes: apt.notes,
      prescription: apt.prescription,
      diagnosis: apt.diagnosis
    }));

    res.json({ appointments: formattedAppointments });
  } catch (error) {
    next(error);
  }



};

exports.getAllPatients = async (req, res, next) => {
  try {
    const { page, limit, noPagination } = req.query;
    
    // Base query options
    const queryOptions = {
      attributes: [
        'id',
        'patientNumber',
        'surname',
        'otherNames',
        'sex',
        'dateOfBirth',
        'telephone1',
        'email',
        'nationality',
        'residence',
        'town',
        'isEmergency',
        'isRevisit',
        'status',
        'createdAt'
      ],
      order: [['createdAt', 'DESC']]
    };

    // If pagination is explicitly disabled or not specified
    if (noPagination === 'true') {
      const patients = await Patient.findAll(queryOptions);
      return res.json({
        success: true,
        data: {
          patients: patients.map(patient => ({
            id: patient.id,
            patientNumber: patient.patientNumber,
            fullName: `${patient.surname} ${patient.otherNames}`,
            age: moment().diff(moment(patient.dateOfBirth), 'years'),
            sex: patient.sex,
            contact: patient.telephone1,
            email: patient.email || 'N/A',
            location: `${patient.residence}, ${patient.town}`,
            status: patient.status,
            isEmergency: patient.isEmergency,
            isRevisit: patient.isRevisit,
            registeredOn: moment(patient.createdAt).format('MMMM Do YYYY')
          })),
          total: patients.length
        }
      });
    }

    // Pagination options
    const currentPage = parseInt(page) || 1;
    const itemsPerPage = Math.min(parseInt(limit) || 10, 100); // Max 100 items per page
    
    // Add pagination to query
    const { count, rows: patients } = await Patient.findAndCountAll({
      ...queryOptions,
      offset: (currentPage - 1) * itemsPerPage,
      limit: itemsPerPage
    });

    // Calculate total pages
    const totalPages = Math.ceil(count / itemsPerPage);

    // Format response
    res.json({
      success: true,
      data: {
        patients: patients.map(patient => ({
          id: patient.id,
          patientNumber: patient.patientNumber,
          fullName: `${patient.surname} ${patient.otherNames}`,
          age: moment().diff(moment(patient.dateOfBirth), 'years'),
          sex: patient.sex,
          contact: patient.telephone1,
          email: patient.email || 'N/A',
          location: `${patient.residence}, ${patient.town}`,
          status: patient.status,
          isEmergency: patient.isEmergency,
          isRevisit: patient.isRevisit,
          registeredOn: moment(patient.createdAt).format('MMMM Do YYYY')
        })),
        pagination: {
          total: count,
          pages: totalPages,
          page: currentPage,
          limit: itemsPerPage
        }
      }
    });

  } catch (error) {
    console.error('Error fetching patients:', error);
    next(error);
  }
};


exports.searchPatients = async (req, res, next) => {
  try {
    const { searchTerm } = req.query;

    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        message: 'Search term is required'
      });
    }

    // Search using either phone, patient number, or email
    const patients = await Patient.findAll({
      where: {
        [Op.or]: [
          { telephone1: searchTerm },
          { patientNumber: searchTerm },
          { email: searchTerm }
        ]
      },
      attributes: {
        exclude: [
          'password',
          'resetPasswordToken',
          'resetPasswordExpires',
          'emailVerificationToken',
          'emailVerificationCode',
          'emailVerificationExpires',
          'twoFactorSecret'
        ]
      }
    });

    // Format the response similar to getPatientDetails
    const formattedPatients = patients.map(patient => ({
      personalInfo: {
        id: patient.id,
        patientNumber: patient.patientNumber,
        surname: patient.surname,
        otherNames: patient.otherNames,
        fullName: `${patient.surname} ${patient.otherNames}`,
        sex: patient.sex,
        dateOfBirth: patient.dateOfBirth,
        age: moment().diff(moment(patient.dateOfBirth), 'years'),
        nationality: patient.nationality,
        occupation: patient.occupation
      },
      contactInfo: {
        telephone1: patient.telephone1,
        telephone2: patient.telephone2 || null,
        email: patient.email || null,
        residence: patient.residence,
        town: patient.town,
        postalAddress: patient.postalAddress || null,
        postalCode: patient.postalCode || null
      },
      identification: {
        idType: patient.idType,
        idNumber: patient.idNumber || null
      },
      emergencyContact: patient.nextOfKin,
      medicalInfo: {
        medicalHistory: patient.medicalHistory || {
          existingConditions: [],
          allergies: []
        },
        insuranceInfo: patient.insuranceInfo || {
          scheme: null,
          provider: null,
          membershipNumber: null,
          principalMember: null
        }
      },
      status: {
        isEmergency: patient.isEmergency,
        isRevisit: patient.isRevisit,
        currentStatus: patient.status,
        isActive: patient.isActive
      },
      registrationInfo: {
        registeredOn: moment(patient.createdAt).format('MMMM Do YYYY, h:mm:ss a'),
        registrationNotes: patient.registrationNotes || null,
        lastUpdated: moment(patient.updatedAt).format('MMMM Do YYYY, h:mm:ss a'),
        paymentScheme: patient.paymentScheme
      }
    }));

    res.json({
      success: true,
      count: formattedPatients.length,
      patients: formattedPatients
    });

  } catch (error) {
    console.error('Error searching patients:', error);
    next(error);
  }
};


exports.getPatientRegistrations = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date is required'
      });
    }

    // Parse dates
    const start = moment(startDate).startOf('day');
    const end = endDate ? moment(endDate).endOf('day') : moment(startDate).endOf('day');

    // Validate dates
    if (!start.isValid() || !end.isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Please use YYYY-MM-DD'
      });
    }

    // Ensure start date is not after end date
    if (start.isAfter(end)) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be after end date'
      });
    }

    const patients = await Patient.findAll({
      where: {
        createdAt: {
          [Op.between]: [start.toDate(), end.toDate()]
        }
      },
      attributes: [
        'id', 
        'patientNumber',
        'surname',
        'otherNames',
        'sex',
        'dateOfBirth',
        'telephone1',
        'email',
        'nationality',
        'residence',
        'town',
        'isEmergency',
        'status',
        'createdAt'
      ],
      order: [['createdAt', 'DESC']]
    });

    // Format the response
    const formattedPatients = patients.map(patient => ({
      id: patient.id,
      patientNumber: patient.patientNumber,
      fullName: `${patient.surname} ${patient.otherNames}`,
      sex: patient.sex,
      age: moment().diff(moment(patient.dateOfBirth), 'years'),
      contact: patient.telephone1,
      email: patient.email || 'N/A',
      nationality: patient.nationality,
      location: `${patient.residence}, ${patient.town}`,
      isEmergency: patient.isEmergency,
      status: patient.status,
      registrationDate: moment(patient.createdAt).format('MMMM Do YYYY, h:mm:ss a')
    }));

    // Get registration statistics
    const stats = {
      totalRegistrations: patients.length,
      emergencyCases: patients.filter(p => p.isEmergency).length,
      byGender: {
        male: patients.filter(p => p.sex === 'MALE').length,
        female: patients.filter(p => p.sex === 'FEMALE').length,
        other: patients.filter(p => p.sex === 'OTHER').length
      }
    };

    res.json({
      success: true,
      dateRange: {
        from: start.format('MMMM Do YYYY'),
        to: end.format('MMMM Do YYYY')
      },
      stats,
      patients: formattedPatients
    });

  } catch (error) {
    console.error('Error fetching patient registrations:', error);
    next(error);
  }
};


exports.getPatientDetails = async (req, res, next) => {
  try {
    const { identifier } = req.params;

    // Build where clause based on identifier type
    const whereClause = isUUID(identifier) 
      ? { id: identifier }
      : { patientNumber: identifier };

    const patient = await Patient.findOne({
      where: whereClause,
      attributes: {
        exclude: [
          'password',
          'resetPasswordToken',
          'resetPasswordExpires',
          'emailVerificationToken',
          'emailVerificationCode',
          'emailVerificationExpires',
          'twoFactorSecret'
        ]
      }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Format the response
    const formattedPatient = {
      personalInfo: {
        id: patient.id,
        patientNumber: patient.patientNumber,
        surname: patient.surname,
        otherNames: patient.otherNames,
        fullName: `${patient.surname} ${patient.otherNames}`,
        sex: patient.sex,
        dateOfBirth: patient.dateOfBirth,
        age: moment().diff(moment(patient.dateOfBirth), 'years'),
        nationality: patient.nationality,
        occupation: patient.occupation
      },
      contactInfo: {
        telephone1: patient.telephone1,
        telephone2: patient.telephone2 || null,
        email: patient.email || null,
        residence: patient.residence,
        town: patient.town,
        postalAddress: patient.postalAddress || null,
        postalCode: patient.postalCode || null
      },
      identification: {
        idType: patient.idType,
        idNumber: patient.idNumber || null
      },
      emergencyContact: patient.nextOfKin,
      medicalInfo: {
        medicalHistory: patient.medicalHistory || {
          existingConditions: [],
          allergies: []
        },
        insuranceInfo: patient.insuranceInfo || {
          scheme: null,
          provider: null,
          membershipNumber: null,
          principalMember: null
        }
      },
      status: {
        isEmergency: patient.isEmergency,
        isRevisit: patient.isRevisit,
        currentStatus: patient.status,
        isActive: patient.isActive
      },
      registrationInfo: {
        registeredOn: moment(patient.createdAt).format('MMMM Do YYYY, h:mm:ss a'),
        registrationNotes: patient.registrationNotes || null,
        lastUpdated: moment(patient.updatedAt).format('MMMM Do YYYY, h:mm:ss a'),
        paymentScheme: patient.paymentScheme
      }
    };

    res.json({
      success: true,
      patient: formattedPatient
    });

  } catch (error) {
    console.error('Error fetching patient details:', error);
    next(error);
  }
};

// Optional: Add a summary function for dashboard widgets
exports.getRegistrationSummary = async (req, res, next) => {
  try {
    const today = moment().startOf('day');
    const thisWeekStart = moment().startOf('week');
    const thisMonthStart = moment().startOf('month');

    const [todayCount, weekCount, monthCount] = await Promise.all([
      // Today's registrations
      Patient.count({
        where: {
          createdAt: {
            [Op.between]: [today.toDate(), moment().endOf('day').toDate()]
          }
        }
      }),
      // This week's registrations
      Patient.count({
        where: {
          createdAt: {
            [Op.between]: [thisWeekStart.toDate(), moment().endOf('day').toDate()]
          }
        }
      }),
      // This month's registrations
      Patient.count({
        where: {
          createdAt: {
            [Op.between]: [thisMonthStart.toDate(), moment().endOf('day').toDate()]
          }
        }
      })
    ]);

    res.json({
      success: true,
      registrations: {
        today: todayCount,
        thisWeek: weekCount,
        thisMonth: monthCount
      }
    });

  } catch (error) {
    console.error('Error fetching registration summary:', error);
    next(error);
  }
};