const { LabTest, User, Patient, DepartmentQueue } = require('../models');
const { Op, sequelize } = require('sequelize');
const { generateLabReport } = require('../utils/pdf.util');
const sendEmail = require('../utils/email.util');
const WhatsAppService = require('../services/whatsapp.service');
const labTestCatalogService = require('../services/lab-test-catalog.service');

const labTestController = {
 

/**
   * Create new lab test
   * @route POST /api/v1/lab-test
   */
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

    // Validate test type exists in catalog
    let testDefinition = null;
    try {
      // First try to find by exact ID match
      testDefinition = await labTestCatalogService.getTestById(testType);
      
      // If not found by ID, try to find by display name
      if (!testDefinition) {
        const searchResults = await labTestCatalogService.searchTests(testType);
        testDefinition = searchResults.find(test => test.displayName === testType) || searchResults[0];
      }
    } catch (catalogError) {
      console.warn('Catalog service error, proceeding with legacy test type:', catalogError.message);
      // If catalog service fails, continue with legacy behavior
    }

    // If test definition found, validate it's active
    if (testDefinition && !testDefinition.active) {
      return res.status(400).json({
        success: false,
        message: `Test type ${testType} is currently inactive.`
      });
    }

    console.log('Processing lab test creation with data:', {
      patientId,
      queueEntryId,
      testType,
      priority,
      notes,
      requestedById: req.user.id,
      testDefinitionFound: !!testDefinition
    });

    // Fetch patient information
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Prepare lab test data
    const labTestData = {
      patientId,
      queueEntryId,
      requestedById: req.user.id,
      testType,
      priority: priority || 'NORMAL',
      notes,
      status: 'PENDING'
    };

    // Add metadata if test definition exists
    if (testDefinition) {
      labTestData.metadata = {
        testDefinitionId: testDefinition.id,
        estimatedPrice: testDefinition.price,
        fastingRequired: testDefinition.fastingRequired,
        sampleType: testDefinition.sampleType,
        turnaroundTime: testDefinition.turnaroundTime,
        sampleVolume: testDefinition.sampleVolume,
        container: testDefinition.container
      };
    }

    const labTest = await LabTest.create(labTestData);

    console.log('Lab test created successfully:', {
      testId: labTest.id,
      patientId: labTest.patientId,
      status: labTest.status
    });

    // Send notifications to lab staff about new test request
    try {
      // Find lab department
      const labDepartment = await Department.findOne({
        where: { code: 'LAB' }
      });

      if (labDepartment) {
        // Find all active lab technicians
        const labStaff = await User.findAll({
          where: {
            departmentId: labDepartment.id,
            isActive: true,
            role: 'LAB_TECHNICIAN'
          },
          attributes: ['id', 'telephone1']
        });

        // Send WhatsApp notifications to all lab staff
        for (const staff of labStaff) {
          if (staff.telephone1) {
            await WhatsAppService.sendQueueNotification(
              staff.telephone1,
              testType, // Using test type as queue identifier
              patient.patientNumber
            );
          }
        }
        
        console.log(`Notifications sent to ${labStaff.length} lab staff members`);
      }
    } catch (notificationError) {
      console.error('Failed to send lab test notifications:', notificationError);
      // Don't fail the request if notifications fail
    }

    res.status(201).json({
      success: true,
      message: 'Lab test ordered successfully',
      labTest,
      testDefinition: testDefinition || null
    });

    console.log('========= LAB TEST CREATION COMPLETE =========');
  } catch (error) {
    console.error('Lab test creation error:', error);
    console.error('Stack trace:', error.stack);
    console.log('========= LAB TEST CREATION FAILED =========');
    next(error);
  }
},


    /**
   * Get available test types from catalog
   * @route GET /api/v1/lab-test/available-types
   */
    getAvailableTestTypes: async (req, res, next) => {
      try {
        const tests = await labTestCatalogService.getActiveTests();
        
        // Format for the existing frontend dropdown
        const testTypes = tests.map(test => test.displayName);
        
        res.json({
          success: true,
          testTypes,
          tests // Also include full test objects for enhanced functionality
        });
      } catch (error) {
        next(error);
      }
    },

  /**
   * Get all lab tests with enhanced filtering
   * @route GET /api/v1/lab-test
   */
  getLabTests: async (req, res, next) => {
    try {
      const {
        status,
        priority,
        patientId,
        testType,
        dateFrom,
        dateTo,
        sampleId,
        isAbnormal,
        isCritical,
        page = 1,
        limit = 10
      } = req.query;

      // Build where clause with all possible filters
      const whereClause = {};

      if (status) whereClause.status = status;
      if (priority) whereClause.priority = priority;
      if (patientId) whereClause.patientId = patientId;
      if (testType) whereClause.testType = testType;
      if (sampleId) whereClause.sampleId = sampleId;
      
      // Boolean filters
      if (isAbnormal === 'true') whereClause.isAbnormal = true;
      if (isCritical === 'true') whereClause.isCritical = true;
      
      // Date range filter
      if (dateFrom || dateTo) {
        whereClause.createdAt = {};
        if (dateFrom) whereClause.createdAt[Op.gte] = new Date(dateFrom);
        if (dateTo) {
          const endDate = new Date(dateTo);
          endDate.setHours(23, 59, 59, 999);
          whereClause.createdAt[Op.lte] = endDate;
        }
      }

      console.log('Query params:', req.query);
      console.log('Where clause:', whereClause);

      // Find tests with pagination
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
            model: User,
            as: 'sampleCollector',
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

      // Return response with pagination info
      res.json({
        success: true,
        count,
        pages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        labTests
      });

    } catch (error) {
      console.error('Lab tests fetch error:', error);
      next(error);
    }
  },

  /**
   * Get pending lab tests
   * @route GET /api/v1/lab-test/pending
   */
  getPendingTests: async (req, res, next) => {
    try {
      const labTests = await LabTest.findAll({
        where: { status: 'PENDING' },
        include: [
          {
            model: User,
            as: 'PATIENT',
            attributes: ['id', 'name', 'email']
          },
          {
            model: User,
            as: 'requestedBy',
            attributes: ['id', 'surname', 'otherNames']
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

  /**
   * Get test results from current session (today)
   * @route GET /api/v1/lab-test/current-session
   */
  getCurrentSessionResults: async (req, res, next) => {
    try {
      const { dateFrom, dateTo } = req.query;
      
      let whereClause = {};
      
      // If date range is provided, use it
      if (dateFrom || dateTo) {
        whereClause.createdAt = {};
        
        if (dateFrom) {
          const fromDate = new Date(dateFrom);
          fromDate.setHours(0, 0, 0, 0);
          whereClause.createdAt[Op.gte] = fromDate;
        }
        
        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999);
          whereClause.createdAt[Op.lte] = toDate;
        }
      } else {
        // Default to today if no date range is provided
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        whereClause.createdAt = {
          [Op.gte]: today
        };
      }
      
      // Add status filter - make it more flexible
      whereClause.status = {
        [Op.in]: ['COMPLETED', 'PENDING', 'SAMPLE_COLLECTED', 'IN_PROGRESS']
      };
  
      const labTests = await LabTest.findAll({
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
            model: User,
            as: 'sampleCollector',
            attributes: ['id', 'surname', 'otherNames']
          }
        ],
        order: [['createdAt', 'DESC']]
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

  /**
   * Get analytics data for lab tests
   * @route GET /api/v1/lab-test/analytics
   */
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

  /**
 * Get detailed lab test by ID (WITH DEBUG LOGS)
 * @route GET /api/v1/lab-test/:id
 */
getLabTestById: async (req, res, next) => {
  console.log('========= GET LAB TEST BY ID START =========');
  console.log('Request params:', req.params);
  console.log('User making request:', {
    id: req.user?.id,
    role: req.user?.role
  });

  try {
    const { id } = req.params;
    console.log('🔍 Searching for lab test with ID:', id);

    // Find lab test with all related data
    const labTest = await LabTest.findOne({
      where: { id },
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'patientNumber', 'surname', 'otherNames', 'dateOfBirth', 'sex']
        },
        {
          model: User,
          as: 'requestedBy',
          attributes: ['id', 'surname', 'otherNames', 'role']
        },
        {
          model: User,
          as: 'sampleCollector',
          attributes: ['id', 'surname', 'otherNames', 'role']
        }
      ]
    });

    if (!labTest) {
      console.log('❌ Lab test not found');
      return res.status(404).json({
        success: false,
        message: 'Lab test not found'
      });
    }

    console.log('✅ Lab test found');
    console.log('Raw lab test data from database:', {
      id: labTest.id,
      sampleId: labTest.sampleId,
      testType: labTest.testType,
      status: labTest.status,
      sampleCollectionDate: labTest.sampleCollectionDate,
      sampleCollectedById: labTest.sampleCollectedById,
      notes: labTest.notes,
      rawMetadata: labTest.metadata
    });

    console.log('🔍 Analyzing metadata structure:');
    console.log('Metadata exists:', !!labTest.metadata);
    console.log('Metadata type:', typeof labTest.metadata);
    console.log('Metadata keys:', labTest.metadata ? Object.keys(labTest.metadata) : 'N/A');
    console.log('Full metadata content:', JSON.stringify(labTest.metadata, null, 2));

    // Check collection metadata specifically
    console.log('🔍 Analyzing collection metadata:');
    console.log('metadata.collection exists:', !!(labTest.metadata?.collection));
    if (labTest.metadata?.collection) {
      console.log('Collection metadata keys:', Object.keys(labTest.metadata.collection));
      console.log('Collection method:', labTest.metadata.collection.method);
      console.log('Collection preparation:', labTest.metadata.collection.preparation);
      console.log('Collection timestamp:', labTest.metadata.collection.timestamp);
      console.log('Full collection metadata:', JSON.stringify(labTest.metadata.collection, null, 2));
    }

    // Extract sample collection method from multiple possible locations
    console.log('🔍 Extracting sample collection method:');
    let sampleCollectionMethod = null;
    let sampleCollectionPreparation = null;
    let extractionSource = 'not found';

    if (labTest.metadata?.collection?.method) {
      sampleCollectionMethod = labTest.metadata.collection.method;
      extractionSource = 'metadata.collection.method';
    } else if (labTest.metadata?.sampleCollectionMethod) {
      sampleCollectionMethod = labTest.metadata.sampleCollectionMethod;
      extractionSource = 'metadata.sampleCollectionMethod';
    }

    if (labTest.metadata?.collection?.preparation) {
      sampleCollectionPreparation = labTest.metadata.collection.preparation;
    } else if (labTest.metadata?.sampleCollectionPreparation) {
      sampleCollectionPreparation = labTest.metadata.sampleCollectionPreparation;
    }

    console.log('Sample collection method:', sampleCollectionMethod);
    console.log('Extraction source:', extractionSource);
    console.log('Sample collection preparation:', sampleCollectionPreparation);

    // Format response with comprehensive test information
    const formattedResponse = {
      success: true,
      labTest: {
        id: labTest.id,
        sampleId: labTest.sampleId,
        testType: labTest.testType,
        patientId: labTest.patientId,
        status: labTest.status,
        priority: labTest.priority,
        paymentStatus: labTest.paymentStatus,
        createdAt: labTest.createdAt,
        updatedAt: labTest.updatedAt,
        
        // Patient information
        patient: labTest.patient ? {
          id: labTest.patient.id,
          patientNumber: labTest.patient.patientNumber,
          name: `${labTest.patient.surname} ${labTest.patient.otherNames}`,
          sex: labTest.patient.sex,
          dateOfBirth: labTest.patient.dateOfBirth
        } : null,
        
        // Requester information
        requestedBy: labTest.requestedBy ? {
          id: labTest.requestedBy.id,
          name: `${labTest.requestedBy.surname} ${labTest.requestedBy.otherNames}`,
          role: labTest.requestedBy.role
        } : null,
        
        // Sample information
        sampleCollection: labTest.sampleId ? {
          sampleId: labTest.sampleId,
          collectedAt: labTest.sampleCollectionDate,
          collectedBy: labTest.sampleCollector ? 
            `${labTest.sampleCollector.surname} ${labTest.sampleCollector.otherNames}` : 
            'Unknown',
          method: sampleCollectionMethod,
          preparation: sampleCollectionPreparation,
          notes: labTest.notes
        } : null,
        
        // Results information
        results: labTest.results ? {
          data: labTest.results,
          referenceRange: labTest.referenceRange,
          isAbnormal: labTest.isAbnormal,
          isCritical: labTest.isCritical,
          resultDate: labTest.resultDate,
          requiresFollowUp: labTest.metadata?.requiresFollowUp || false,
          notes: labTest.notes
        } : null,
        
        // Additional metadata for UI display
        notes: labTest.notes,
        metadata: labTest.metadata || {}
      }
    };

    console.log('📤 Formatted response sample collection section:');
    console.log(JSON.stringify(formattedResponse.labTest.sampleCollection, null, 2));

    console.log('✅ Response formatted successfully');
    res.json(formattedResponse);
    
    console.log('========= GET LAB TEST BY ID END =========');
  } catch (error) {
    console.error('❌ Error in getLabTestById:', error);
    console.error('Error stack:', error.stack);
    console.log('========= GET LAB TEST BY ID FAILED =========');
    next(error);
  }
},

  /**
   * Update test status
   * @route PATCH /api/v1/lab-test/:id/status
   */
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

      // Update the status and related fields
      const updateData = { status };
      
      if (results) updateData.results = results;
      if (notes) updateData.notes = notes;
      if (isAbnormal !== undefined) updateData.isAbnormal = isAbnormal;
      if (isCritical !== undefined) updateData.isCritical = isCritical;
      
      // Add timestamp information based on status
      if (status === 'COMPLETED' && !labTest.resultDate) {
        updateData.resultDate = new Date();
      }

      // Update the metadata with status change history
      const statusHistory = labTest.metadata?.statusHistory || [];
      statusHistory.push({
        from: labTest.status,
        to: status,
        changedBy: req.user.id,
        changedAt: new Date(),
        notes
      });

      updateData.metadata = {
        ...labTest.metadata || {},
        statusHistory
      };

      await labTest.update(updateData);

      res.json({
        success: true,
        message: 'Lab test status updated successfully',
        labTest
      });
    } catch (error) {
      next(error);
    }
  },

 /**
 * Collect sample for lab test (WITH DEBUG LOGS)
 * @route POST /api/v1/lab-test/:id/collect-sample
 */
collectSample: async (req, res, next) => {
  console.log('========= COLLECT SAMPLE START =========');
  console.log('Request params:', req.params);
  console.log('Request body:', req.body);
  console.log('User making request:', {
    id: req.user.id,
    name: `${req.user.surname} ${req.user.otherNames}`,
    role: req.user.role
  });

  try {
    const { id } = req.params;
    const { 
      sampleCollectionMethod,
      patientPreparation,
      sampleCollectionNotes 
    } = req.body;

    console.log('Extracted data:', {
      testId: id,
      sampleCollectionMethod,
      patientPreparation,
      sampleCollectionNotes
    });

    // Validate required fields
    if (!sampleCollectionMethod) {
      console.log('❌ Validation failed: Sample collection method is required');
      return res.status(400).json({
        success: false,
        message: 'Sample collection method is required'
      });
    }

    console.log('✅ Validation passed');

    // Find the lab test
    console.log('🔍 Finding lab test with ID:', id);
    const labTest = await LabTest.findByPk(id);
    
    if (!labTest) {
      console.log('❌ Lab test not found');
      return res.status(404).json({
        success: false,
        message: 'Lab test not found'
      });
    }

    console.log('✅ Lab test found:', {
      id: labTest.id,
      currentStatus: labTest.status,
      currentMetadata: labTest.metadata
    });

    // Check if sample already collected
    if (labTest.status !== 'PENDING') {
      console.log('❌ Invalid status for sample collection:', labTest.status);
      return res.status(400).json({
        success: false,
        message: `Cannot collect sample. Test is already in ${labTest.status} status`
      });
    }

    console.log('✅ Status check passed - test is PENDING');

    // Generate sample ID with improved uniqueness
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    // Combine date parts with timestamp and random number for uniqueness
    const timestamp = Date.now().toString().slice(-5);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    // Format: LAB + YY + MM + DD + timestamp + random
    const sampleId = `LAB${year}${month}${day}${timestamp}${random}`;

    console.log('📋 Generated sample ID:', sampleId);

    // Create a metadata object for collection details
    const collectionMetadata = {
      method: sampleCollectionMethod,
      preparation: patientPreparation || null,
      collectedBy: {
        id: req.user.id,
        name: `${req.user.surname} ${req.user.otherNames}`,
        role: req.user.role
      },
      timestamp: new Date().toISOString()
    };

    console.log('📝 Created collection metadata:', JSON.stringify(collectionMetadata, null, 2));

    // Prepare the complete metadata object
    const completeMetadata = {
      ...labTest.metadata || {},
      collection: collectionMetadata
    };

    console.log('📝 Complete metadata to save:', JSON.stringify(completeMetadata, null, 2));

    // Prepare update data
    const updateData = {
      sampleId,
      sampleCollectionDate: new Date(),
      sampleCollectedById: req.user.id,
      status: 'SAMPLE_COLLECTED',
      notes: sampleCollectionNotes || labTest.notes,
      metadata: completeMetadata
    };

    console.log('🔄 Update data prepared:', JSON.stringify(updateData, null, 2));

    // Update lab test with sample information
    console.log('💾 Attempting to update lab test...');
    const updateResult = await labTest.update(updateData);

    console.log('✅ Lab test update completed');
    console.log('Updated lab test result:', {
      id: updateResult.id,
      sampleId: updateResult.sampleId,
      status: updateResult.status,
      sampleCollectionDate: updateResult.sampleCollectionDate,
      sampleCollectedById: updateResult.sampleCollectedById,
      notes: updateResult.notes,
      metadata: updateResult.metadata
    });

    // Verify the update by fetching fresh data
    console.log('🔍 Verifying update by fetching fresh data...');
    const freshLabTest = await LabTest.findByPk(id);
    console.log('Fresh lab test data after update:', {
      id: freshLabTest.id,
      sampleId: freshLabTest.sampleId,
      status: freshLabTest.status,
      metadata: freshLabTest.metadata
    });

    // Return success response
    console.log('✅ Sample collection completed successfully');
    res.status(200).json({
      success: true,
      message: 'Sample collected successfully',
      labTest: freshLabTest // Return the fresh data
    });

    console.log('========= COLLECT SAMPLE END =========');

  } catch (error) {
    console.error('❌ Sample collection error:', error);
    console.error('Error stack:', error.stack);
    console.log('========= COLLECT SAMPLE FAILED =========');
    next(error);
  }
},

  /**
   * Approve sample for testing
   * @route POST /api/v1/lab-test/:id/approve-sample
   */
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

      // Check if test is in correct status
      if (labTest.status !== 'SAMPLE_COLLECTED') {
        return res.status(400).json({
          success: false,
          message: `Cannot approve/reject sample. Test must be in SAMPLE_COLLECTED status, current status: ${labTest.status}`
        });
      }

      // Update the status based on approval decision
      const newStatus = approved ? 'IN_PROGRESS' : 'PENDING';
      const notes = rejectionReason || labTest.notes;

      // Track the approval/rejection in metadata
      const approvalMetadata = {
        approved,
        by: {
          id: req.user.id,
          name: `${req.user.surname} ${req.user.otherNames}`,
          role: req.user.role
        },
        timestamp: new Date().toISOString(),
        reason: rejectionReason || null
      };

      await labTest.update({
        status: newStatus,
        notes,
        metadata: {
          ...labTest.metadata || {},
          sampleApproval: approvalMetadata
        }
      });

      res.json({
        success: true,
        message: approved ? 'Sample approved for testing' : 'Sample rejected',
        labTest
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Add test results
   * @route POST /api/v1/lab-test/:id/results
   */
  addTestResults: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { 
        results, 
        referenceRange, 
        isAbnormal, 
        isCritical,
        requiresFollowUp,
        notes 
      } = req.body;

      // Validate test results
      if (!results || Object.keys(results).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Test results are required'
        });
      }

      // Find the lab test
      const labTest = await LabTest.findByPk(id);
      if (!labTest) {
        return res.status(404).json({
          success: false,
          message: 'Lab test not found'
        });
      }

      // Check if sample has been collected
      if (labTest.status !== 'SAMPLE_COLLECTED' && labTest.status !== 'IN_PROGRESS') {
        return res.status(400).json({
          success: false,
          message: `Cannot add results. Test must be in SAMPLE_COLLECTED or IN_PROGRESS status, current status: ${labTest.status}`
        });
      }

      // Create a metadata object for test results
      const resultsMetadata = {
        performedBy: {
          id: req.user.id,
          name: `${req.user.surname} ${req.user.otherNames}`,
          role: req.user.role
        },
        timestamp: new Date().toISOString(),
        abnormalFlags: {}
      };

      // Check each result against reference range
      let hasAbnormalResults = isAbnormal || false;
      if (referenceRange) {
        Object.keys(results).forEach(key => {
          if (referenceRange[key] && 
              (results[key] < referenceRange[key].min || 
               results[key] > referenceRange[key].max)) {
            resultsMetadata.abnormalFlags[key] = true;
            hasAbnormalResults = true;
          }
        });
      }

      // Update lab test with results information
      await labTest.update({
        results,
        referenceRange,
        isAbnormal: hasAbnormalResults,
        isCritical: isCritical || false,
        resultDate: new Date(),
        status: 'COMPLETED',
        notes: notes || labTest.notes,
        metadata: {
          ...labTest.metadata || {},
          results: resultsMetadata,
          requiresFollowUp: requiresFollowUp || false
        }
      });

      // If result is critical, create a notification record
      if (isCritical) {
        // Example notification logic - implement based on your system's notification mechanism
        console.log(`CRITICAL ALERT: Lab test ${labTest.id} has critical results.`);
        
        // You might want to send a notification to the requesting doctor
        // await notificationService.sendCriticalAlertToDoctor(labTest);
      }

      // Return success response
      res.status(200).json({
        success: true,
        message: 'Test results added successfully',
        labTest
      });

    } catch (error) {
      console.error('Adding test results error:', error);
      next(error);
    }
  },

  /**
   * Get patient test history
   * @route GET /api/v1/lab-test/patient/:patientId/history
   */
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
        count: tests.length,
        tests
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get sample collection stats
   * @route GET /api/v1/lab-test/stats/samples
   */
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

  /**
   * Mark critical value
   * @route POST /api/v1/lab-test/:id/critical
   */
  markCriticalValue: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { notifiedTo, criticalValues, notificationMethod } = req.body;

      const labTest = await LabTest.findByPk(id);

      if (!labTest) {
        return res.status(404).json({
          success: false,
          message: 'Lab test not found'
        });
      }

      // Ensure the test has results
      if (labTest.status !== 'COMPLETED' || !labTest.results) {
        return res.status(400).json({
          success: false,
          message: 'Test must be completed with results before marking critical values'
        });
      }

      // Create critical notification metadata
      const criticalNotification = {
        notifiedTo,
        notifiedBy: {
          id: req.user.id,
          name: `${req.user.surname} ${req.user.otherNames}`,
          role: req.user.role
        },
        notificationMethod,
        criticalValues: criticalValues || [],
        notifiedAt: new Date().toISOString()
      };

      await labTest.update({
        isCritical: true,
        metadata: {
          ...labTest.metadata || {},
          criticalNotification
        }
      });

      res.json({
        success: true,
        message: 'Critical value notification recorded',
        labTest
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Generate and download lab report
   * @route GET /api/v1/lab-test/:id/report
   */
  generateReport: async (req, res, next) => {
    try {
      const { id } = req.params;
      
      const labTest = await LabTest.findOne({
        where: { id },
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: ['id', 'patientNumber', 'surname', 'otherNames', 'dateOfBirth', 'sex']
          },
          {
            model: User,
            as: 'requestedBy',
            attributes: ['id', 'surname', 'otherNames', 'role']
          },
          {
            model: User,
            as: 'sampleCollector',
            attributes: ['id', 'surname', 'otherNames', 'role']
          }
        ]
      });

      if (!labTest) {
        return res.status(404).json({
          success: false,
          message: 'Lab test not found'
        });
      }

      if (labTest.status !== 'COMPLETED') {
        return res.status(400).json({
          success: false,
          message: 'Cannot generate report for incomplete test'
        });
      }

      // Generate PDF buffer
      const pdfBuffer = await generateLabReport(labTest);

      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="lab-report-${labTest.sampleId}.pdf"`);
      
      // Send PDF buffer as response
      res.send(pdfBuffer);

    } catch (error) {
      console.error('Report generation error:', error);
      next(error);
    }
  },

  /**
   * Send lab results to patient via email
   * @route POST /api/v1/lab-test/:id/email-results
   */
  emailResults: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { emailAddress, message } = req.body;

      const labTest = await LabTest.findOne({
        where: { id },
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: ['id', 'patientNumber', 'surname', 'otherNames', 'email']
          }
        ]
      });

      if (!labTest) {
        return res.status(404).json({
          success: false,
          message: 'Lab test not found'
        });
      }

      if (labTest.status !== 'COMPLETED') {
        return res.status(400).json({
          success: false,
          message: 'Cannot send results for incomplete test'
        });
      }

      // Generate PDF
      const pdfBuffer = await generateLabReport(labTest);

      // Target email - use provided email or patient's email
      const toEmail = emailAddress || labTest.patient?.email;

      if (!toEmail) {
        return res.status(400).json({
          success: false,
          message: 'No email address available'
        });
      }

      // Send email with PDF attachment
      await sendEmail({
        to: toEmail,
        subject: `Lab Test Results - ${labTest.testType}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Lab Test Results</h2>
            <p>Dear ${labTest.patient.surname} ${labTest.patient.otherNames},</p>
            <p>Please find attached your lab test results for ${labTest.testType.replace('_', ' ')}.</p>
            <p>Sample ID: ${labTest.sampleId}</p>
            <p>Collection Date: ${new Date(labTest.sampleCollectionDate).toLocaleDateString()}</p>
            <p>Result Date: ${new Date(labTest.resultDate).toLocaleDateString()}</p>
            ${message ? `<p>Message from your healthcare provider: ${message}</p>` : ''}
            <p>If you have any questions about your results, please contact your healthcare provider.</p>
            <p>Thank you for choosing our healthcare services.</p>
            <p>Best regards,<br>Laboratory Department</p>
          </div>
        `,
        attachments: [
          {
            filename: `lab-results-${labTest.sampleId}.pdf`,
            content: pdfBuffer
          }
        ]
      });

      // Update the metadata to record that results were sent
      await labTest.update({
        metadata: {
          ...labTest.metadata || {},
          resultsSent: {
            sentTo: toEmail,
            sentBy: req.user.id,
            sentAt: new Date().toISOString()
          }
        }
      });

      res.json({
        success: true,
        message: `Test results sent to ${toEmail}`
      });
    } catch (error) {
      console.error('Email sending error:', error);
      next(error);
    }
  }
};

module.exports = labTestController;