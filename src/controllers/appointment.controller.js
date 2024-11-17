// src/controllers/appointment.controller.js
const { Op } = require('sequelize');
const { Appointment, User, DoctorAvailability } = require('../models');
const sendEmail = require('../utils/email.util');
const moment = require('moment');
const { 
  generateAppointmentEmail, 
  generateAppointmentCancellationEmail,
  generateAppointmentUpdateEmail 
} = require('../utils/email-templates.util');

exports.createAppointment = async (req, res, next) => {
  try {
    const { doctorId, dateTime, type, reason } = req.body;
    const patientId = req.user.id;

    // Validate doctor exists and is active
    const doctor = await User.findOne({ 
      where: { 
        id: doctorId, 
        role: 'doctor', 
        isActive: true 
      }
    });

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Check doctor availability
    const availability = await DoctorAvailability.findOne({ 
      where: { doctorId }
    });

    if (!availability) {
      return res.status(400).json({ message: 'Doctor has no available slots' });
    }

    // Validate the slot is available
    const requestedDate = moment(dateTime);
    const dayOfWeek = requestedDate.format('dddd').toLowerCase();
    const timeStr = requestedDate.format('HH:mm');

    const availableSlot = availability.slots.find(slot => 
      slot.day === dayOfWeek &&
      timeStr >= slot.startTime &&
      timeStr <= slot.endTime &&
      slot.isAvailable
    );

    if (!availableSlot) {
      return res.status(400).json({ message: 'Selected time slot is not available' });
    }

    // Check for existing appointments
    const existingAppointment = await Appointment.findOne({
      where: {
        doctorId,
        dateTime: requestedDate.toDate(),
        status: {
          [Op.notIn]: ['cancelled']
        }
      }
    });

    if (existingAppointment) {
      return res.status(400).json({ message: 'Time slot already booked' });
    }

    // Create appointment
    const appointment = await Appointment.create({
      patientId,
      doctorId,
      dateTime,
      type,
      reason,
      status: 'pending'
    });

    // Fetch the user for email
    const patient = await User.findByPk(patientId);

    // Send notifications
    await Promise.all([
      sendEmail({
        to: patient.email,
        subject: 'Appointment Booking Confirmation',
        html: generateAppointmentEmail('confirmation', {
          name: patient.name,
          date: moment(dateTime).format('MMMM Do YYYY'),
          time: moment(dateTime).format('h:mm a'),
          doctor: doctor.name,
          type
        })
      }),
      sendEmail({
        to: doctor.email,
        subject: 'New Appointment Request',
        html: generateAppointmentEmail('request', {
          name: doctor.name,
          date: moment(dateTime).format('MMMM Do YYYY'),
          time: moment(dateTime).format('h:mm a'),
          patient: patient.name,
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

exports.getAppointments = async (req, res, next) => {
  try {
    const { status, type, startDate, endDate } = req.query;
    const where = {};

    // Add user-specific filter based on role
    if (req.user.role === 'patient') {
      where.patientId = req.user.id;
    } else if (req.user.role === 'doctor') {
      where.doctorId = req.user.id;
    }

    // Add filters if provided
    if (status) where.status = status;
    if (type) where.type = type;
    if (startDate || endDate) {
      where.dateTime = {};
      if (startDate) where.dateTime[Op.gte] = new Date(startDate);
      if (endDate) where.dateTime[Op.lte] = new Date(endDate);
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

module.exports = exports;