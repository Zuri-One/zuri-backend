// controllers/consultation-queue.controller.js
const { ConsultationQueue, User, Department, Triage, Appointment } = require('../models');
const { Op } = require('sequelize');

exports.createConsultationQueue = async (req, res, next) => {
  try {
    const { triageId, departmentId, doctorId, priority = 0, appointmentTime } = req.body;
 
    console.log('Received request data:', req.body);
 
    // 1. Verify triage record
    const triage = await Triage.findByPk(triageId, {
      include: [{
        model: User,
        as: 'PATIENT',
        attributes: ['id', 'name']
      }]
    });
 
    if (!triage) {
      return res.status(404).json({
        success: false,
        message: 'Triage record not found'
      });
    }
 
    console.log('Found triage:', triage);
 
    // 2. Get current queue number
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
    
    // Generate token number (department prefix + current date + queue number)
    const tokenPrefix = departmentId.substring(0, 3).toUpperCase();
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const tokenNumber = `${tokenPrefix}${dateStr}-${queueNumber.toString().padStart(3, '0')}`;
 
    // 3. Calculate wait time
    const waitingPatients = await ConsultationQueue.count({
      where: {
        departmentId,
        status: 'WAITING'
      }
    });
 
    const estimatedStartTime = new Date();
    estimatedStartTime.setMinutes(estimatedStartTime.getMinutes() + (waitingPatients * 15));
 
    // 4. Create queue entry with all required fields
    const queueData = {
      triageId,
      patientId: triage.PATIENT.id,
      departmentId,
      doctorId,
      queueNumber,
      tokenNumber,
      priority: parseInt(priority, 10),
      status: 'WAITING',
      checkInTime: new Date(),
      estimatedStartTime,
      notes: {
        nurseNotes: "",
        triageNotes: triage.chiefComplaint || "",
        patientRequirements: [],
        specialInstructions: ""
      },
      patientCondition: {
        vitalSigns: triage.vitalSigns || {},
        urgencyLevel: triage.category || "",
        triageCategory: triage.category || null,
        primaryComplaint: triage.chiefComplaint || ""
      },
      consultationType: 'REGULAR',
      statusHistory: [],
      notifications: {
        notified: false,
        lastNotification: null,
        notificationCount: 0,
        notificationMethods: []
      },
      metrics: {
        delayFactor: 0,
        priorityChanges: 0,
        expectedDuration: 0
      },
      metadata: {
        triageCategory: triage.category || 'UNKNOWN',
        assignedBy: req.user.id,
        assignedAt: new Date().toISOString()
      },
      createdBy: req.user.id,
      updatedBy: req.user.id
    };

    const queueEntry = await ConsultationQueue.create(queueData);
 
    console.log('Queue entry created:', queueEntry.id);
 
    const appointment = await Appointment.create({
      patientId: triage.PATIENT.id,
      doctorId,
      dateTime: estimatedStartTime,
      type: 'in-person', // Changed from 'consultation' to 'in-person'
      status: 'pending',
      reason: triage.chiefComplaint || 'General Consultation',
      symptoms: triage.symptoms || [],
      notes: triage.chiefComplaint,
      paymentStatus: 'pending',
      reminder: false,
      duration: 30,
      metadata: {
        triageId,
        queueId: queueEntry.id,
        category: triage.category,
        priority: priority
      }
    });
 
    res.status(201).json({
      success: true,
      queue: queueEntry,
      estimatedStartTime,
      queueNumber,
      tokenNumber
    });
 
  } catch (error) {
    console.error('Full error object:', error);
    console.error('Error creating queue:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      original: error.original
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to create consultation queue',
      error: error.message,
      details: error.original?.detail || 'No additional details'
    });
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
          as: 'PATIENT',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'DOCTOR',
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
          as: 'PATIENT',
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

    const queueEntry = await ConsultationQueue.create({
      triageId,
      patientId: triage.PATIENT.id,
      departmentId,
      doctorId,
      queueNumber,
      priority,
      status: 'WAITING',
      estimatedStartTime,
      notes: String(triage.chiefComplaint || '').substring(0, 255), // Limit the length just in case
      metadata: {  // Don't stringify here, let the model handle it
        triageCategory: triage.category,
        assignedBy: req.user.id,
        assignedAt: new Date().toISOString()
      }
    });

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