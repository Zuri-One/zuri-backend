const { DepartmentQueue, Patient, Department, User, Triage, MedicalRecord, LabTest  } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../models').sequelize;
const WhatsAppService = require('../services/whatsapp.service');

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
    patientStatus = 'IN_TRIAGE'; // or 'WAITING' 
    break;
  case 'LAB':
    patientStatus = 'IN_LABORATORY'; // Changed from 'WAITING_LABORATORY'
    break;
  case 'RAD':
    patientStatus = 'IN_RADIOLOGY'; // Changed from 'WAITING_RADIOLOGY'
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

      // Notify department staff via WhatsApp
      try {
        // Get all staff members in the department
        const departmentStaff = await User.findAll({
          where: {
            departmentId: departmentId,
            isActive: true
          },
          attributes: ['id', 'telephone1']
        });

        // Send WhatsApp notifications to all department staff
        for (const staff of departmentStaff) {
          if (staff.telephone1) {
            await WhatsAppService.sendQueueNotification(
              staff.telephone1,
              queueEntry.queueNumber.toString(),
              completeQueueEntry.Patient.patientNumber
            );
          }
        }
      } catch (notificationError) {
        console.error('Failed to send queue notifications:', notificationError);
        // Don't fail the request if notifications fail
      }

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


/**
 * Get lab queue including both physical queue and pending lab tests
 * @route GET /api/v1/queue/lab-queue
 */
