// src/controllers/doctor.controller.js
const { Op } = require('sequelize');
const { User, DoctorProfile, DoctorAvailability, Appointment } = require('../models');
const moment = require('moment');
// const { User, Appointment, DoctorProfile, DoctorAvailability } = require('../models');
const { google } = require('googleapis');
const { OAuth2 } = google.auth;
// const moment = require('moment');
const { generateMeetLink } = require('../utils/meet.util');
const { generateZoomLink } = require('../utils/zoom.util');
const { createWebRTCRoom } = require('../utils/webrtc.util');
const sendEmail = require('../utils/email.util');


exports.getDoctorStats = async (req, res, next) => {
  try {
    const doctorId = req.user.id;
    const today = moment().startOf('day');
    const endOfDay = moment().endOf('day');

    const [
      totalAppointments,
      newAppointments,
      cancelledAppointments,
      appointmentsToday,
      totalPatients
    ] = await Promise.all([
      Appointment.count({
        where: { doctorId }
      }),
      Appointment.count({
        where: {
          doctorId,
          createdAt: {
            [Op.gte]: moment().subtract(7, 'days').toDate()
          }
        }
      }),
      Appointment.count({
        where: {
          doctorId,
          status: 'cancelled'
        }
      }),
      Appointment.count({
        where: {
          doctorId,
          dateTime: {
            [Op.between]: [today.toDate(), endOfDay.toDate()]
          }
        }
      }),
      Appointment.count({
        where: { doctorId },
        distinct: true,
        col: 'patientId'
      })
    ]);

    res.json({
      totalAppointments,
      newAppointments,
      cancelledAppointments,
      appointmentsToday,
      totalPatients
    });
  } catch (error) {
    next(error);
  }
};

exports.getAvailableDoctors = async (req, res, next) => {
  try {
    const doctors = await User.findAll({
      where: {
        role: 'doctor',
        isActive: true
      },
      include: [{
        model: DoctorProfile,
        attributes: ['specialization', 'qualifications', 'consultationFee', 'isAvailableForVideo']
      }],
      attributes: ['id', 'name', 'email']
    });

    const availableDoctors = doctors.map(doctor => ({
      id: doctor.id,
      name: doctor.name,
      specialization: doctor.DoctorProfile?.specialization,
      qualifications: doctor.DoctorProfile?.qualifications,
      consultationFee: doctor.DoctorProfile?.consultationFee,
      isAvailableForVideo: doctor.DoctorProfile?.isAvailableForVideo
    }));

    res.json({ doctors: availableDoctors });
  } catch (error) {
    next(error);
  }
};

exports.getDoctorAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    const availability = await DoctorAvailability.findOne({
      where: { doctorId: id }
    });

    if (!availability) {
      return res.status(404).json({ message: 'No availability found for this doctor' });
    }

    const requestedDate = moment(date);
    const dayOfWeek = requestedDate.format('dddd').toLowerCase();
    
    // Get regular slots for the day from weeklySchedule
    const daySlots = availability.weeklySchedule[dayOfWeek] || [];
    
    // Check for exceptions
    const exception = availability.exceptions?.find(exc => 
      moment(exc.date).isSame(requestedDate, 'day')
    );

    if (exception && !exception.isAvailable) {
      return res.json({ 
        slots: [],
        message: 'Doctor is not available on this date'
      });
    }

    // Get existing appointments
    const existingAppointments = await Appointment.findAll({
      where: {
        doctorId: id,
        dateTime: {
          [Op.between]: [
            requestedDate.startOf('day').toDate(),
            requestedDate.endOf('day').toDate()
          ]
        },
        status: {
          [Op.notIn]: ['cancelled']
        }
      }
    });

    // Convert slots to available time slots
    const availableSlots = [];
    daySlots.forEach(slot => {
      const startTime = moment(slot.startTime, 'HH:mm');
      const endTime = moment(slot.endTime, 'HH:mm');
      const duration = availability.defaultSlotDuration;

      while (startTime.add(duration, 'minutes').isSameOrBefore(endTime)) {
        const timeStr = startTime.format('HH:mm');
        const isBooked = existingAppointments.some(apt => 
          moment(apt.dateTime).format('HH:mm') === timeStr
        );

        if (slot.isAvailable && !isBooked) {
          availableSlots.push({
            time: timeStr,
            available: true
          });
        }
        startTime.add(availability.bufferTime, 'minutes');
      }
    });

    res.json({ 
      slots: availableSlots,
      defaultDuration: availability.defaultSlotDuration
    });
  } catch (error) {
    next(error);
  }
};

