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

    // Format results to match individual test format (including units)
    const labTestCatalogService = require('./lab-test-catalog.service');
    
    return Promise.all(tests.map(async (test) => {
      const formattedTest = test.toJSON();
      console.log(`\n🔍 Processing test ${formattedTest.id} (${formattedTest.testType})`);
      console.log('- Status:', formattedTest.status);
      console.log('- Has Results:', !!formattedTest.results);
      console.log('- Has Reference Range:', !!formattedTest.referenceRange);
      
      // Format results section to include units (same as individual tests)
      if (formattedTest.results && formattedTest.status === 'COMPLETED') {
        console.log('✅ Test has results and is completed, processing units...');
        const originalResults = formattedTest.results;
        let enhancedReferenceRange = formattedTest.referenceRange;
        
        console.log('- Original Results:', JSON.stringify(originalResults, null, 2));
        console.log('- Original Reference Range:', JSON.stringify(enhancedReferenceRange, null, 2));
        
        // Add units from template if missing
        try {
          console.log('🔍 Fetching test definition for:', formattedTest.testType);
          const testDefinition = await labTestCatalogService.getTestById(formattedTest.testType);
          
          if (testDefinition && testDefinition.parameters && enhancedReferenceRange) {
            console.log('✅ Test definition found with parameters:', testDefinition.parameters.length);
            enhancedReferenceRange = { ...enhancedReferenceRange };
            
            testDefinition.parameters.forEach(param => {
              console.log(`  - Checking parameter: ${param.code} (${param.name}) - Unit: ${param.unit}`);
              
              if (enhancedReferenceRange[param.code]) {
                console.log(`    ✅ Found matching reference range for ${param.code}`);
                console.log(`    - Current range:`, enhancedReferenceRange[param.code]);
                
                if (param.unit && !enhancedReferenceRange[param.code].unit) {
                  console.log(`    ✅ Adding unit ${param.unit} to ${param.code}`);
                  enhancedReferenceRange[param.code].unit = param.unit;
                } else if (enhancedReferenceRange[param.code].unit) {
                  console.log(`    ℹ️ Unit already exists: ${enhancedReferenceRange[param.code].unit}`);
                } else {
                  console.log(`    ⚠️ No unit available for parameter ${param.code}`);
                }
              } else {
                console.log(`    ❌ No matching reference range found for parameter ${param.code}`);
              }
            });
            
            console.log('- Enhanced Reference Range:', JSON.stringify(enhancedReferenceRange, null, 2));
          } else {
            console.log('❌ Test definition not found or missing parameters');
            console.log('- Test Definition exists:', !!testDefinition);
            console.log('- Has Parameters:', !!(testDefinition?.parameters));
            console.log('- Has Reference Range:', !!enhancedReferenceRange);
          }
        } catch (catalogError) {
          console.warn('❌ Could not fetch test template for units:', catalogError.message);
        }
        
        console.log('🔄 Formatting results structure...');
        formattedTest.results = {
          data: originalResults,
          referenceRange: enhancedReferenceRange,
          isAbnormal: formattedTest.isAbnormal,
          isCritical: formattedTest.isCritical,
          resultDate: formattedTest.resultDate,
          requiresFollowUp: formattedTest.metadata?.requiresFollowUp || false,
          notes: formattedTest.notes
        };
        
        // Also update the top-level referenceRange for consistency
        formattedTest.referenceRange = enhancedReferenceRange;
        
        console.log('✅ Final formatted results:', JSON.stringify(formattedTest.results, null, 2));
        console.log('✅ Final top-level reference range:', JSON.stringify(formattedTest.referenceRange, null, 2));
      } else {
        console.log('⏭️ Skipping unit processing - test not completed or no results');
      }
      
      return formattedTest;
    }));
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

    // Group by batch ID and format results
    const batches = {};
    tests.forEach(test => {
      if (!batches[test.batchId]) {
        batches[test.batchId] = [];
      }
      
      const formattedTest = test.toJSON();
      
      // Format results section to include units (same as individual tests)
      if (formattedTest.results && formattedTest.status === 'COMPLETED') {
        const originalResults = formattedTest.results;
        const originalReferenceRange = formattedTest.referenceRange;
        
        formattedTest.results = {
          data: originalResults,
          referenceRange: originalReferenceRange, // Keep original structure with units
          isAbnormal: formattedTest.isAbnormal,
          isCritical: formattedTest.isCritical,
          resultDate: formattedTest.resultDate,
          requiresFollowUp: formattedTest.metadata?.requiresFollowUp || false,
          notes: formattedTest.notes
        };
      }
      
      batches[test.batchId].push(formattedTest);
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
      const labTestCatalogService = require('./lab-test-catalog.service');
      
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

        // Get test template to merge units into reference range
        let enhancedReferenceRange = testResult.referenceRange;
        console.log(`🔍 Processing results for test ${test.id} (${test.testType})`);
        console.log('- Original Reference Range:', JSON.stringify(testResult.referenceRange, null, 2));
        
        try {
          const testDefinition = await labTestCatalogService.getTestById(test.testType);
          if (testDefinition && testDefinition.parameters) {
            console.log('✅ Test definition found, merging units...');
            // Merge units from template parameters into reference range
            enhancedReferenceRange = { ...testResult.referenceRange };
            testDefinition.parameters.forEach(param => {
              console.log(`  - Checking parameter: ${param.code} - Unit: ${param.unit}`);
              if (enhancedReferenceRange[param.code] && param.unit) {
                console.log(`    ✅ Adding unit ${param.unit} to ${param.code}`);
                enhancedReferenceRange[param.code].unit = param.unit;
              }
            });
            console.log('- Enhanced Reference Range:', JSON.stringify(enhancedReferenceRange, null, 2));
          } else {
            console.log('❌ Test definition not found or missing parameters');
          }
        } catch (catalogError) {
          console.warn('❌ Could not fetch test template for units:', catalogError.message);
        }

        const resultsMetadata = {
          performedBy: {
            id: technicianId,
            timestamp: new Date().toISOString()
          },
          batchProcessing: true
        };

        await test.update({
          results: testResult.results,
          referenceRange: enhancedReferenceRange,
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