exports.getLabQueue = async (req, res, next) => {
  try {
    const staffId = req.user.id;
    
    // Get lab technician's department
    const staff = await User.findByPk(staffId, {
      attributes: ['departmentId', 'role']
    });

    if (!staff || !staff.departmentId) {
      return res.status(400).json({
        success: false,
        message: 'Lab technician not assigned to any department'
      });
    }

    // Part 1: Get patients physically in the lab queue
    const queueEntries = await DepartmentQueue.findAll({
      where: {
        departmentId: staff.departmentId,
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
      ],
      order: [
        ['priority', 'ASC'],
        ['createdAt', 'ASC']
      ]
    });

    // Part 2: Get pending lab tests
    const pendingLabTests = await LabTest.findAll({
      where: {
        status: 'PENDING'
      },
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'patientNumber', 'surname', 'otherNames', 'sex', 'dateOfBirth', 'isEmergency']
        },
        {
          model: User,
          as: 'requestedBy',
          attributes: ['id', 'surname', 'otherNames']
        }
      ],
      order: [
        ['createdAt', 'ASC']
      ]
    });

    // Filter out pending lab tests where the patient is already in the queue
    const patientsInQueueIds = queueEntries.map(entry => entry.patientId);
    const filteredPendingTests = pendingLabTests.filter(test => 
      !patientsInQueueIds.includes(test.patientId)
    );

    // Get department info for lab department (needed for virtual entries)
    const labDepartment = await Department.findByPk(staff.departmentId);

    // Create virtual queue entries for pending lab tests
    const lastQueueNumber = queueEntries.length > 0 
      ? Math.max(...queueEntries.map(entry => entry.queueNumber)) 
      : 0;
      
    const virtualQueueEntries = filteredPendingTests.map((test, index) => {
      // Create a virtual queue entry that looks just like a real one
      return {
        id: `virtual-${test.id}`, // Use a special ID format to identify virtual entries
        patientId: test.patientId,
        departmentId: staff.departmentId,
        queueNumber: lastQueueNumber + index + 1,
        priority: test.priority === 'URGENT' ? 1 : 3, // Map lab test priority to queue priority
        status: 'WAITING',
        source: 'LAB_REQUEST',
        estimatedWaitTime: 30, // Default estimate
        createdAt: test.createdAt,
        updatedAt: test.updatedAt,
        notes: `Pending lab test: ${test.testType}. ${test.notes || ''}`,
        
        // Include related models with the same structure as real queue entries
        Patient: test.patient,
        Department: labDepartment,
        assignedStaff: test.requestedBy,
        
        // Add lab test specific info that might be useful
        labTest: {
          id: test.id,
          testType: test.testType,
          priority: test.priority,
          requestedAt: test.createdAt
        },
        
        // Flag this as a virtual entry
        isVirtual: true
      };
    });

    // Combine real and virtual queue entries
    const combinedQueue = [...queueEntries, ...virtualQueueEntries];
    
    // Sort by priority and then creation date
    combinedQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    res.json({
      success: true,
      data: combinedQueue
    });

  } catch (error) {
    console.error('Error in getLabQueue:', error);
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
    console.log('=== SUBMIT CONSULTATION STARTED ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User:', req.user);
    console.log('Queue ID:', req.params.queueId);

    const doctorId = req.user.id;
    const { queueId } = req.params;
    const {
      complaints,
      hpi,
      medicalHistory,
      familySocialHistory,
      allergies,
      examinationNotes,
      reviewOtherSystems,
      specialHistory,
      impressions,
      diagnosis,
      notes
    } = req.body;

    console.log('Extracted fields from req.body:', {
      complaints: !!complaints,
      hpi: !!hpi,
      medicalHistory: !!medicalHistory,
      familySocialHistory: !!familySocialHistory,
      allergies: !!allergies,
      examinationNotes: !!examinationNotes,
      reviewOtherSystems: !!reviewOtherSystems,
      specialHistory: !!specialHistory,
      impressions: !!impressions,
      diagnosis: !!diagnosis,
      notes: !!notes
    });

    // Validate queue entry exists and belongs to doctor's department
    console.log('Looking for queue entry with ID:', queueId);
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
      console.log('Queue entry not found or not IN_PROGRESS');
      return res.status(404).json({
        success: false,
        message: 'Invalid queue entry or consultation not in progress'
      });
    }

    console.log('Queue entry found:', {
      id: queueEntry.id,
      patientId: queueEntry.patientId,
      status: queueEntry.status
    });

    // Start transaction
    console.log('Starting database transaction...');
    const transaction = await DepartmentQueue.sequelize.transaction();

    try {
      // Create medical record
      const medicalRecordData = {
        patientId: queueEntry.patientId,
        doctorId,
        queueEntryId: queueId,
        complaints,
        hpi,
        medicalHistory,
        familySocialHistory,
        allergies,
        examinationNotes,
        reviewOtherSystems,
        specialHistory,
        impressions,
        diagnosis,
        notes,
        status: 'ACTIVE'
      };

      console.log('Creating medical record with data:', JSON.stringify(medicalRecordData, null, 2));

      const medicalRecord = await MedicalRecord.create(medicalRecordData, { transaction });

      console.log('Medical record created successfully:', {
        id: medicalRecord.id,
        patientId: medicalRecord.patientId,
        doctorId: medicalRecord.doctorId,
        hasExaminationNotes: !!medicalRecord.examinationNotes,
        hasReviewOtherSystems: !!medicalRecord.reviewOtherSystems,
        hasSpecialHistory: !!medicalRecord.specialHistory,
        allFields: Object.keys(medicalRecord.dataValues)
      });

      // Keep the queue entry in IN_PROGRESS status for department transfer
      // Don't update the queue entry status to COMPLETED yet
      
      // The patient status stays as IN_CONSULTATION
      // Don't update patient status yet - will be updated during department transfer

      console.log('Committing transaction...');
      await transaction.commit();

      // Fetch complete record with associations
      console.log('Fetching complete record with associations...');
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

      console.log('Complete record fetched:', {
        id: completeRecord.id,
        hasExaminationNotes: !!completeRecord.examinationNotes,
        hasReviewOtherSystems: !!completeRecord.reviewOtherSystems,
        hasSpecialHistory: !!completeRecord.specialHistory,
        examinationNotesValue: completeRecord.examinationNotes,
        reviewOtherSystemsValue: completeRecord.reviewOtherSystems,
        specialHistoryValue: completeRecord.specialHistory,
        allFields: Object.keys(completeRecord.dataValues)
      });

      console.log('=== SUBMIT CONSULTATION COMPLETED SUCCESSFULLY ===');
      res.status(201).json({
        success: true,
        message: 'Medical record saved successfully. Please assign the patient to the next department.',
        data: completeRecord
      });

    } catch (error) {
      console.log('Transaction error, rolling back...');
      await transaction.rollback();
      console.error('Transaction error:', error);
      throw error;
    }

  } catch (error) {
    console.error('=== SUBMIT CONSULTATION ERROR ===');
    console.error('Error in submitConsultation:', error);
    console.error('Error stack:', error.stack);
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