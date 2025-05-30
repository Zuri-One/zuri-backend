const fs = require('fs').promises;
const path = require('path');

async function migrateCatalog() {
  try {
    console.log('🔄 Starting catalog migration...');
    
    // Read the service file
    const serviceFilePath = path.join(__dirname, 'src/services/lab-test-catalog.service.js');
    const serviceContent = await fs.readFile(serviceFilePath, 'utf8');
    
    // Extract the categories section with improved regex
    const categoriesMatch = serviceContent.match(/categories:\s*\{([\s\S]*?)\},?\s*tests:/);
    if (!categoriesMatch) {
      throw new Error('Could not find categories in service file');
    }
    
    // Extract the tests section with improved regex
    const testsMatch = serviceContent.match(/tests:\s*\{([\s\S]*?)\}\s*\};?\s*$/);
    if (!testsMatch) {
      throw new Error('Could not find tests in service file');
    }
    
    console.log('📦 Found test definitions in service file');
    
    // Create a temporary file to evaluate the object
    const tempFilePath = path.join(__dirname, 'temp-catalog.js');
    const tempContent = `
const extractedData = {
  categories: {${categoriesMatch[1]}},
  tests: {${testsMatch[1]}}
};

module.exports = extractedData;
`;
    
    // Write temp file
    await fs.writeFile(tempFilePath, tempContent);
    
    // Clear require cache to ensure fresh load
    delete require.cache[require.resolve('./temp-catalog.js')];
    
    // Require the temp file to get parsed object
    const extractedData = require('./temp-catalog.js');
    
    // Clean up temp file
    await fs.unlink(tempFilePath);
    
    // Create the proper catalog structure
    const catalog = {
      version: "1.0.0",
      lastUpdated: new Date().toISOString(),
      categories: extractedData.categories,
      tests: extractedData.tests
    };
    
    // Ensure data directory exists
    const dataDir = path.join(__dirname, 'data');
    await fs.mkdir(dataDir, { recursive: true });
    
    // Write the catalog file
    const catalogPath = path.join(dataDir, 'lab-test-catalog.json');
    await fs.writeFile(catalogPath, JSON.stringify(catalog, null, 2));
    
    console.log('✅ Migration completed successfully!');
    console.log(`📁 Created: ${catalogPath}`);
    console.log(`📊 Migrated ${Object.keys(catalog.tests).length} tests`);
    console.log(`📋 Migrated ${Object.keys(catalog.categories).length} categories`);
    
    // List the migrated tests
    console.log('\n📝 Migrated Tests:');
    Object.values(catalog.tests).forEach(test => {
      console.log(`   • ${test.displayName} (${test.id})`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Execute the migration
migrateCatalog();