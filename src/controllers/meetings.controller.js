// controllers/meetings.controller.js
const { Appointment, User } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');

exports.getVideoMeetings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { status, date } = req.query;

    const whereClause = {
      type: 'video',
      [userRole === 'DOCTOR' ? 'doctorId' : 'patientId']: userId,
    };

    // Filter by status if provided
    if (status) {
      switch (status) {
        case 'upcoming':
          whereClause.dateTime = { [Op.gt]: new Date() };
          whereClause.status = 'confirmed';
          break;
        case 'past':
          whereClause.dateTime = { [Op.lt]: new Date() };
          break;
        case 'today':
          whereClause.dateTime = {
            [Op.between]: [
              moment().startOf('day').toDate(),
              moment().endOf('day').toDate()
            ]
          };
          whereClause.status = 'confirmed';
          break;
      }
    }

    const meetings = await Appointment.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'DOCTOR',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'PATIENT',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['dateTime', 'ASC']]
    });

    const formattedMeetings = meetings.map(meeting => ({
      id: meeting.id,
      dateTime: meeting.dateTime,
      status: meeting.status,
      type: meeting.type,
      meetingLink: meeting.meetingLink,
      startUrl: meeting.startUrl,
      meetingId: meeting.meetingId,
      platform: meeting.platform,
      duration: meeting.duration,
      reason: meeting.reason,
      otherParty: userRole === 'DOCTOR' 
        ? {
            id: meeting.patient.id,
            name: meeting.patient.name,
            email: meeting.patient.email,
            role: 'PATIENT'
          }
        : {
            id: meeting.doctor.id,
            name: meeting.doctor.name,
            email: meeting.doctor.email,
            role: 'DOCTOR'
          }
    }));

    res.json({
      meetings: formattedMeetings
    });
  } catch (error) {
    next(error);
  }
};

exports.getMeetingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const meeting = await Appointment.findOne({
      where: {
        id,
        type: 'video',
        [userRole === 'DOCTOR' ? 'doctorId' : 'patientId']: userId
      },
      include: [
        {
          model: User,
          as: 'DOCTOR',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'PATIENT',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!meeting) {
      return res.status(404).json({
        message: 'Meeting not found'
      });
    }

    const formattedMeeting = {
      id: meeting.id,
      dateTime: meeting.dateTime,
      status: meeting.status,
      type: meeting.type,
      meetingLink: meeting.meetingLink,
      startUrl: meeting.startUrl,
      meetingId: meeting.meetingId,
      platform: meeting.platform,
      duration: meeting.duration,
      reason: meeting.reason,
      otherParty: userRole === 'DOCTOR'
        ? {
            id: meeting.patient.id,
            name: meeting.patient.name,
            email: meeting.patient.email,
            role: 'PATIENT'
          }
        : {
            id: meeting.doctor.id,
            name: meeting.doctor.name,
            email: meeting.doctor.email,
            role: 'DOCTOR'
          }
    };

    res.json({
      meeting: formattedMeeting
    });
  } catch (error) {
    next(error);
  }
};