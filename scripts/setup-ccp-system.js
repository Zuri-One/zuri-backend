#!/usr/bin/env node

const { createCCPDoctors } = require('./create-ccp-doctors');
const { CCPBulkImporter } = require('./ccp-bulk-import');
const path = require('path');
const fs = require('fs');

const log = (message, data = null) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    service: 'ccp-system-setup',
    message
  };
  
  if (data) {
    logEntry.data = data;
  }
  
  console.log(JSON.stringify(logEntry));
};

async function setupCCPSystem() {
  try {
    console.log('🚀 Setting up CCP System...\n');

    // Step 1: Create CCP doctors
    console.log('👨‍⚕️ Step 1: Creating CCP doctors...');
    await createCCPDoctors();
    console.log('✅ CCP doctors created successfully!\n');

    // Step 2: Check for Excel files to import
    const excelFiles = findExcelFiles();
    
    if (excelFiles.length === 0) {
      console.log('📄 No Excel files found for import.');
      console.log('   Place your Excel files in the root directory to import them.');
      console.log('   Supported formats: .xlsx, .xls\n');
    } else {
      console.log(`📄 Found ${excelFiles.length} Excel file(s) for import:`);
      excelFiles.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file}`);
      });
      console.log('\n🔄 To import these files, run:');
      console.log('   node scripts/ccp-bulk-import.js <file-path> <doctor-name>');
      console.log('   Example: node scripts/ccp-bulk-import.js "./data.xlsx" "georgina"\n');
    }

    // Step 3: Display system information
    console.log('📋 CCP System Setup Complete!');
    console.log('================================');
    console.log('🌐 Access the CCP import interface at: http://localhost:3000/ccp-import.html');
    console.log('📚 API Documentation: http://localhost:3000/api-docs');
    console.log('\n👨‍⚕️ Available CCP Doctors:');
    console.log('   • Dr. Georgina Nyaka (georgina.nyaka@zurihealth.com)');
    console.log('   • Dr. Antony Mwangi (antony.mwangi@zurihealth.com)');
    console.log('   • Dr. Esther Wanjiku (esther.wanjiku@zurihealth.com)');
    console.log('   Default Password: Doctor@123');
    
    console.log('\n📊 Import Options:');
    console.log('   1. Web Interface: Upload Excel files via browser');
    console.log('   2. Bulk Script: Use command line for large files');
    console.log('   3. API Endpoint: POST /api/v1/ccp/import');

    console.log('\n🔧 Next Steps:');
    console.log('   1. Start the server: npm run dev');
    console.log('   2. Open http://localhost:3000/ccp-import.html');
    console.log('   3. Upload your Excel files');
    console.log('   4. Select the attending doctor');
    console.log('   5. Preview and import data');

    log('CCP system setup completed successfully');

  } catch (error) {
    log('CCP system setup failed', { error: error.message });
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

function findExcelFiles() {
  const rootDir = path.join(__dirname, '..');
  const files = fs.readdirSync(rootDir);
  
  return files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ext === '.xlsx' || ext === '.xls';
  });
}

// Run setup if called directly
if (require.main === module) {
  setupCCPSystem();
}

module.exports = { setupCCPSystem };