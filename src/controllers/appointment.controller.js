// src/controllers/appointment.controller.js
const { Op } = require('sequelize');
const { Appointment, User, DoctorAvailability } = require('../models');
const sendEmail = require('../utils/email.util');
const moment = require('moment');
const zoomApi = require('../utils/video/zoom.util');
const { createWherebyRoom, deleteWherebyRoom } = require('../utils/video/whereby.util');

const { 
  generateAppointmentEmail, 
  generateAppointmentCancellationEmail,
  generateAppointmentUpdateEmail,
  generateVideoAppointmentEmail
} = require('../utils/email-templates.util');

// exports.createAppointment = async (req, res, next) => {
//   try {
//     const { doctorId, dateTime, type, reason } = req.body;
//     const patientId = req.user.id;

//     // Validate doctor exists and is active
//     const doctor = await User.findOne({ 
//       where: { 
//         id: doctorId, 
//         role: 'doctor', 
//         isActive: true 
//       }
//     });

//     if (!doctor) {
//       return res.status(404).json({ message: 'Doctor not found' });
//     }

//     // Check doctor availability
//     const availability = await DoctorAvailability.findOne({ 
//       where: { doctorId }
//     });

//     if (!availability) {
//       return res.status(400).json({ message: 'Doctor has no available slots' });
//     }

//     // Validate the slot is available
//     const requestedDate = moment(dateTime);
//     const dayOfWeek = requestedDate.format('dddd').toLowerCase();
//     const timeStr = requestedDate.format('HH:mm');

//     const availableSlot = availability.slots.find(slot => 
//       slot.day === dayOfWeek &&
//       timeStr >= slot.startTime &&
//       timeStr <= slot.endTime &&
//       slot.isAvailable
//     );

//     if (!availableSlot) {
//       return res.status(400).json({ message: 'Selected time slot is not available' });
//     }

//     // Check for existing appointments
//     const existingAppointment = await Appointment.findOne({
//       where: {
//         doctorId,
//         dateTime: requestedDate.toDate(),
//         status: {
//           [Op.notIn]: ['cancelled']
//         }
//       }
//     });

//     if (existingAppointment) {
//       return res.status(400).json({ message: 'Time slot already booked' });
//     }

//     // Create appointment
//     const appointment = await Appointment.create({
//       patientId,
//       doctorId,
//       dateTime,
//       type,
//       reason,
//       status: 'pending'
//     });

//     // Fetch the user for email
//     const patient = await User.findByPk(patientId);

//     // Send notifications
//     await Promise.all([
//       sendEmail({
//         to: patient.email,
//         subject: 'Appointment Booking Confirmation',
//         html: generateAppointmentEmail('confirmation', {
//           name: patient.name,
//           date: moment(dateTime).format('MMMM Do YYYY'),
//           time: moment(dateTime).format('h:mm a'),
//           doctor: doctor.name,
//           type
//         })
//       }),
//       sendEmail({
//         to: doctor.email,
//         subject: 'New Appointment Request',
//         html: generateAppointmentEmail('request', {
//           name: doctor.name,
//           date: moment(dateTime).format('MMMM Do YYYY'),
//           time: moment(dateTime).format('h:mm a'),
//           patient: patient.name,
//           type
//         })
//       })
//     ]);

//     res.status(201).json({
//       message: 'Appointment booked successfully',
//       appointment
//     });
//   } catch (error) {
//     next(error);
//   }
// };


const generateVideoMeeting = async (appointment, doctor, patient) => {
  if (appointment.type !== 'video') return null;
 
  try {
    switch (appointment.platform) {
      case 'whereby': {
        const wherebyMeeting = await createWherebyRoom(appointment);
        return {
          meetingLink: wherebyMeeting.meetingLink,
          startUrl: wherebyMeeting.startUrl,
          meetingId: wherebyMeeting.meetingId,
          platform: 'whereby'
        };
      }
 
 
      case 'zoom': {
        // Existing zoom logic
        return await zoomApi.createMeeting({
          topic: `Medical Consultation with Dr. ${doctor.name}`,
          startTime: appointment.dateTime,
          duration: appointment.duration || 30,
          agenda: `Consultation with patient: ${patient.name}\nReason: ${appointment.reason}`
        });
      }
 
      default:
        throw new Error(`Unsupported platform: ${appointment.platform}`);
    }
  } catch (error) {
    console.error('Error generating video meeting:', error);
    throw error;
  }
};


