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

  // Get lab test by ID
  getLabTestById: async (req, res, next) => {
    try {
      const { id } = req.params;

      const labTest = await LabTest.findOne({
        where: { id },
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
          },
          {
            model: User,
            as: 'technician',
            attributes: ['id', 'name']
          }
        ]
      });

      if (!labTest) {
        return res.status(404).json({
          success: false,
          message: 'Lab test not found'
        });
      }

      res.json({
        success: true,
        labTest
      });
    } catch (error) {
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