exports.getAppointmentRequests = async (req, res, next) => {
  try {
    const doctorId = req.user.id;

    const requests = await Appointment.findAll({
      where: {
        doctorId,
        status: 'pending'
      },
      include: [
        {
          model: User,
          as: 'patient',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['dateTime', 'ASC']]
    });

    res.json({ requests });
  } catch (error) {
    next(error);
  }
};

exports.handleAppointmentRequest = async (req, res, next) => {
  try {
    const { id, action } = req.params;
    const doctorId = req.user.id;

    const appointment = await Appointment.findOne({
      where: {
        id,
        doctorId,
        status: 'pending'
      }
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment request not found' });
    }

    appointment.status = action === 'accept' ? 'confirmed' : 'cancelled';
    if (action === 'reject') {
      appointment.cancelledById = doctorId;
      appointment.cancelReason = 'Rejected by doctor';
    }

    await appointment.save();

    res.json({
      message: `Appointment ${action === 'accept' ? 'accepted' : 'rejected'} successfully`,
      appointment
    });
  } catch (error) {
    next(error);
  }
};

exports.getDoctorProfile = async (req, res, next) => {
  try {
    const doctorId = req.params.id || req.user.id;

    const profile = await DoctorProfile.findOne({
      where: { userId: doctorId },
      include: [
        {
          model: User,
          attributes: ['name', 'email']
        }
      ]
    });

    if (!profile) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }

    res.json({ profile });
  } catch (error) {
    next(error);
  }
};

exports.updateDoctorProfile = async (req, res, next) => {
  try {
    const doctorId = req.user.id;
    const {
      specialization,
      qualifications,
      experience,
      consultationFee,
      bio,
      languagesSpoken
    } = req.body;

    const [profile] = await DoctorProfile.upsert({
      userId: doctorId,
      specialization,
      qualifications,
      experience,
      consultationFee,
      bio,
      languagesSpoken
    });

    res.json({
      message: 'Profile updated successfully',
      profile
    });
  } catch (error) {
    next(error);
  }
};

exports.updateAvailability = async (req, res, next) => {
  try {
    const doctorId = req.user.id;
    const {
      weeklySchedule,
      exceptions,
      defaultSlotDuration,
      bufferTime,
      maxDailyAppointments,
      isAcceptingAppointments
    } = req.body;

    const [availability] = await DoctorAvailability.upsert({
      doctorId,
      weeklySchedule,
      exceptions,
      defaultSlotDuration,
      bufferTime,
      maxDailyAppointments,
      isAcceptingAppointments,
      lastUpdated: new Date()
    });

    res.json({
      message: 'Availability updated successfully',
      availability
    });
  } catch (error) {
    next(error);
  }
};

exports.validateAvailabilityQuery = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: 'Date parameter is required' });
    }

    const requestedDate = moment(date);
    if (!requestedDate.isValid()) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    if (requestedDate.isBefore(moment().startOf('day'))) {
      return res.status(400).json({ message: 'Cannot check availability for past dates' });
    }

    next();
  } catch (error) {
    next(error);
  }
};