exports.getAppointments = async (req, res, next) => {
  try {
    const { type, status, timeframe } = req.query;
    const where = {};

    // Add user-specific filter
    if (req.user.role === 'patient') {
      where.patientId = req.user.id;
    } else if (req.user.role === 'doctor') {
      where.doctorId = req.user.id;
    }

    // Add type filter
    if (type) where.type = type;
    
    // Base status filter
    if (status) where.status = status;

    // Add timeframe filtering
    if (timeframe) {
      const now = new Date();
      
      switch (timeframe) {
        case 'upcoming':
          where.dateTime = { [Op.gt]: now };
          break;
        case 'today':
          const startOfDay = new Date(now.setHours(0, 0, 0, 0));
          const endOfDay = new Date(now.setHours(23, 59, 59, 999));
          where.dateTime = { [Op.between]: [startOfDay, endOfDay] };
          break;
        case 'past':
          where.dateTime = { [Op.lt]: now };
          break;
      }
    }

    const appointments = await Appointment.findAll({
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
      order: [['dateTime', 'ASC']]
    });

    res.json({ appointments });
  } catch (error) {
    next(error);
  }
};

exports.getAppointmentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findByPk(id, {
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

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if user has permission to view this appointment
    const isAuthorized = 
      req.user.role === 'admin' ||
      appointment.patientId === req.user.id ||
      appointment.doctorId === req.user.id;

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized to view this appointment' });
    }

    res.json({ appointment });
  } catch (error) {
    next(error);
  }
};

exports.updateAppointmentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const appointment = await Appointment.findByPk(id, {
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

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Validate permission to update
    const isDoctor = req.user.role === 'doctor' && appointment.doctorId === req.user.id;
    const isPatient = req.user.role === 'patient' && appointment.patientId === req.user.id;
    
    if (!isDoctor && !isPatient) {
      return res.status(403).json({ message: 'Not authorized to update this appointment' });
    }

    // Validate status transition
    const validStatusTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['completed', 'cancelled'],
      completed: [],
      cancelled: []
    };

    if (!validStatusTransitions[appointment.status].includes(status)) {
      return res.status(400).json({ 
        message: `Cannot transition from ${appointment.status} to ${status}` 
      });
    }

    // Update appointment
    appointment.status = status;
    if (status === 'cancelled') {
      appointment.cancelledById = req.user.id;
      appointment.cancelReason = reason;
    }

    await appointment.save();

    // Send notifications
    if (status === 'cancelled') {
      const notifyUser = isDoctor ? appointment.patient : appointment.doctor;
      
      await sendEmail({
        to: notifyUser.email,
        subject: 'Appointment Cancelled',
        html: generateAppointmentCancellationEmail({
          name: notifyUser.name,
          date: moment(appointment.dateTime).format('MMMM Do YYYY'),
          time: moment(appointment.dateTime).format('h:mm a'),
          reason: reason || 'No reason provided',
          cancelledBy: isDoctor ? 'doctor' : 'patient'
        })
      });
    } else if (status === 'confirmed') {
      await sendEmail({
        to: appointment.patient.email,
        subject: 'Appointment Confirmed',
        html: generateAppointmentUpdateEmail('confirmation', {
          name: appointment.patient.name,
          date: moment(appointment.dateTime).format('MMMM Do YYYY'),
          time: moment(appointment.dateTime).format('h:mm a'),
          doctor: appointment.doctor.name,
          type: appointment.type
        })
      });
    }

    res.json({
      message: 'Appointment updated successfully',
      appointment
    });
  } catch (error) {
    next(error);
  }
};

