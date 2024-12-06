// controllers/consultation-queue.controller.js
const { ConsultationQueue, User, Department, Triage, Appointment } = require('../models');
const { Op } = require('sequelize');

exports.createConsultationQueue = async (req, res, next) => {
  try {
    const { triageId, departmentId, doctorId, priority = 0 } = req.body;

    // 1. Verify triage record
    const triage = await Triage.findByPk(triageId, {
      include: [{
        model: User,
        as: 'patient',
        attributes: ['id', 'name']
      }]
    });

    if (!triage) {
      return res.status(404).json({
        success: false,
        message: 'Triage record not found'
      });
    }

    // 2. Get current queue number for the department
    const latestQueue = await ConsultationQueue.findOne({
      where: {
        departmentId,
        createdAt: {
          [Op.gte]: new Date().setHours(0, 0, 0, 0)
        }
      },
      order: [['queueNumber', 'DESC']]
    });

    const queueNumber = latestQueue ? latestQueue.queueNumber + 1 : 1;

    // 3. Calculate estimated wait time
    const waitingPatients = await ConsultationQueue.count({
      where: {
        departmentId,
        status: {
          [Op.in]: ['WAITING', 'IN_PROGRESS']
        }
      }
    });

    const averageConsultationTime = 15; // minutes per patient
    const estimatedStartTime = new Date();
    estimatedStartTime.setMinutes(estimatedStartTime.getMinutes() + (waitingPatients * averageConsultationTime));

    // 4. Create queue entry
    const queueEntry = await ConsultationQueue.create({
      triageId,
      patientId: triage.patient.id,
      departmentId,
      doctorId,
      queueNumber,
      priority,
      estimatedStartTime,
      notes: triage.chiefComplaint,
      metadata: {
        triageCategory: triage.category,
        assignedBy: req.user.id,
        assignedAt: new Date()
      }
    });

    // 5. Create appointment for doctor's calendar
    await Appointment.create({
      patientId: triage.patient.id,
      doctorId,
      dateTime: estimatedStartTime,
      type: 'consultation',
      status: 'scheduled',
      notes: triage.chiefComplaint,
      metadata: {
        triageId,
        queueId: queueEntry.id
      }
    });

    res.status(201).json({
      success: true,
      queue: queueEntry,
      estimatedStartTime,
      queueNumber
    });
  } catch (error) {
    next(error);
  }
};

exports.getDepartmentQueue = async (req, res, next) => {
  try {
    const { departmentId } = req.params;

    const queue = await ConsultationQueue.findAll({
      where: {
        departmentId,
        status: {
          [Op.in]: ['WAITING', 'IN_PROGRESS']
        }
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
          attributes: ['id', 'name']
        },
        {
          model: Triage,
          as: 'triage',
          attributes: ['category', 'chiefComplaint']
        }
      ],
      order: [
        ['priority', 'DESC'],
        ['queueNumber', 'ASC']
      ]
    });

    res.json({
      success: true,
      queue
    });
  } catch (error) {
    next(error);
  }
};

exports.getDoctorQueue = async (req, res, next) => {
  try {
    const { doctorId } = req.params;

    const queue = await ConsultationQueue.findAll({
      where: {
        doctorId,
        status: {
          [Op.in]: ['WAITING', 'IN_PROGRESS']
        }
      },
      include: [
        {
          model: User,
          as: 'patient',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Triage,
          as: 'triage',
          attributes: ['category', 'chiefComplaint', 'vitalSigns']
        }
      ],
      order: [
        ['priority', 'DESC'],
        ['queueNumber', 'ASC']
      ]
    });

    res.json({
      success: true,
      queue
    });
  } catch (error) {
    next(error);
  }
};

exports.updateQueueStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const queueEntry = await ConsultationQueue.findByPk(id);
    if (!queueEntry) {
      return res.status(404).json({
        success: false,
        message: 'Queue entry not found'
      });
    }

    const updates = { status };

    if (status === 'IN_PROGRESS') {
      updates.actualStartTime = new Date();
    } else if (status === 'COMPLETED') {
      updates.completionTime = new Date();
    }

    await queueEntry.update(updates);

    // If completing consultation, update related records
    if (status === 'COMPLETED') {
      await Promise.all([
        // Update appointment status
        Appointment.update(
          { status: 'completed' },
          {
            where: {
              patientId: queueEntry.patientId,
              doctorId: queueEntry.doctorId,
              'metadata.queueId': queueEntry.id
            }
          }
        ),
        // Update any remaining queue estimated times
        this.recalculateQueueTimes(queueEntry.departmentId)
      ]);
    }

    res.json({
      success: true,
      message: `Queue status updated to ${status}`,
      queue: queueEntry
    });
  } catch (error) {
    next(error);
  }
};

exports.recalculateQueueTimes = async (departmentId) => {
  const waitingPatients = await ConsultationQueue.findAll({
    where: {
      departmentId,
      status: 'WAITING'
    },
    order: [
      ['priority', 'DESC'],
      ['queueNumber', 'ASC']
    ]
  });

  const baseTime = new Date();
  const averageConsultationTime = 15; // minutes

  for (let i = 0; i < waitingPatients.length; i++) {
    const estimatedTime = new Date(baseTime);
    estimatedTime.setMinutes(baseTime.getMinutes() + (i * averageConsultationTime));
    
    await waitingPatients[i].update({
      estimatedStartTime: estimatedTime
    });
  }
};