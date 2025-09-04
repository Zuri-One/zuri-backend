// Debug script to check batch test unit mapping
require('dotenv').config();

const labTestCatalogService = require('./src/services/lab-test-catalog.service');

async function debugBatchUnits() {
  try {
    console.log('=== DEBUGGING BATCH UNITS ===\n');
    
    // Test HBA1C specifically
    console.log('1. Testing HBA1C test definition:');
    const hba1cTest = await labTestCatalogService.getTestById('HBA1C');
    
    if (hba1cTest) {
      console.log('✅ HBA1C test found');
      console.log('- ID:', hba1cTest.id);
      console.log('- Name:', hba1cTest.name);
      console.log('- Parameters count:', hba1cTest.parameters?.length || 0);
      
      if (hba1cTest.parameters) {
        hba1cTest.parameters.forEach(param => {
          console.log(`  - Parameter: ${param.code} (${param.name}) - Unit: ${param.unit}`);
        });
      }
    } else {
      console.log('❌ HBA1C test not found');
    }
    
    console.log('\n2. Testing reference range matching:');
    // Simulate the reference range from frontend
    const frontendReferenceRange = {
      "HBA1C": { "max": 5.6, "min": 4 }
    };
    
    console.log('Frontend reference range:', JSON.stringify(frontendReferenceRange, null, 2));
    
    // Simulate the unit mapping logic
    if (hba1cTest && hba1cTest.parameters) {
      const enhancedReferenceRange = { ...frontendReferenceRange };
      
      hba1cTest.parameters.forEach(param => {
        console.log(`\nChecking parameter: ${param.code}`);
        console.log(`- Looking for reference range key: ${param.code}`);
        console.log(`- Reference range has key: ${!!enhancedReferenceRange[param.code]}`);
        
        if (enhancedReferenceRange[param.code]) {
          console.log(`- Current range:`, enhancedReferenceRange[param.code]);
          console.log(`- Parameter unit: ${param.unit}`);
          console.log(`- Range already has unit: ${!!enhancedReferenceRange[param.code].unit}`);
          
          if (param.unit && !enhancedReferenceRange[param.code].unit) {
            console.log(`✅ Adding unit ${param.unit} to ${param.code}`);
            enhancedReferenceRange[param.code].unit = param.unit;
          }
        }
      });
      
      console.log('\nFinal enhanced reference range:', JSON.stringify(enhancedReferenceRange, null, 2));
    }
    
    console.log('\n3. Testing other test types:');
    const testTypes = ['CBC', 'LIPID'];
    
    for (const testType of testTypes) {
      console.log(`\n--- Testing ${testType} ---`);
      const testDef = await labTestCatalogService.getTestById(testType);
      
      if (testDef) {
        console.log(`✅ ${testType} found with ${testDef.parameters?.length || 0} parameters`);
        if (testDef.parameters) {
          testDef.parameters.slice(0, 3).forEach(param => {
            console.log(`  - ${param.code}: ${param.unit}`);
          });
        }
      } else {
        console.log(`❌ ${testType} not found`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugBatchUnits();