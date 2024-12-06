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
const zoomApi = require('../utils/video/zoom.util');
const { 
  generateAppointmentEmail, 
  generateAppointmentCancellationEmail,
  generateAppointmentUpdateEmail, 
  generateVideoAppointmentEmail
} = require('../utils/email-templates.util');
const { sequelize } = require('../config/database');
const { format } = require('date-fns');



exports.getCurrentAvailability = async (req, res, next) => {
  try {
    console.log('Current user:', req.user?.id);
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const doctorId = req.user.id;

    // Verify the user is a doctor
    if (req.user.role.toLowerCase() !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - Doctor only resource'
      });
    }

    const availability = await DoctorAvailability.findOne({
      where: { doctorId }
    });

    if (!availability) {
      // Return default schedule if none exists
      const defaultSchedule = {
        weeklySchedule: {
          monday: { isAvailable: true, slots: [{ start: '09:00', end: '17:00' }] },
          tuesday: { isAvailable: true, slots: [{ start: '09:00', end: '17:00' }] },
          wednesday: { isAvailable: true, slots: [{ start: '09:00', end: '17:00' }] },
          thursday: { isAvailable: true, slots: [{ start: '09:00', end: '17:00' }] },
          friday: { isAvailable: true, slots: [{ start: '09:00', end: '17:00' }] },
          saturday: { isAvailable: false, slots: [] },
          sunday: { isAvailable: false, slots: [] }
        },
        defaultSlotDuration: 30,
        bufferTime: 10,
        maxDailyAppointments: 16,
        isAcceptingAppointments: true
      };

      // Create default availability
      const newAvailability = await DoctorAvailability.create({
        doctorId,
        ...defaultSchedule
      });

      return res.json({
        success: true,
        data: newAvailability
      });
    }

    res.json({
      success: true,
      data: availability
    });
  } catch (error) {
    console.error('Error in getCurrentAvailability:', error);
    next(error);
  }
};

