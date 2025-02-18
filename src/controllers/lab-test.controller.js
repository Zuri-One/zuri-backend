const { LabTest, User, Patient, DepartmentQueue} = require('../models');
const { Op } = require('sequelize');
const { generateLabReport } = require('../utils/pdf.util');
const sendEmail = require('../utils/email.util');

const labTestController = {
  // Create new lab test
  createLabTest: async (req, res, next) => {
    console.log('========= LAB TEST CREATION START =========');
    console.log('Received lab test request:', req.body);
    console.log('User making request:', {
      userId: req.user.id,
      role: req.user.role
    });
  
    try {
      const {
        patientId,
        queueEntryId,
        testType,
        priority,
        notes
      } = req.body;
  
      console.log('Processing lab test creation with data:', {
        patientId,
        queueEntryId,
        testType,
        priority,
        notes,
        requestedById: req.user.id
      });
  
      const labTest = await LabTest.create({
        patientId,
        queueEntryId,
        requestedById: req.user.id,
        testType,
        priority: priority || 'NORMAL',
        notes,
        status: 'PENDING'
      });
  
      console.log('Lab test created successfully:', {
        testId: labTest.id,
        patientId: labTest.patientId,
        status: labTest.status
      });
  
      res.status(201).json({
        success: true,
        message: 'Lab test ordered successfully',
        labTest
      });
  
      console.log('========= LAB TEST CREATION COMPLETE =========');
    } catch (error) {
      console.error('Lab test creation error:', error);
      console.error('Stack trace:', error.stack);
      console.log('========= LAB TEST CREATION FAILED =========');
      next(error);
    }
  },

  // Get all lab tests
  getLabTests: async (req, res, next) => {
    try {
      const {
        status,
        priority,
        patientId,
        page = 1,
        limit = 10
      } = req.query;
  
      const whereClause = {};
  
      if (status) whereClause.status = status;
      if (priority) whereClause.priority = priority;
      if (patientId) whereClause.patientId = patientId;
  
      console.log('Query params:', { status, priority, patientId });
      console.log('Where clause:', whereClause);
  
      const { count, rows: labTests } = await LabTest.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: ['id', 'patientNumber', 'surname', 'otherNames']
          },
          {
            model: User,
            as: 'requestedBy',
            attributes: ['id', 'surname', 'otherNames']
          },
          {
            model: DepartmentQueue,
            as: 'queueEntry'
          }
        ],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        order: [['createdAt', 'DESC']]
      });
  
      res.json({
        success: true,
        count,
        pages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        labTests
      });
  
    } catch (error) {
      console.error('Lab tests fetch error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
      next(error);
    }
  },

  // Get pending tests
  getPendingTests: async (req, res, next) => {
    try {
      const labTests = await LabTest.findAll({
        where: { status: 'ORDERED' },
        include: [
          {
            model: User,
            as: 'PATIENT',
            attributes: ['id', 'name', 'email']
          },
          {
            model: User,
            as: 'referringDoctor',
            attributes: ['id', 'name', 'email']
          }
        ],
        order: [['createdAt', 'ASC']]
      });

      res.json({
        success: true,
        labTests
      });
    } catch (error) {
      next(error);
    }
  },

  getCurrentSessionResults: async (req, res, next) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
  
      const labTests = await LabTest.findAll({
        where: {
          resultDate: {
            [Op.gte]: today
          },
          status: 'COMPLETED'
        },
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: ['id', 'patientNumber', 'surname', 'otherNames']
          },
          {
            model: User,
            as: 'requestedBy',
            attributes: ['id', 'surname', 'otherNames']
          },
          {
            model: User,
            as: 'sampleCollector',
            attributes: ['id', 'surname', 'otherNames']
          }
        ],
        order: [['resultDate', 'DESC']]
      });
  
      res.json({
        success: true,
        count: labTests.length,
        results: labTests
      });
    } catch (error) {
      next(error);
    }
  },


   getLabAnalytics: async (req, res, next) => {
    try {
      const { startDate, endDate } = req.query;
      const dateRange = {
        createdAt: {}
      };
  
      if (startDate) {
        dateRange.createdAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        dateRange.createdAt[Op.lte] = new Date(endDate);
      }
  
      // Get total tests
      const totalTests = await LabTest.count({
        where: dateRange
      });
  
      // Get tests by status
      const testsByStatus = await LabTest.findAll({
        where: dateRange,
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['status']
      });
  
      // Get tests by type
      const testsByType = await LabTest.findAll({
        where: dateRange,
        attributes: [
          'testType',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['testType']
      });
  
      // Get abnormal/critical results
      const abnormalResults = await LabTest.count({
        where: {
          ...dateRange,
          isAbnormal: true
        }
      });
  
      const criticalResults = await LabTest.count({
        where: {
          ...dateRange,
          isCritical: true
        }
      });
  
      // Get average turnaround time
      const testsWithTurnaround = await LabTest.findAll({
        where: {
          ...dateRange,
          status: 'COMPLETED',
          sampleCollectionDate: { [Op.not]: null },
          resultDate: { [Op.not]: null }
        },
        attributes: [
          'sampleCollectionDate',
          'resultDate'
        ]
      });
  
      const averageTurnaroundTime = testsWithTurnaround.reduce((acc, test) => {
        const turnaround = new Date(test.resultDate) - new Date(test.sampleCollectionDate);
        return acc + turnaround;
      }, 0) / (testsWithTurnaround.length || 1);
  
      // Get daily test counts
      const dailyTestCounts = await LabTest.findAll({
        where: dateRange,
        attributes: [
          [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: [sequelize.fn('DATE', sequelize.col('createdAt'))]
      });
  
      res.json({
        success: true,
        data: {
          totalTests,
          testsByStatus,
          testsByType,
          abnormalResults,
          criticalResults,
          averageTurnaroundTime: Math.round(averageTurnaroundTime / (1000 * 60)), // Convert to minutes
          dailyTestCounts
        }
      });
    } catch (error) {
      next(error);
    }
  },

  

  // Get lab test by ID
  getLabTestById: async (req, res, next) => {
    try {
      const { id } = req.params;
  
      const labTest = await LabTest.findOne({
        where: { id },
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: ['id', 'patientNumber', 'surname', 'otherNames']
          },
          {
            model: User,
            as: 'requestedBy',
            attributes: ['id', 'surname', 'otherNames']
          },
          {
            model: User,
            as: 'sampleCollector',
            foreignKey: 'sampleCollectedById',
            attributes: ['id', 'surname', 'otherNames']
          }
        ]
      });
  
      if (!labTest) {
        return res.status(404).json({
          success: false,
          message: 'Lab test not found'
        });
      }
  
      const formattedResponse = {
        success: true,
        labTest: {
          id: labTest.id,
          patientId: labTest.patientId,
          testType: labTest.testType,
          status: labTest.status,
          createdAt: labTest.createdAt, 
          patient: {
            surname: labTest.patient.surname,
            otherNames: labTest.patient.otherNames,
            patientNumber: labTest.patient.patientNumber
          },
          statusHistory: [{
            status: labTest.status,
            timestamp: labTest.updatedAt,
            updatedBy: `${labTest.requestedBy.surname} ${labTest.requestedBy.otherNames}`,
            notes: labTest.notes
          }],
          sampleCollection: labTest.sampleId ? {
            sampleId: labTest.sampleId,
            collectedAt: labTest.sampleCollectionDate,
            collectedBy: labTest.sampleCollector ? 
              `${labTest.sampleCollector.surname} ${labTest.sampleCollector.otherNames}` : 
              'Unknown',
            notes: labTest.notes
          } : null,
          results: labTest.results ? {
            addedAt: labTest.resultDate,
            addedBy: labTest.sampleCollector ? 
              `${labTest.sampleCollector.surname} ${labTest.sampleCollector.otherNames}` : 
              'Unknown',
            data: labTest.results,
            referenceRange: labTest.referenceRange,
            isAbnormal: labTest.isAbnormal,
            notes: labTest.notes
          } : null
        }
      };
  
      res.json(formattedResponse);
    } catch (error) {
      console.error('Error in getLabTestById:', error);
      next(error);
    }
  },

  // Update test status
  updateTestStatus: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status, results, notes, isAbnormal, isCritical } = req.body;

      const labTest = await LabTest.findByPk(id);

      if (!labTest) {
        return res.status(404).json({
          success: false,
          message: 'Lab test not found'
        });
      }

      await labTest.update({
        status,
        results,
        technicianNotes: notes,
        isAbnormal,
        isCritical,
        technicianId: req.user.id
      });

      res.json({
        success: true,
        message: 'Lab test updated successfully',
        labTest
      });
    } catch (error) {
      next(error);
    }
  },

  collectSample: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { sampleCollectionNotes } = req.body;
  
      const labTest = await LabTest.findByPk(id);
      if (!labTest) {
        return res.status(404).json({
          success: false,
          message: 'Lab test not found'
        });
      }
  
      // Generate sample ID: LAB + YY + MM + 4-digit sequence
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      
      // Get count of samples for this month to generate sequence
      const monthSampleCount = await LabTest.count({
        where: {
          sampleId: {
            [Op.like]: `LAB${year}${month}%`
          }
        }
      });
  
      const sampleId = `LAB${year}${month}${(monthSampleCount + 1).toString().padStart(4, '0')}`;
  
      await labTest.update({
        sampleId,
        sampleCollectionDate: new Date(),
        sampleCollectedById: req.user.id,
        status: 'SAMPLE_COLLECTED',
        notes: sampleCollectionNotes
      });
  
      res.json({
        success: true,
        message: 'Sample collected successfully',
        labTest
      });
    } catch (error) {
      next(error);
    }
  },

  // Approve collected sample
  approveSample: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { approved, rejectionReason } = req.body;

      const labTest = await LabTest.findByPk(id);
      if (!labTest) {
        return res.status(404).json({
          success: false,
          message: 'Lab test not found'
        });
      }

      await labTest.update({
        status: approved ? 'IN_PROGRESS' : 'PENDING',
        notes: rejectionReason || labTest.notes
      });

      res.json({
        success: true,
        message: approved ? 'Sample approved' : 'Sample rejected',
        labTest
      });
    } catch (error) {
      next(error);
    }
  },

  // Add test results
  addTestResults: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { results, referenceRange, isAbnormal, notes } = req.body;

      const labTest = await LabTest.findByPk(id);
      if (!labTest) {
        return res.status(404).json({
          success: false,
          message: 'Lab test not found'
        });
      }

      await labTest.update({
        results,
        referenceRange,
        isAbnormal,
        notes,
        resultDate: new Date(),
        status: 'COMPLETED'
      });

      res.json({
        success: true,
        message: 'Test results added successfully',
        labTest
      });
    } catch (error) {
      next(error);
    }
  },

  // Get patient test history
  getPatientTestHistory: async (req, res, next) => {
    try {
      const { patientId } = req.params;
      const { startDate, endDate, testType } = req.query;

      const whereClause = {
        patientId,
        status: 'COMPLETED'
      };

      if (startDate && endDate) {
        whereClause.resultDate = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }

      if (testType) {
        whereClause.testType = testType;
      }

      const tests = await LabTest.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'requestedBy',
            attributes: ['id', 'surname', 'otherNames']
          }
        ],
        order: [['resultDate', 'DESC']]
      });

      res.json({
        success: true,
        tests
      });
    } catch (error) {
      next(error);
    }
  },

  // Get sample collection stats
  getSampleStats: async (req, res, next) => {
    try {
      const stats = await LabTest.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: {
          createdAt: {
            [Op.gte]: new Date(new Date() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        group: ['status']
      });

      res.json({
        success: true,
        stats
      });
    } catch (error) {
      next(error);
    }
  },



  // Mark critical value
  markCriticalValue: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { notifiedTo } = req.body;

      const labTest = await LabTest.findByPk(id);

      if (!labTest) {
        return res.status(404).json({
          success: false,
          message: 'Lab test not found'
        });
      }

      await labTest.update({
        isCritical: true,
        criticalValueNotified: true,
        notifiedTo,
        notifiedAt: new Date()
      });

      res.json({
        success: true,
        message: 'Critical value notification recorded',
        labTest
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = labTestController;