exports.rescheduleAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newDateTime } = req.body;

    const appointment = await Appointment.findByPk(id, {
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

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check authorization
    const isAuthorized = 
      appointment.patientId === req.user.id ||
      appointment.doctorId === req.user.id;

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized to reschedule this appointment' });
    }

    // Validate new time slot
    const requestedDate = moment(newDateTime);
    const dayOfWeek = requestedDate.format('dddd').toLowerCase();
    const timeStr = requestedDate.format('HH:mm');

    // Check doctor availability
    const availability = await DoctorAvailability.findOne({ 
      where: { doctorId: appointment.doctorId }
    });

    const availableSlot = availability.slots.find(slot => 
      slot.day === dayOfWeek &&
      timeStr >= slot.startTime &&
      timeStr <= slot.endTime &&
      slot.isAvailable
    );

    if (!availableSlot) {
      return res.status(400).json({ message: 'Selected time slot is not available' });
    }

    // Check for conflicting appointments
    const existingAppointment = await Appointment.findOne({
      where: {
        doctorId: appointment.doctorId,
        dateTime: requestedDate.toDate(),
        status: {
          [Op.notIn]: ['cancelled']
        },
        id: {
          [Op.ne]: id
        }
      }
    });

    if (existingAppointment) {
      return res.status(400).json({ message: 'Time slot already booked' });
    }

    // Update appointment
    const oldDateTime = appointment.dateTime;
    appointment.dateTime = newDateTime;
    await appointment.save();

    // Notify both parties
    await Promise.all([
      sendEmail({
        to: appointment.patient.email,
        subject: 'Appointment Rescheduled',
        html: generateAppointmentUpdateEmail('reschedule', {
          name: appointment.patient.name,
          oldDate: moment(oldDateTime).format('MMMM Do YYYY'),
          oldTime: moment(oldDateTime).format('h:mm a'),
          newDate: moment(newDateTime).format('MMMM Do YYYY'),
          newTime: moment(newDateTime).format('h:mm a'),
          doctor: appointment.doctor.name,
          type: appointment.type
        })
      }),
      sendEmail({
        to: appointment.doctor.email,
        subject: 'Appointment Rescheduled',
        html: generateAppointmentUpdateEmail('reschedule', {
          name: appointment.doctor.name,
          oldDate: moment(oldDateTime).format('MMMM Do YYYY'),
          oldTime: moment(oldDateTime).format('h:mm a'),
          newDate: moment(newDateTime).format('MMMM Do YYYY'),
          newTime: moment(newDateTime).format('h:mm a'),
          patient: appointment.patient.name,
          type: appointment.type
        })
      })
    ]);

    res.json({
      message: 'Appointment rescheduled successfully',
      appointment
    });
  } catch (error) {
    next(error);
  }
};

exports.addAppointmentNotes = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const appointment = await Appointment.findByPk(id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Only doctors can add notes
    if (req.user.role !== 'doctor' || appointment.doctorId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to add notes' });
    }

    appointment.notes = notes;
    await appointment.save();

    res.json({
      message: 'Notes added successfully',
      appointment
    });
  } catch (error) {
    next(error);
  }
};

exports.getDoctorAvailability = async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    const availability = await DoctorAvailability.findOne({
      where: { doctorId }
    });

    if (!availability) {
      return res.status(404).json({ message: 'No availability found for this doctor' });
    }

    // If specific date is provided, check for exceptions
    if (date) {
      const requestedDate = moment(date);
      const dayOfWeek = requestedDate.format('dddd').toLowerCase();
      
      // Get regular slots for the day
      const daySlots = availability.slots.filter(slot => 
        slot.day === dayOfWeek && slot.isAvailable
      );

      // Check for exceptions on this date
      const exception = availability.exceptions.find(exc => 
        moment(exc.date).isSame(requestedDate, 'day')
      );

      // Get existing appointments for the date
      const existingAppointments = await Appointment.findAll({
        where: {
          doctorId,
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

      // Format response
      const availableSlots = daySlots.map(slot => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        isAvailable: exception ? exception.isAvailable : true,
        isBooked: existingAppointments.some(apt => 
          moment(apt.dateTime).format('HH:mm') >= slot.startTime &&
          moment(apt.dateTime).format('HH:mm') <= slot.endTime
        )
      }));

      return res.json({ availableSlots });
    }

// Return full availability schedule if no date specified
res.json({ availability });
} catch (error) {
  next(error);
}
};

