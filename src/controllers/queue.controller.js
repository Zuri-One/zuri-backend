const { DepartmentQueue, Patient, Department, User, Triage, MedicalRecord, LabTest  } = require('../models');
const { Op } = require('sequelize');

exports.addToQueue = async (req, res, next) => {
  try {
    const {
      patientId,
      departmentId,
      assignedToId,
      priority = 3,
      notes,
      source = 'RECEPTION',
      triageId
    } = req.body;

    // Check if patient is already in any active queue
    const existingQueue = await DepartmentQueue.findOne({
      where: {
        patientId,
        status: {
          [Op.notIn]: ['COMPLETED', 'TRANSFERRED', 'CANCELLED']
        }
      },
      include: [
        {
          model: Department,
          attributes: ['name']
        }
      ]
    });

    if (existingQueue) {
      return res.status(400).json({
        success: false,
        message: `Patient is already in ${existingQueue.Department.name} queue`,
        currentQueue: existingQueue
      });
    }

    // Validate patient exists and check their current status
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Validate department exists
    const department = await Department.findByPk(departmentId);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Start transaction
    const transaction = await DepartmentQueue.sequelize.transaction();

    try {
      // Get the last queue number for the department today
      const lastQueue = await DepartmentQueue.findOne({
        where: {
          departmentId,
          createdAt: {
            [Op.gte]: new Date().setHours(0, 0, 0, 0)
          }
        },
        order: [['queueNumber', 'DESC']],
        transaction
      });

      const queueNumber = lastQueue ? lastQueue.queueNumber + 1 : 1;

      // Calculate estimated wait time based on last 5 patients
      const lastFiveCompletedPatients = await DepartmentQueue.findAll({
        where: {
          departmentId,
          status: ['COMPLETED', 'TRANSFERRED'],
          endTime: { [Op.not]: null },
          startTime: { [Op.not]: null }
        },
        order: [['endTime', 'DESC']],
        limit: 5,
        transaction
      });

      let estimatedWaitTime = 30; // Default 30 minutes
      if (lastFiveCompletedPatients.length > 0) {
        const totalWaitTime = lastFiveCompletedPatients.reduce((sum, patient) => {
          const waitTime = Math.floor(
            (new Date(patient.endTime) - new Date(patient.startTime)) / (1000 * 60)
          );
          return sum + waitTime;
        }, 0);
        estimatedWaitTime = Math.floor(totalWaitTime / lastFiveCompletedPatients.length);
      }

      // Get number of patients currently waiting
      const waitingPatients = await DepartmentQueue.count({
        where: {
          departmentId,
          status: 'WAITING',
          createdAt: {
            [Op.gte]: new Date().setHours(0, 0, 0, 0)
          }
        },
        transaction
      });

      // Adjust estimated wait time based on queue position and priority
      estimatedWaitTime = Math.floor(estimatedWaitTime * (waitingPatients + 1) * (priority / 3));

      // Create queue entry
      const queueEntry = await DepartmentQueue.create({
        patientId,
        departmentId,
        assignedToId,
        queueNumber,
        priority,
        notes,
        source,
        triageId,
        status: 'WAITING',
        estimatedWaitTime,
        startTime: null,
        endTime: null,
        actualWaitTime: null
      }, { transaction });

      // Update patient status based on department type
      let patientStatus;
      switch (department.code) {
        case 'EMERG':
          patientStatus = 'WAITING_EMERGENCY';
          break;
        case 'LAB':
          patientStatus = 'WAITING_LABORATORY';
          break;
        case 'RAD':
          patientStatus = 'WAITING_RADIOLOGY';
          break;
        case 'PHAR':
          patientStatus = 'IN_PHARMACY';
          break;
        default:
          patientStatus = source === 'TRIAGE' ? 'IN_TRIAGE' : 'WAITING';
      }

      // Update patient record
      await patient.update({
        status: patientStatus,
        isRevisit: true, // Mark as revisit
        lastDepartmentId: departmentId,
        lastQueueTime: new Date()
      }, { transaction });

      await transaction.commit();

      // Fetch complete queue entry with associations
      const completeQueueEntry = await DepartmentQueue.findByPk(queueEntry.id, {
        include: [
          {
            model: Patient,
            attributes: ['id', 'patientNumber', 'surname', 'otherNames', 'sex', 'dateOfBirth', 'isEmergency']
          },
          {
            model: Department,
            attributes: ['id', 'name', 'code']
          },
          {
            model: User,
            as: 'assignedStaff',
            attributes: ['id', 'surname', 'otherNames']
          },
          {
            model: Triage,
            attributes: ['id', 'category', 'priorityScore']
          }
        ]
      });

      res.status(201).json({
        success: true,
        message: `Successfully added to ${department.name} queue`,
        data: {
          queueEntry: completeQueueEntry,
          estimatedWaitTime,
          position: waitingPatients + 1
        }
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Error in addToQueue:', error);
    next(error);
  }
};


exports.getDepartmentQueue = async (req, res, next) => {
  try {
    const { departmentId } = req.params;
    const { status } = req.query;

    const whereClause = {
      departmentId,
      ...(status && { status })
    };

    const queue = await DepartmentQueue.findAll({
      where: whereClause,
      include: [
        {
          model: Patient,
          attributes: ['id', 'patientNumber', 'surname', 'otherNames', 'sex', 'dateOfBirth', 'isEmergency']
        },
        {
          model: User,
          as: 'assignedStaff',
          attributes: ['id', 'surname', 'otherNames']
        },
        {
          model: Triage,
          attributes: ['id', 'category', 'priorityScore']
        }
      ],
      order: [
        ['priority', 'ASC'],
        ['createdAt', 'ASC']
      ]
    });

    res.json({
      success: true,
      data: queue
    });

  } catch (error) {
    next(error);
  }
};


exports.getDoctorDepartmentQueue = async (req, res, next) => {
  try {
    const doctorId = req.user.id;

    // Get doctor's department
    const doctor = await User.findByPk(doctorId, {
      attributes: ['departmentId']
    });

    if (!doctor || !doctor.departmentId) {
      return res.status(400).json({
        success: false,
        message: 'Doctor not assigned to any department'
      });
    }

    const queue = await DepartmentQueue.findAll({
      where: {
        departmentId: doctor.departmentId,
        status: {
          [Op.in]: ['WAITING', 'IN_PROGRESS']
        }
      },
      include: [
        {
          model: Patient,
          attributes: ['id', 'patientNumber', 'surname', 'otherNames', 'sex', 
                      'dateOfBirth', 'isEmergency', 'occupation', 'status']
        },
        {
          model: Department,
          attributes: ['id', 'name', 'code']
        },
        {
          model: User,
          as: 'assignedStaff',
          attributes: ['id', 'surname', 'otherNames']
        }
      ],
      order: [
        ['priority', 'ASC'],
        ['createdAt', 'ASC']
      ]
    });

    res.json({
      success: true,
      data: queue
    });

  } catch (error) {
    next(error);
  }
};


exports.getLabQueue = async (req, res, next) => {
  try {
    const labTechnician = await User.findByPk(req.user.id, {
      attributes: ['departmentId'] 
    });
 
    const queue = await DepartmentQueue.findAll({
      where: {
        departmentId: labTechnician.departmentId,
        status: {
          [Op.in]: ['WAITING', 'IN_PROGRESS']
        }
      },
      include: [
        {
          model: Patient,
          attributes: ['id', 'patientNumber', 'surname', 'otherNames', 'sex', 'dateOfBirth', 'isEmergency']
        },
        {
          model: User,
          as: 'assignedStaff',
          attributes: ['id', 'surname', 'otherNames']  
        },
        {
          model: Triage,
          attributes: ['id', 'category', 'priorityScore']
        }
      ],
      order: [
        ['priority', 'ASC'],
        ['createdAt', 'ASC'] 
      ]
    });
 
    res.json({
      success: true,
      data: queue
    });
 
  } catch (error) {
    next(error);
  }
 };

exports.getLabDepartmentQueue = async (req, res, next) => {
  try {
    const staffId = req.user.id;
    const staff = await User.findByPk(staffId, {
      attributes: ['departmentId', 'role']
    });

    const includeModels = [
      {
        model: Patient,
        attributes: ['id', 'patientNumber', 'surname', 'otherNames', 'sex', 'dateOfBirth', 'isEmergency']
      },
      {
        model: Department,
        attributes: ['id', 'name', 'code']
      }
    ];

    // Add LabTest association for lab technicians
    if (staff.role === 'LAB_TECHNICIAN') {
      includeModels.push({
        model: LabTest,
        as: 'labTest',
        required: true,
        include: [{
          model: User,
          as: 'requestedBy',
          attributes: ['id', 'surname', 'otherNames']
        }]
      });
    }

    const queue = await DepartmentQueue.findAll({
      where: {
        departmentId: staff.departmentId,
        status: {
          [Op.in]: ['WAITING', 'IN_PROGRESS']
        }
      },
      include: includeModels,
      order: [
        ['priority', 'ASC'],
        ['createdAt', 'ASC']
      ]
    });

    res.json({
      success: true,
      data: queue
    });

  } catch (error) {
    next(error);
  }
};

exports.submitConsultation = async (req, res, next) => {
  try {
    const doctorId = req.user.id;
    const { queueId } = req.params;
    const {
      complaints,
      hpi,
      medicalHistory,
      familySocialHistory,
      allergies,
      impressions,
      diagnosis,
      notes
    } = req.body;

    // Validate queue entry exists and belongs to doctor's department
    const queueEntry = await DepartmentQueue.findOne({
      where: {
        id: queueId,
        status: 'IN_PROGRESS'
      },
      include: [{
        model: Patient
      }]
    });

    if (!queueEntry) {
      return res.status(404).json({
        success: false,
        message: 'Invalid queue entry or consultation not in progress'
      });
    }

    // Start transaction
    const transaction = await DepartmentQueue.sequelize.transaction();

    try {
      // Create medical record
      const medicalRecord = await MedicalRecord.create({
        patientId: queueEntry.patientId,
        doctorId,
        queueEntryId: queueId,
        complaints,
        hpi,
        medicalHistory,
        familySocialHistory,
        allergies,
        impressions,
        diagnosis,
        notes,
        status: 'ACTIVE'
      }, { transaction });

      // Keep the queue entry in IN_PROGRESS status for department transfer
      // Don't update the queue entry status to COMPLETED yet
      
      // The patient status stays as IN_CONSULTATION
      // Don't update patient status yet - will be updated during department transfer

      await transaction.commit();

      // Fetch complete record with associations
      const completeRecord = await MedicalRecord.findByPk(medicalRecord.id, {
        include: [
          {
            model: Patient,
            attributes: ['id', 'patientNumber', 'surname', 'otherNames']
          },
          {
            model: User,
            as: 'doctor',
            attributes: ['id', 'surname', 'otherNames']
          }
        ]
      });

      res.status(201).json({
        success: true,
        message: 'Medical record saved successfully. Please assign the patient to the next department.',
        data: completeRecord
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Transaction error:', error);
      throw error;
    }

  } catch (error) {
    console.error('Error in submitConsultation:', error);
    next(error);
  }
};

exports.updateQueueStatus = async (req, res, next) => {
  try {
    const { queueId } = req.params;
    const { status, notes } = req.body;

    const queueEntry = await DepartmentQueue.findByPk(queueId, {
      include: [{ model: Patient }, { model: Department }]
    });

    if (!queueEntry) {
      return res.status(404).json({
        success: false,
        message: 'Queue entry not found'
      });
    }

    const updates = {
      status,
      notes: notes ? `${queueEntry.notes || ''}\n${notes}` : queueEntry.notes
    };

    // Handle different status transitions
    switch (status) {
      case 'IN_PROGRESS':
        updates.startTime = new Date();
        break;
      
      case 'COMPLETED':
      case 'TRANSFERRED':
        updates.endTime = new Date();
        updates.actualWaitTime = Math.floor(
          (new Date() - new Date(queueEntry.startTime || queueEntry.createdAt)) / (1000 * 60)
        );
        break;
    }

    await queueEntry.update(updates);

    // Update patient status based on department type
    if (queueEntry.Patient) {
      let patientStatus;
      switch (queueEntry.Department.code) {
        case 'EMERG':
          patientStatus = status === 'IN_PROGRESS' ? 'IN_EMERGENCY' : patientStatus;
          break;
        case 'LAB':
          patientStatus = status === 'IN_PROGRESS' ? 'IN_LABORATORY' : patientStatus;
          break;
        case 'RAD':
          patientStatus = status === 'IN_PROGRESS' ? 'IN_RADIOLOGY' : patientStatus;
          break;
        case 'PHAR':
          patientStatus = status === 'IN_PROGRESS' ? 'IN_PHARMACY' : patientStatus;
          break;
        default:
          patientStatus = status === 'IN_PROGRESS' ? 'IN_CONSULTATION' : patientStatus;
      }

      if (status === 'COMPLETED') patientStatus = 'CONSULTATION_COMPLETE';
      if (status === 'TRANSFERRED') patientStatus = 'TRANSFERRED';

      await queueEntry.Patient.update({ status: patientStatus });
    }

    res.json({
      success: true,
      data: queueEntry
    });

  } catch (error) {
    next(error);
  }
};

exports.assignDoctor = async (req, res, next) => {
  try {
    const { queueId } = req.params;
    const { doctorId } = req.body;

    const queueEntry = await DepartmentQueue.findByPk(queueId);
    if (!queueEntry) {
      return res.status(404).json({
        success: false,
        message: 'Queue entry not found'
      });
    }

    // Verify doctor exists and belongs to department
    const doctor = await User.findOne({
      where: {
        id: doctorId,
        role: 'DOCTOR',
        departmentId: queueEntry.departmentId
      }
    });

    if (!doctor) {
      return res.status(400).json({
        success: false,
        message: 'Invalid doctor assignment'
      });
    }

    await queueEntry.update({ assignedToId: doctorId });

    res.json({
      success: true,
      data: queueEntry
    });

  } catch (error) {
    next(error);
  }
};

exports.transferToAnotherDepartment = async (req, res, next) => {
  try {
    const { queueId } = req.params;
    const { newDepartmentId, reason } = req.body;

    const queueEntry = await DepartmentQueue.findByPk(queueId, {
      include: [{ model: Patient }]
    });

    if (!queueEntry) {
      return res.status(404).json({
        success: false,
        message: 'Queue entry not found'
      });
    }

    // Get the last queue number for the target department
    const lastQueue = await DepartmentQueue.findOne({
      where: {
        departmentId: newDepartmentId,
        createdAt: {
          [Op.gte]: new Date().setHours(0, 0, 0, 0)
        }
      },
      order: [['queueNumber', 'DESC']]
    });

    const newQueueNumber = lastQueue ? lastQueue.queueNumber + 1 : 1;

    // Start a transaction
    const transaction = await DepartmentQueue.sequelize.transaction();

    try {
      // Close current queue entry
      await queueEntry.update({
        status: 'TRANSFERRED',
        endTime: new Date(),
        actualWaitTime: queueEntry.calculateWaitTime(),
        notes: queueEntry.notes ? 
          `${queueEntry.notes}\nTransferred to another department. Reason: ${reason}` :
          `Transferred to another department. Reason: ${reason}`
      }, { transaction });

      // Create new queue entry in target department
      const newQueueEntry = await DepartmentQueue.create({
        patientId: queueEntry.patientId,
        departmentId: newDepartmentId,
        queueNumber: newQueueNumber,
        priority: queueEntry.priority,
        source: 'TRANSFER',
        notes: `Transferred from previous department. Reason: ${reason}`,
        startTime: null,
        endTime: null,
        estimatedWaitTime: 30, // Default 30 minutes, can be adjusted based on department average
        status: 'WAITING'
      }, { transaction });

      // Update patient status if patient record exists
      if (queueEntry.Patient) {
        await queueEntry.Patient.update({
          status: 'TRANSFERRED'
        }, { transaction });
      }

      await transaction.commit();

      // Fetch the complete new queue entry with associations
      const completedNewQueueEntry = await DepartmentQueue.findByPk(newQueueEntry.id, {
        include: [
          {
            model: Department,
            attributes: ['name', 'code']
          }
        ]
      });

      res.json({
        success: true,
        message: 'Patient transferred successfully',
        data: {
          previousQueue: {
            id: queueEntry.id,
            status: queueEntry.status,
            endTime: queueEntry.endTime,
            waitTime: queueEntry.actualWaitTime
          },
          newQueue: {
            id: completedNewQueueEntry.id,
            department: completedNewQueueEntry.Department?.name,
            queueNumber: completedNewQueueEntry.queueNumber,
            status: completedNewQueueEntry.status,
            estimatedWaitTime: completedNewQueueEntry.estimatedWaitTime
          }
        }
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Error in transfer:', error);
    next(error);
  }
};


async function calculateEstimatedWaitTime(departmentId) {
  const lastFiveCompletedPatients = await DepartmentQueue.findAll({
    where: {
      departmentId,
      status: ['COMPLETED', 'TRANSFERRED'],
      endTime: { [Op.not]: null },
      startTime: { [Op.not]: null }
    },
    order: [['endTime', 'DESC']],
    limit: 5
  });

  if (lastFiveCompletedPatients.length === 0) {
    return 30; // Default 30 minutes if no historical data
  }

  // Calculate average wait time
  const totalWaitTime = lastFiveCompletedPatients.reduce((sum, patient) => {
    const waitTime = Math.floor(
      (new Date(patient.endTime) - new Date(patient.startTime)) / (1000 * 60)
    );
    return sum + waitTime;
  }, 0);

  return Math.floor(totalWaitTime / lastFiveCompletedPatients.length);
}

exports.getPatientQueueHistory = async (req, res, next) => {
  try {
    const { patientId } = req.params;

    const queueHistory = await DepartmentQueue.findAll({
      where: {
        patientId
      },
      include: [
        {
          model: Department,
          attributes: ['id', 'name', 'code']
        },
        {
          model: User,
          as: 'assignedStaff',
          attributes: ['id', 'surname', 'otherNames']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Calculate wait times and format response
    const formattedHistory = queueHistory.map(entry => ({
      id: entry.id,
      department: {
        id: entry.Department.id,
        name: entry.Department.name,
        code: entry.Department.code
      },
      queueNumber: entry.queueNumber,
      priority: entry.priority,
      status: entry.status,
      assignedTo: entry.assignedStaff ? 
        `${entry.assignedStaff.surname} ${entry.assignedStaff.otherNames}` : null,
      waitTime: entry.actualWaitTime || 
        (entry.startTime ? 
          Math.floor((new Date(entry.startTime) - new Date(entry.createdAt)) / (1000 * 60)) : 
          Math.floor((new Date() - new Date(entry.createdAt)) / (1000 * 60))),
      source: entry.source,
      createdAt: entry.createdAt,
      startTime: entry.startTime,
      endTime: entry.endTime,
      notes: entry.notes
    }));

    res.json({
      success: true,
      data: {
        patientId,
        totalEntries: formattedHistory.length,
        queueHistory: formattedHistory
      }
    });

  } catch (error) {
    console.error('Error fetching patient queue history:', error);
    next(error);
  }
};