exports.handleAppointmentRequest = async (req, res, next) => {
  try {
    const { id, action } = req.params;
    const { platform, dateTime } = req.body;
    const doctorId = req.user.id;

    const appointment = await Appointment.findOne({
      where: {
        id,
        doctorId,
        status: 'pending'
      },
      include: [
        {
          model: User,
          as: 'patient',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment request not found' });
    }

    if (action === 'accept') {
      let meetingDetails = null;

      // Generate meeting details if it's a video appointment
      if (appointment.type === 'video' && platform) {
        const meetingTime = dateTime || appointment.dateTime;
        const duration = 30; // Default duration in minutes

        try {
          if (platform === 'zoom') {
            meetingDetails = await generateZoomLink({
              topic: `Medical Consultation with Dr. ${req.user.name}`,
              startTime: meetingTime,
              duration,
              doctorEmail: req.user.email
            });
          } else if (platform === 'google-meet') {
            meetingDetails = await generateMeetLink({
              summary: `Medical Consultation - ${appointment.patient.name}`,
              description: appointment.reason,
              startTime: meetingTime,
              duration,
              attendees: [
                { email: appointment.patient.email },
                { email: req.user.email }
              ]
            });
          }
        } catch (error) {
          console.error('Video platform integration error:', error);
          return res.status(500).json({
            message: `Failed to set up ${platform} meeting. Please try again.`
          });
        }
      }

      // Update appointment
      appointment.status = 'confirmed';
      if (meetingDetails) {
        appointment.meetingLink = meetingDetails.joinUrl;
        appointment.meetingId = meetingDetails.meetingId;
        appointment.platform = platform;
        if (meetingDetails.password) {
          appointment.meetingPassword = meetingDetails.password;
        }
      }

      if (dateTime) {
        appointment.dateTime = dateTime;
      }

      await appointment.save();

      // Send confirmation email
      await sendEmail({
        to: appointment.patient.email,
        subject: 'Appointment Confirmed',
        html: generateAppointmentEmail('confirmation', {
          name: appointment.patient.name,
          date: moment(appointment.dateTime).format('MMMM Do YYYY'),
          time: moment(appointment.dateTime).format('h:mm a'),
          doctor: req.user.name,
          platform: meetingDetails?.platform,
          meetingLink: meetingDetails?.joinUrl,
          meetingId: meetingDetails?.meetingId,
          password: meetingDetails?.password
        })
      });

    } else {
      // Handle rejection
      appointment.status = 'cancelled';
      appointment.cancelledById = doctorId;
      appointment.cancelReason = 'Rejected by doctor';
      await appointment.save();

      // Send rejection email
      await sendEmail({
        to: appointment.patient.email,
        subject: 'Appointment Request Declined',
        html: generateAppointmentEmail('rejection', {
          name: appointment.patient.name,
          doctor: req.user.name,
          date: moment(appointment.dateTime).format('MMMM Do YYYY'),
          time: moment(appointment.dateTime).format('h:mm a')
        })
      });
    }

    res.json({
      message: `Appointment ${action === 'accept' ? 'confirmed' : 'rejected'} successfully`,
      appointment
    });
  } catch (error) {
    next(error);
  }
};

exports.getCalendarData = async (req, res, next) => {
  try {
    const doctorId = req.user.id;
    const { month, year } = req.query;

    // Get all appointments for the month
    const startDate = moment([year || moment().year(), month || moment().month()]).startOf('month');
    const endDate = moment(startDate).endOf('month');

    const appointments = await Appointment.findAll({
      where: {
        doctorId,
        dateTime: {
          [Op.between]: [startDate.toDate(), endDate.toDate()]
        },
        status: {
          [Op.not]: 'cancelled'
        }
      },
      include: [
        {
          model: User,
          as: 'patient',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['dateTime', 'ASC']]
    });

    // Get doctor's availability
    const availability = await DoctorAvailability.findOne({
      where: { doctorId }
    });

    // Format calendar data
    const calendarDays = [];
    const currentDate = startDate.clone();

    while (currentDate.isSameOrBefore(endDate)) {
      const dayAppointments = appointments.filter(apt => 
        moment(apt.dateTime).format('YYYY-MM-DD') === currentDate.format('YYYY-MM-DD')
      );

      // Check availability for this day
      const dayOfWeek = currentDate.format('dddd').toLowerCase();
      const daySlots = availability?.weeklySchedule[dayOfWeek] || [];
      const exception = availability?.exceptions?.find(exc => 
        moment(exc.date).isSame(currentDate, 'day')
      );

      calendarDays.push({
        date: currentDate.format('YYYY-MM-DD'),
        dayOfMonth: currentDate.date(),
        isToday: currentDate.isSame(moment(), 'day'),
        appointments: dayAppointments.map(apt => ({
          id: apt.id,
          patientName: apt.patient.name,
          type: apt.type,
          time: moment(apt.dateTime).format('HH:mm'),
          status: apt.status
        })),
        isAvailable: !exception?.isAvailable ? false : daySlots.some(slot => slot.isAvailable)
      });

      currentDate.add(1, 'day');
    }

    res.json({
      month: startDate.format('MMMM'),
      year: startDate.year(),
      days: calendarDays
    });

  } catch (error) {
    next(error);
  }
};