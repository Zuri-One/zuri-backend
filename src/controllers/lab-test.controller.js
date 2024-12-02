// src/controllers/lab-test.controller.js
const { LabTest, User } = require('../models');
const { Op } = require('sequelize');
const { generateLabReport } = require('../utils/pdf.util');
const sendEmail = require('../utils/email.util');

const labTestController = {
  // Create new lab test
  createLabTest: async (req, res, next) => {
    try {
      const {
        patientId,
        testType,
        testCategory,
        priority,
        specimenType,
        notes,
        price
      } = req.body;

      const labTest = await LabTest.create({
        patientId,
        referringDoctorId: req.user.id,
        testType,
        testCategory,
        priority,
        specimenType,
        notes,
        price,
        status: 'ORDERED'
      });

      res.status(201).json({
        success: true,
        message: 'Lab test ordered successfully',
        labTest
      });
    } catch (error) {
      next(error);
    }
  },

  // Get all lab tests
getLabTests: async (req, res, next) => {
  try {
    const {
      status,
      priority,
      category,
      startDate,
      endDate,
      page = 1,
      limit = 10
    } = req.query;

    const whereClause = {};

    if (status) {
      // Handle CRITICAL status differently
      if (status === 'CRITICAL') {
        whereClause.isCritical = true;
      } else {
        whereClause.status = status;
      }
    }

    if (priority) whereClause.priority = priority;
    if (category) whereClause.testCategory = category;

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate);
      if (endDate) whereClause.createdAt[Op.lte] = new Date(endDate);
    }

    try {
      const { count, rows: labTests } = await LabTest.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'patient',
            attributes: ['id', 'name', 'email']
          },
          {
            model: User,
            as: 'referringDoctor',
            attributes: ['id', 'name', 'email']
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
    } catch (queryError) {
      console.error('Query Error:', queryError);
      // Return empty results instead of error
      res.json({
        success: true,
        count: 0,
        pages: 0,
        currentPage: parseInt(page),
        labTests: []
      });
    }
  } catch (error) {
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
            as: 'patient',
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
            as: 'patient',
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