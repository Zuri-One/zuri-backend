const { LabTest, Patient, User, DepartmentQueue } = require('../models');
const { Op } = require('sequelize');

exports.getLabQueue = async (req, res, next) => {
  try {
    const labTechnicianId = req.user.id;
    const { status, priority, searchQuery } = req.query;

    // Get lab department ID from user's departmentId
    const labTechnician = await User.findByPk(labTechnicianId, {
      attributes: ['departmentId']
    });

    if (!labTechnician || !labTechnician.departmentId) {
      return res.status(400).json({
        success: false,
        message: 'Lab technician not assigned to any department'
      });
    }

    // Build where clause based on filters
    const whereClause = {
      departmentId: labTechnician.departmentId,
      status: {
        [Op.in]: ['PENDING', 'IN_PROGRESS']
      }
    };

    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    // Fetch queue entries
    const queueEntries = await DepartmentQueue.findAll({
        where: whereClause,
        include: [
          {
            model: Patient,
            attributes: ['id', 'patientNumber', 'surname', 'otherNames', 'sex', 'dateOfBirth', 'isEmergency']
          },
          {
            model: LabTest,
            as: 'labTest',
            required: true,
            where: priority ? { priority } : {},
            include: [
              {
                model: User,
                as: 'requestedBy',
                attributes: ['id', 'surname', 'otherNames']
              }
            ]
          }
        ],
        order: [
          ['priority', 'ASC'],
          ['createdAt', 'ASC']
        ]
      });

    // Transform data for frontend
    const transformedData = queueEntries.map(entry => ({
      id: entry.id,
      queueNumber: entry.queueNumber,
      patientNumber: entry.Patient.patientNumber,
      patientName: `${entry.Patient.surname} ${entry.Patient.otherNames}`,
      testType: entry.labTest.testType,
      requestDate: entry.createdAt,
      status: entry.status,
      priority: entry.labTest.priority,
      paymentStatus: entry.labTest.paymentStatus,
      isEmergency: entry.Patient.isEmergency,
      requestedBy: `${entry.labTest.requestedBy.surname} ${entry.labTest.requestedBy.otherNames}`,
      sampleId: entry.labTest.sampleId,
      sampleStatus: entry.labTest.status,
      notes: entry.labTest.notes
    }));

    // If search query exists, filter results
    let filteredData = transformedData;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredData = transformedData.filter(entry => 
        entry.patientNumber.toLowerCase().includes(query) ||
        entry.patientName.toLowerCase().includes(query) ||
        entry.testType.toLowerCase().includes(query) ||
        (entry.sampleId && entry.sampleId.toLowerCase().includes(query))
      );
    }

    res.json({
      success: true,
      data: filteredData
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