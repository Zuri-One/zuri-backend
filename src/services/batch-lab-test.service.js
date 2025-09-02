const { LabTest, Patient, User, DepartmentQueue, sequelize } = require('../models');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const labTestCatalogService = require('./lab-test-catalog.service');

class BatchLabTestService {
  /**
   * Create batch lab tests
   */
  async createBatchTests(batchData, requestedById) {
    const transaction = await sequelize.transaction();
    
    try {
      const { patientId, queueEntryId, tests, priority = 'NORMAL', notes } = batchData;
      
      // Validate patient exists
      const patient = await Patient.findByPk(patientId);
      if (!patient) {
        throw new Error('Patient not found');
      }

      // Generate batch ID
      const batchId = uuidv4();
      
      // Process tests and create them
      const createdTests = [];
      let parentTest = null;
      
      for (let i = 0; i < tests.length; i++) {
        const testData = tests[i];
        
        // Validate test type
        let testDefinition = null;
        try {
          testDefinition = await labTestCatalogService.getTestById(testData.testType);
          if (!testDefinition) {
            const searchResults = await labTestCatalogService.searchTests(testData.testType);
            testDefinition = searchResults.find(test => test.displayName === testData.testType) || searchResults[0];
          }
        } catch (error) {
          console.warn('Catalog service error for test:', testData.testType);
        }

        // Prepare lab test data
        const labTestData = {
          patientId,
          queueEntryId,
          requestedById,
          testType: testData.testType,
          priority: testData.priority || priority,
          notes: testData.notes || notes,
          status: 'PENDING',
          batchId,
          isParentTest: i === 0, // First test is parent
          parentTestId: i === 0 ? null : null, // Will be set after parent is created
          batchMetadata: {
            batchSize: tests.length,
            testIndex: i,
            batchCreatedAt: new Date().toISOString()
          }
        };

        // Add test definition metadata if available
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

        const createdTest = await LabTest.create(labTestData, { transaction });
        
        // Set parent test reference
        if (i === 0) {
          parentTest = createdTest;
        } else {
          // Update child test with parent reference
          await createdTest.update({ parentTestId: parentTest.id }, { transaction });
        }
        
        createdTests.push(createdTest);
      }

      await transaction.commit();
      
      return {
        batchId,
        parentTest,
        tests: createdTests,
        totalTests: createdTests.length
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get batch tests by batch ID
   */
  async getBatchTests(batchId) {
    const tests = await LabTest.findAll({
      where: { batchId },
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'patientNumber', 'surname', 'otherNames', 'dateOfBirth', 'sex', 'telephone1', 'town']
        },
        {
          model: User,
          as: 'requestedBy',
          attributes: ['id', 'surname', 'otherNames', 'role']
        },
        {
          model: LabTest,
          as: 'parentTest',
          attributes: ['id', 'testType', 'status']
        },
        {
          model: LabTest,
          as: 'childTests',
          attributes: ['id', 'testType', 'status']
        }
      ],
      order: [['batchMetadata', 'ASC']]
    });

    return tests;
  }