exports.validateAppointmentCreation = async (req, res, next) => {
  try {
    const { doctorId, dateTime, type, reason } = req.body;

    // Validate required fields
    if (!doctorId || !dateTime || !type || !reason) {
      return res.status(400).json({
        message: 'Please provide all required fields: doctorId, dateTime, type, and reason'
      });
    }

    // Validate appointment type
    if (!['in-person', 'video'].includes(type)) {
      return res.status(400).json({
        message: 'Appointment type must be either "in-person" or "video"'
      });
    }

    // Validate date
    const appointmentDate = moment(dateTime);
    if (!appointmentDate.isValid()) {
      return res.status(400).json({
        message: 'Invalid date format'
      });
    }

    if (appointmentDate.isBefore(moment())) {
      return res.status(400).json({
        message: 'Cannot book appointments in the past'
      });
    }

    // Check if doctor exists and is active
    const doctor = await User.findOne({
      where: {
        id: doctorId,
        role: 'doctor',
        isActive: true
      }
    });

    if (!doctor) {
      return res.status(404).json({
        message: 'Doctor not found'
      });
    }

    // Check if slot is available
    const availability = await DoctorAvailability.findOne({
      where: { doctorId }
    });

    if (!availability) {
      return res.status(400).json({
        message: 'Doctor has no available slots'
      });
    }

    // Store validated data for the next middleware
    req.validatedAppointment = {
      doctor,
      appointmentDate,
      availability
    };

    next();
  } catch (error) {
    next(error);
  }
};

exports.createAppointment = async (req, res, next) => {
  try {
    const { doctorId, dateTime, type, reason } = req.body;
    const patientId = req.user.id;
    const { doctor, appointmentDate, availability } = req.validatedAppointment;

    // Check for conflicting appointments
    const existingAppointment = await Appointment.findOne({
      where: {
        doctorId,
        dateTime: appointmentDate.toDate(),
        status: {
          [Op.notIn]: ['cancelled']
        }
      }
    });

    if (existingAppointment) {
      return res.status(400).json({
        message: 'This time slot is already booked'
      });
    }

    // Create the appointment
    const appointment = await Appointment.create({
      patientId,
      doctorId,
      dateTime: appointmentDate.toDate(),
      type,
      reason,
      status: 'pending'
    });

    // Send notifications
    await Promise.all([
      sendEmail({
        to: req.user.email,
        subject: 'Appointment Booking Confirmation',
        html: generateAppointmentEmail('confirmation', {
          name: req.user.name,
          date: appointmentDate.format('MMMM Do YYYY'),
          time: appointmentDate.format('h:mm a'),
          doctor: doctor.name,
          type
        })
      }),
      sendEmail({
        to: doctor.email,
        subject: 'New Appointment Request',
        html: generateAppointmentEmail('request', {
          name: doctor.name,
          date: appointmentDate.format('MMMM Do YYYY'),
          time: appointmentDate.format('h:mm a'),
          patient: req.user.name,
          type
        })
      })
    ]);

    res.status(201).json({
      message: 'Appointment booked successfully',
      appointment
    });
  } catch (error) {
    next(error);
  }
};

