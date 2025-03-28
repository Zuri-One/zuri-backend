const { LabTest, Patient, User, DepartmentQueue } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../models').sequelize;


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


exports.startLabTest = async (req, res, next) => {
  try {
    const { queueEntryId } = req.params;
    const labTechnicianId = req.user.id;

    const queueEntry = await DepartmentQueue.findOne({
      where: { id: queueEntryId },
      include: [{ model: LabTest, as: 'labTest' }]
    });

    if (!queueEntry) {
      return res.status(404).json({
        success: false,
        message: 'Queue entry not found'
      });
    }

    const transaction = await DepartmentQueue.sequelize.transaction();

    try {
      // Update queue entry status
      await queueEntry.update({
        status: 'IN_PROGRESS',
        startTime: new Date()
      }, { transaction });

      // Update lab test
      await queueEntry.labTest.update({
        status: 'IN_PROGRESS',
        assignedToId: labTechnicianId
      }, { transaction });

      await transaction.commit();

      res.json({
        success: true,
        message: 'Lab test started successfully'
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Error in startLabTest:', error);
    next(error);
  }
};

exports.updateLabTest = async (req, res, next) => {
  try {
    const { queueEntryId } = req.params;
    const {
      results,
      referenceRange,
      isCritical,
      notes,
      status,
      expectedCompletionDate
    } = req.body;

    const queueEntry = await DepartmentQueue.findOne({
      where: { id: queueEntryId },
      include: [{ model: LabTest, as: 'labTest' }]
    });

    if (!queueEntry) {
      return res.status(404).json({
        success: false,
        message: 'Queue entry not found'
      });
    }

    const transaction = await DepartmentQueue.sequelize.transaction();

    try {
      // Update lab test
      await queueEntry.labTest.update({
        results,
        referenceRange,
        isCritical,
        notes,
        status,
        expectedCompletionDate,
        resultDate: status === 'COMPLETED' ? new Date() : null
      }, { transaction });

      // If test is completed, update queue entry
      if (status === 'COMPLETED') {
        await queueEntry.update({
          status: 'COMPLETED',
          endTime: new Date(),
          actualWaitTime: Math.floor(
            (new Date() - new Date(queueEntry.startTime)) / (1000 * 60)
          )
        }, { transaction });

        // Update patient status
        await queueEntry.Patient.update({
          status: 'WAITING'  // Return to waiting status for next department
        }, { transaction });
      }

      await transaction.commit();

      res.json({
        success: true,
        message: 'Lab test updated successfully'
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Error in updateLabTest:', error);
    next(error);
  }
};

exports.getLabStats = async (req, res, next) => {
  try {
    const labTechnicianId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get department ID
    const labTechnician = await User.findByPk(labTechnicianId, {
      attributes: ['departmentId']
    });

    // Get pending tests count
    const pendingTests = await LabTest.count({
      include: [{
        model: DepartmentQueue,
        as: 'queueEntry',
        where: {
          departmentId: labTechnician.departmentId,
          status: {
            [Op.in]: ['PENDING', 'IN_PROGRESS']
          }
        }
      }]
    });

    // Get completed tests today
    const completedToday = await LabTest.count({
      where: {
        status: 'COMPLETED',
        resultDate: {
          [Op.gte]: today
        }
      },
      include: [{
        model: DepartmentQueue,
        as: 'queueEntry',
        where: {
          departmentId: labTechnician.departmentId
        }
      }]
    });

    // Get critical results count
    const criticalResults = await LabTest.count({
      where: {
        isCritical: true,
        status: 'COMPLETED',
        resultDate: {
          [Op.gte]: today
        }
      },
      include: [{
        model: DepartmentQueue,
        as: 'queueEntry',
        where: {
          departmentId: labTechnician.departmentId
        }
      }]
    });

    res.json({
      success: true,
      data: {
        pendingTests,
        completedToday,
        criticalResults
      }
    });

  } catch (error) {
    console.error('Error in getLabStats:', error);
    next(error);
  }
};