exports.updateAvailability = async (req, res, next) => {
  try {
    console.log('Updating availability for user:', req.user?.id);
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const doctorId = req.user.id;

    // Verify the user is a doctor
    if (req.user.role.toLowerCase() !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - Doctor only resource'
      });
    }

    const {
      weeklySchedule,
      defaultSlotDuration,
      bufferTime,
      maxDailyAppointments,
      isAcceptingAppointments
    } = req.body;

    console.log('Received availability data:', {
      weeklySchedule,
      defaultSlotDuration,
      bufferTime,
      maxDailyAppointments,
      isAcceptingAppointments
    });

    // Input validation
    if (!weeklySchedule || typeof weeklySchedule !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Weekly schedule is required and must be an object'
      });
    }

    // Validate each day's schedule
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    for (const day of days) {
      if (!weeklySchedule[day]) {
        return res.status(400).json({
          success: false,
          message: `Schedule for ${day} is missing`
        });
      }
    }

    try {
      // Update or create availability
      const [availability] = await DoctorAvailability.upsert({
        doctorId,
        weeklySchedule,
        defaultSlotDuration: defaultSlotDuration || 30,
        bufferTime: bufferTime || 10,
        maxDailyAppointments: maxDailyAppointments || 16,
        isAcceptingAppointments: isAcceptingAppointments ?? true,
        lastUpdated: new Date()
      });

      console.log('Availability updated successfully:', availability);

      res.json({
        success: true,
        message: 'Availability updated successfully',
        data: availability
      });
    } catch (upsertError) {
      console.error('Error during upsert:', upsertError);
      throw upsertError;
    }
  } catch (error) {
    console.error('Error in updateAvailability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update availability',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.updateAvailabilityExceptions = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const doctorId = req.user.id;
    const { exceptions } = req.body;

    // Validate exceptions array
    if (!Array.isArray(exceptions)) {
      return res.status(400).json({
        success: false,
        message: 'Exceptions must be an array'
      });
    }

    const availability = await DoctorAvailability.findOne({
      where: { doctorId }
    });

    if (!availability) {
      return res.status(404).json({
        success: false,
        message: 'No availability settings found'
      });
    }

    // Update exceptions
    await availability.update({
      exceptions,
      lastUpdated: new Date()
    });

    res.json({
      success: true,
      message: 'Availability exceptions updated successfully',
      data: availability
    });
  } catch (error) {
    console.error('Error in updateAvailabilityExceptions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update availability exceptions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


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


exports.getDepartmentDoctors = async (req, res, next) => {
  try {
    const { departmentId } = req.params;
    
    // Get all doctors in the department with their availability
    const doctors = await User.findAll({
      where: {
        role: 'DOCTOR',
        isActive: true,
        departmentId
      },
      include: [{
        model: DoctorAvailability,
        required: false // Left join to get all doctors even if no availability set
      }],
      attributes: ['id', 'name', 'specialization']
    });

    res.json({
      success: true,
      doctors: doctors.map(doctor => ({
        id: doctor.id,
        name: doctor.name,
        specialization: doctor.specialization,
        hasAvailability: !!doctor.DoctorAvailability
      }))
    });
  } catch (error) {
    next(error);
  }
};

exports.getDoctorAvailabilityForDate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    const availability = await DoctorAvailability.findOne({
      where: { doctorId: id }
    });

    if (!availability) {
      return res.status(404).json({
        success: false,
        message: 'No availability found for this doctor'
      });
    }

    // Get day of week from date
    const dayOfWeek = new Date(date).toLocaleLowerCase('en-US', { weekday: 'long' });
    const daySchedule = availability.weeklySchedule[dayOfWeek] || [];

    // Get existing appointments for the date
    const existingAppointments = await ConsultationQueue.findAll({
      where: {
        doctorId: id,
        appointmentTime: {
          [Op.between]: [
            new Date(date + 'T00:00:00Z'),
            new Date(date + 'T23:59:59Z')
          ]
        },
        status: {
          [Op.notIn]: ['COMPLETED', 'CANCELLED']
        }
      }
    });

    // Filter out booked slots
    const bookedTimes = existingAppointments.map(apt => 
      new Date(apt.appointmentTime).toTimeString().slice(0, 5)
    );

    res.json({
      success: true,
      data: {
        weeklySchedule: {
          [dayOfWeek]: daySchedule.map(slot => ({
            ...slot,
            availableSlots: generateAvailableSlots(
              slot.startTime,
              slot.endTime,
              slot.slotDuration,
              bookedTimes
            )
          }))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.createConsultationQueue = async (req, res, next) => {
  try {
    const {
      triageId,
      departmentId,
      doctorId,
      priority,
      appointmentTime
    } = req.body;

    // Validate the time slot is available
    const availability = await DoctorAvailability.findOne({
      where: { doctorId }
    });

    if (!availability) {
      return res.status(400).json({
        success: false,
        message: 'Doctor has no availability set'
      });
    }

    // Check if slot is within doctor's schedule
    const dayOfWeek = new Date(appointmentTime)
      .toLocaleLowerCase('en-US', { weekday: 'long' });
    
    const timeStr = new Date(appointmentTime).toTimeString().slice(0, 5);
    const daySchedule = availability.weeklySchedule[dayOfWeek] || [];

    const isSlotAvailable = daySchedule.some(slot => {
      return (
        timeStr >= slot.startTime &&
        timeStr <= slot.endTime &&
        slot.isAvailable
      );
    });

    if (!isSlotAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Selected time slot is not available'
      });
    }

    // Check for existing appointment at the same time
    const existingAppointment = await ConsultationQueue.findOne({
      where: {
        doctorId,
        appointmentTime,
        status: {
          [Op.notIn]: ['COMPLETED', 'CANCELLED']
        }
      }
    });

    if (existingAppointment) {
      return res.status(409).json({
        success: false,
        message: 'Time slot is already booked'
      });
    }

    // Create queue entry
    const queueEntry = await ConsultationQueue.create({
      triageId,
      departmentId,
      doctorId,
      priority,
      appointmentTime,
      status: 'WAITING',
      estimatedStartTime: new Date(appointmentTime)
    });

    res.status(201).json({
      success: true,
      message: 'Added to consultation queue',
      data: queueEntry
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to generate available time slots
function generateAvailableSlots(startTime, endTime, duration, bookedTimes) {
  const slots = [];
  const start = new Date(`1970-01-01T${startTime}Z`);
  const end = new Date(`1970-01-01T${endTime}Z`);

  while (start < end) {
    const timeStr = start.toTimeString().slice(0, 5);
    if (!bookedTimes.includes(timeStr)) {
      slots.push(timeStr);
    }
    start.setMinutes(start.getMinutes() + duration);
  }

  return slots;
}

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
    const doctorId = req.user.id;

    console.log('Handling appointment request:', { id, action, doctorId });

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
        },
        {
          model: User,
          as: 'doctor',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    console.log('Found appointment:', appointment ? 'yes' : 'no');

    if (!appointment) {
      console.log('Appointment not found with criteria:', {
        id,
        doctorId,
        status: 'pending'
      });
      return res.status(404).json({ 
        message: 'Appointment request not found'
      });
    }

    if (action === 'accept') {
      try {
        if (appointment.type === 'video') {
          console.log('Creating video meeting...');
          const meetingDetails = await zoomApi.createMeeting({
            topic: `Medical Consultation with Dr. ${appointment.doctor.name}`,
            startTime: appointment.dateTime,
            duration: 30,
            agenda: `Consultation with patient: ${appointment.patient.name}\nReason: ${appointment.reason}`
          });

          console.log('Meeting created:', meetingDetails);

          // Update appointment without transaction
          await appointment.update({
            status: 'confirmed',
            meetingLink: meetingDetails.joinUrl,
            startUrl: meetingDetails.startUrl,
            meetingId: meetingDetails.meetingId.toString(),
            meetingPassword: meetingDetails.password,
            platform: 'zoom'
          });

          // Send confirmation email
          await sendEmail({
            to: appointment.patient.email,
            subject: 'Video Appointment Confirmed',
            html: generateVideoAppointmentEmail('confirmation', {
              name: appointment.patient.name,
              doctor: appointment.doctor.name,
              date: format(new Date(appointment.dateTime), 'MMMM do, yyyy'),
              time: format(new Date(appointment.dateTime), 'h:mm a'),
              type: appointment.type,
              meetingLink: meetingDetails.joinUrl,
              meetingId: meetingDetails.meetingId,
              password: meetingDetails.password
            })
          });

          // Send email to doctor as well
          await sendEmail({
            to: appointment.doctor.email,
            subject: 'Video Appointment Scheduled',
            html: generateVideoAppointmentEmail('doctor_confirmation', {
              name: appointment.doctor.name,
              patient: appointment.patient.name,
              date: format(new Date(appointment.dateTime), 'MMMM do, yyyy'),
              time: format(new Date(appointment.dateTime), 'h:mm a'),
              type: appointment.type,
              meetingLink: meetingDetails.startUrl, // Note: Using startUrl for doctor
              meetingId: meetingDetails.meetingId,
              password: meetingDetails.password
            })
          });

        } else {
          // Handle non-video appointment
          await appointment.update({ status: 'confirmed' });
          
          await sendEmail({
            to: appointment.patient.email,
            subject: 'Appointment Confirmed',
            html: generateAppointmentEmail('confirmation', {
              name: appointment.patient.name,
              doctor: appointment.doctor.name,
              date: format(new Date(appointment.dateTime), 'MMMM do, yyyy'),
              time: format(new Date(appointment.dateTime), 'h:mm a'),
              type: appointment.type
            })
          });
        }

        // Fetch the updated appointment
        const updatedAppointment = await Appointment.findByPk(appointment.id, {
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

        return res.json({
          message: 'Appointment confirmed successfully',
          appointment: updatedAppointment
        });
      } catch (error) {
        console.error('Error in appointment confirmation:', error);
        return res.status(500).json({
          message: 'Failed to confirm appointment',
          error: error.message
        });
      }
    } else if (action === 'reject') {
      await appointment.update({
        status: 'cancelled',
        cancelledById: doctorId,
        cancelReason: 'Rejected by doctor'
      });

      await sendEmail({
        to: appointment.patient.email,
        subject: 'Appointment Request Declined',
        html: generateAppointmentEmail('rejection', {
          name: appointment.patient.name,
          doctor: appointment.doctor.name,
          date: format(new Date(appointment.dateTime), 'MMMM do, yyyy'),
          time: format(new Date(appointment.dateTime), 'h:mm a')
        })
      });

      return res.json({
        message: 'Appointment rejected successfully',
        appointment
      });
    } else {
      return res.status(400).json({
        message: 'Invalid action'
      });
    }
  } catch (error) {
    console.error('General error in handleAppointmentRequest:', error);
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