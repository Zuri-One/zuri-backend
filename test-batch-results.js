require('dotenv').config();
const { LabTest } = require('./src/models');
const batchLabTestService = require('./src/services/batch-lab-test.service');

async function testBatchResults() {
  try {
    console.log('🧪 Testing batch results formatting...');
    
    // Find a completed batch test
    const completedBatchTest = await LabTest.findOne({
      where: { 
        status: 'COMPLETED',
        batchId: { [require('sequelize').Op.not]: null }
      },
      attributes: ['batchId']
    });
    
    if (!completedBatchTest) {
      console.log('❌ No completed batch tests found');
      return;
    }
    
    console.log(`📋 Testing batch ID: ${completedBatchTest.batchId}`);
    
    // Get batch results using the service
    const batchResults = await batchLabTestService.getBatchTests(completedBatchTest.batchId);
    
    if (batchResults.length === 0) {
      console.log('❌ No results returned');
      return;
    }
    
    console.log(`✅ Found ${batchResults.length} tests in batch`);
    
    // Check the first completed test
    const completedTest = batchResults.find(test => test.status === 'COMPLETED');
    
    if (!completedTest) {
      console.log('❌ No completed tests in batch');
      return;
    }
    
    console.log('\n📊 BATCH TEST RESULTS STRUCTURE:');
    console.log('Test ID:', completedTest.id);
    console.log('Test Type:', completedTest.testType);
    console.log('Status:', completedTest.status);
    
    if (completedTest.results) {
      console.log('\n🔬 Results Object:');
      console.log('- Has data:', !!completedTest.results.data);
      console.log('- Has referenceRange:', !!completedTest.results.referenceRange);
      
      if (completedTest.results.referenceRange) {
        console.log('\n📏 Reference Range Structure:');
        const firstParam = Object.keys(completedTest.results.referenceRange)[0];
        const firstRange = completedTest.results.referenceRange[firstParam];
        console.log(`- Parameter: ${firstParam}`);
        console.log(`- Has min: ${!!firstRange.min}`);
        console.log(`- Has max: ${!!firstRange.max}`);
        console.log(`- Has unit: ${!!firstRange.unit}`);
        
        if (firstRange.unit) {
          console.log(`- Unit value: "${firstRange.unit}"`);
        } else {
          console.log('❌ MISSING UNIT FIELD');
        }
        
        console.log('\nFull reference range sample:');
        console.log(JSON.stringify(firstRange, null, 2));
        
        // Debug catalog service
        console.log('\n🔍 DEBUGGING CATALOG SERVICE:');
        const labTestCatalogService = require('./src/services/lab-test-catalog.service');
        try {
          const testDefinition = await labTestCatalogService.getTestById(completedTest.testType);
          console.log('Test definition found:', !!testDefinition);
          if (testDefinition) {
            console.log('Test definition ID:', testDefinition.id);
            console.log('Has parameters:', !!testDefinition.parameters);
            if (testDefinition.parameters) {
              console.log('Parameters count:', testDefinition.parameters.length);
              console.log('Parameter names:', testDefinition.parameters.map(p => p.name));
              console.log('Reference range keys:', Object.keys(completedTest.results.referenceRange));
              
              // Check for matches
              const matches = testDefinition.parameters.filter(param => 
                completedTest.results.referenceRange[param.name]
              );
              console.log('Matching parameters:', matches.length);
              matches.forEach(match => {
                console.log(`  - ${match.name}: unit = ${match.unit}`);
              });
            }
          }
        } catch (catalogError) {
          console.log('Catalog service error:', catalogError.message);
        }
      }
    } else {
      console.log('❌ No results object found');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    process.exit(0);
  }
}

testBatchResults();