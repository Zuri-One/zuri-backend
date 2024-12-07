// src/controllers/patient.controller.js
const { Op } = require('sequelize');
const { User, Appointment, DoctorProfile, DoctorAvailability, TestResult, HealthMetric } = require('../models');
const moment = require('moment');

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