  /**
   * Get batch tests grouped by patient
   */
  async getPatientBatchTests(patientId, options = {}) {
    const { status, dateFrom, dateTo } = options;
    
    const whereClause = { 
      patientId,
      batchId: { [Op.not]: null }
    };
    
    if (status) whereClause.status = status;
    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) whereClause.createdAt[Op.gte] = new Date(dateFrom);
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        whereClause.createdAt[Op.lte] = endDate;
      }
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
      order: [['batchId', 'ASC'], ['createdAt', 'ASC']]
    });

    // Group by batch ID
    const batches = {};
    tests.forEach(test => {
      if (!batches[test.batchId]) {
        batches[test.batchId] = [];
      }
      batches[test.batchId].push(test);
    });

    return batches;
  }

  /**
   * Collect batch sample
   */
  async collectBatchSample(batchId, sampleData, collectorId) {
    const transaction = await sequelize.transaction();
    
    try {
      const { sampleCollectionMethod, patientPreparation, sampleCollectionNotes } = sampleData;
      
      // Get all tests in batch
      const batchTests = await LabTest.findAll({
        where: { batchId, status: 'PENDING' },
        transaction
      });

      if (batchTests.length === 0) {
        throw new Error('No pending tests found in batch');
      }

      // Generate shared sample ID
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const timestamp = Date.now().toString().slice(-5);
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const sharedSampleId = `BATCH${year}${month}${day}${timestamp}${random}`;

      // Update all tests in batch
      const collectionMetadata = {
        method: sampleCollectionMethod,
        preparation: patientPreparation || null,
        collectedBy: {
          id: collectorId,
          timestamp: new Date().toISOString()
        },
        batchCollection: true,
        sharedSample: true
      };

      for (const test of batchTests) {
        await test.update({
          sharedSampleId,
          sampleCollectionDate: new Date(),
          sampleCollectedById: collectorId,
          status: 'SAMPLE_COLLECTED',
          notes: sampleCollectionNotes || test.notes,
          metadata: {
            ...test.metadata || {},
            collection: collectionMetadata
          }
        }, { transaction });
      }

      await transaction.commit();
      
      return {
        batchId,
        sharedSampleId,
        testsUpdated: batchTests.length,
        collectionDate: new Date()
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Add batch results
   */
  async addBatchResults(batchId, resultsData, technicianId) {
    const transaction = await sequelize.transaction();
    
    try {
      const { testResults, notes } = resultsData;
      
      // Get all tests in batch
      const batchTests = await LabTest.findAll({
        where: { 
          batchId, 
          status: { [Op.in]: ['SAMPLE_COLLECTED', 'IN_PROGRESS'] }
        },
        transaction
      });

      if (batchTests.length === 0) {
        throw new Error('No tests ready for results in batch');
      }

      const updatedTests = [];
      
      for (const test of batchTests) {
        const testResult = testResults.find(r => r.testId === test.id);
        if (!testResult) continue;

        const resultsMetadata = {
          performedBy: {
            id: technicianId,
            timestamp: new Date().toISOString()
          },
          batchProcessing: true
        };

        await test.update({
          results: testResult.results,
          referenceRange: testResult.referenceRange,
          isAbnormal: testResult.isAbnormal || false,
          isCritical: testResult.isCritical || false,
          resultDate: new Date(),
          status: 'COMPLETED',
          notes: testResult.notes || notes || test.notes,
          metadata: {
            ...test.metadata || {},
            results: resultsMetadata
          }
        }, { transaction });

        updatedTests.push(test);
      }

      await transaction.commit();
      
      return {
        batchId,
        testsCompleted: updatedTests.length,
        completionDate: new Date()
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get lab queue with patient grouping
   */
  async getGroupedLabQueue(departmentId) {
    // Get all pending tests
    const pendingTests = await LabTest.findAll({
      where: { status: 'PENDING' },
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'patientNumber', 'surname', 'otherNames', 'sex', 'dateOfBirth']
        },
        {
          model: User,
          as: 'requestedBy',
          attributes: ['id', 'surname', 'otherNames']
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    // Group by patient and batch
    const groupedQueue = {};
    
    pendingTests.forEach(test => {
      const patientKey = test.patientId;
      
      if (!groupedQueue[patientKey]) {
        groupedQueue[patientKey] = {
          patient: test.patient,
          batches: {},
          individualTests: []
        };
      }
      
      if (test.batchId) {
        if (!groupedQueue[patientKey].batches[test.batchId]) {
          groupedQueue[patientKey].batches[test.batchId] = {
            batchId: test.batchId,
            tests: [],
            isParentTest: false
          };
        }
        groupedQueue[patientKey].batches[test.batchId].tests.push(test);
        if (test.isParentTest) {
          groupedQueue[patientKey].batches[test.batchId].isParentTest = true;
        }
      } else {
        groupedQueue[patientKey].individualTests.push(test);
      }
    });

    return Object.values(groupedQueue);
  }
}

module.exports = new BatchLabTestService();