exports.handleAppointmentRequest = async (req, res, next) => {
  try {
    const { id, action } = req.params;
    const { platform } = req.body;
    const doctorId = req.user.id;
 
    // Log for debugging
    console.log('Looking for appointment:', id);

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

    // Log found appointment data
    console.log('Found appointment:', {
      id: appointment?.id,
      patientEmail: appointment?.patient?.email,
      doctorEmail: appointment?.doctor?.email
    });
 
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment request not found' });
    }
 
    if (action === 'accept') {
      let meetingDetails = null;
 
      if (appointment.type === 'video') {
        try {
          meetingDetails = await generateVideoMeeting(
            { ...appointment.toJSON(), platform },
            appointment.doctor,
            appointment.patient
          );
 
          // Update appointment with meeting details
          await appointment.update({
            status: 'confirmed',
            meetingLink: meetingDetails.meetingLink,
            startUrl: meetingDetails.startUrl,
            meetingId: meetingDetails.meetingId,
            platform: meetingDetails.platform,
            meetingPassword: meetingDetails.password
          });
 
        } catch (error) {
          console.error('Failed to create video meeting:', error);
          return res.status(500).json({
            message: 'Failed to set up video consultation'
          });
        }
      } else {
        await appointment.update({ status: 'confirmed' });
      }

      // Log data before sending email
      console.log('Preparing to send email with data:', {
        to: appointment.patient.email,
        name: appointment.patient.name,
        date: moment(appointment.dateTime).format('MMMM Do, YYYY'),
        platform: platform
      });

      // Send confirmation email
      await sendEmail({
        to: appointment.patient.email,
        subject: 'Video Consultation Confirmed',
        html: generateVideoAppointmentEmail('confirmation', {
          name: appointment.patient.name,
          doctor: appointment.doctor.name,
          date: moment(appointment.dateTime).format('MMMM Do, YYYY'),
          time: moment(appointment.dateTime).format('h:mm a'),
          type: appointment.type,
          platform: meetingDetails.platform,
          meetingLink: meetingDetails.meetingLink,
          meetingId: meetingDetails.meetingId,
          password: meetingDetails.password
        })
      });

      // Log email sent
      console.log('Email sent successfully to:', appointment.patient.email);
 
    } else {
      // Handle rejection (existing code...)
    }
 
    res.json({
      message: `Appointment ${action === 'accept' ? 'confirmed' : 'rejected'} successfully`,
      appointment
    });
 
  } catch (error) {
    console.error('Error in handleAppointmentRequest:', error);
    next(error);
  }
};

const generateVideoAppointment = async (appointment, doctor, patient) => {
  // Only generate video meeting for video appointments
  if (appointment.type !== 'video') return null;

  try {
    const meetingDetails = await zoomClient.createMeeting({
      topic: `Medical Consultation with Dr. ${doctor.name}`,
      startTime: appointment.dateTime,
      duration: 30, // Default 30 minutes
      doctorEmail: doctor.email,
      patientEmail: patient.email
    });

    return meetingDetails;
  } catch (error) {
    console.error('Failed to create video meeting:', error);
    throw error;
  }
};

exports.confirmAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
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
        },
        {
          model: User,
          as: 'doctor',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    let videoDetails = null;
    if (appointment.type === 'video') {
      videoDetails = await generateVideoAppointment(
        appointment,
        appointment.doctor,
        appointment.patient
      );

      // Update appointment with video details
      appointment.meetingLink = videoDetails.joinUrl;
      appointment.meetingId = videoDetails.meetingId;
      appointment.platform = 'zoom';
      appointment.meetingPassword = videoDetails.password;
    }

    appointment.status = 'confirmed';
    await appointment.save();

    // Send confirmation email with video details if applicable
    await sendEmail({
      to: appointment.patient.email,
      subject: 'Appointment Confirmed',
      html: generateVideoAppointmentEmail('confirmation', {
        name: appointment.patient.name,
        doctor: appointment.doctor.name,
        date: moment(appointment.dateTime).format('MMMM Do YYYY'),
        time: moment(appointment.dateTime).format('h:mm a'),
        type: appointment.type,
        platform: videoDetails?.platform,
        meetingLink: videoDetails?.joinUrl,
        meetingId: videoDetails?.meetingId,
        password: videoDetails?.password
      })
    });

    res.json({
      message: 'Appointment confirmed successfully',
      appointment: {
        ...appointment.toJSON(),
        videoDetails: videoDetails ? {
          joinUrl: videoDetails.joinUrl,
          meetingId: videoDetails.meetingId,
          password: videoDetails.password
        } : null
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;