#!/usr/bin/env node

const XLSX = require('xlsx');

function checkExcelGender() {
  console.log('👥 EXCEL GENDER DISTRIBUTION CHECK\n');

  // Check Dr. Esther's file (largest one)
  const file = 'Copy of DR. ESTHER OGEMBO - BRITAM & GA _ CCP 2025.xlsx';
  console.log(`📄 Analyzing: ${file}\n`);

  try {
    const workbook = XLSX.readFile(`./${file}`);
    const validSheets = workbook.SheetNames.filter(name => 
      !name.toUpperCase().includes('TASK') && 
      !name.toUpperCase().includes('DISCONTINUATION')
    );

    console.log(`Found ${validSheets.length} valid sheets\n`);

    let totalPatients = 0;
    let genderCounts = { MALE: 0, FEMALE: 0, OTHER: 0, UNKNOWN: 0 };
    let allPatients = [];

    // Check first few sheets
    for (let i = 0; i < Math.min(3, validSheets.length); i++) {
      const sheetName = validSheets[i];
      console.log(`📋 Sheet: ${sheetName}`);
      
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Find gender column
      let genderCol = -1;
      let nameCol = -1;
      let headerRow = -1;
      
      for (let row = 0; row < Math.min(5, jsonData.length); row++) {
        const rowData = jsonData[row];
        if (rowData) {
          for (let col = 0; col < rowData.length; col++) {
            const cell = rowData[col]?.toString().toLowerCase() || '';
            if (cell.includes('gender') || cell === 'sex') {
              genderCol = col;
              headerRow = row;
            }
            if (cell.includes('name') && !cell.includes('next')) {
              nameCol = col;
            }
          }
        }
      }

      console.log(`   Gender column: ${genderCol}, Name column: ${nameCol}, Header row: ${headerRow}`);

      if (genderCol >= 0 && nameCol >= 0) {
        let sheetPatients = 0;
        
        // Check data rows
        for (let row = headerRow + 1; row < jsonData.length; row++) {
          const rowData = jsonData[row];
          if (rowData && rowData.length > Math.max(genderCol, nameCol)) {
            const name = rowData[nameCol]?.toString().trim();
            const gender = rowData[genderCol]?.toString().trim().toUpperCase();
            
            if (name && name.length > 2 && 
                !name.toLowerCase().includes('name') && 
                !name.toLowerCase().includes('patient')) {
              
              sheetPatients++;
              totalPatients++;
              
              if (gender === 'MALE' || gender === 'M') {
                genderCounts.MALE++;
              } else if (gender === 'FEMALE' || gender === 'F') {
                genderCounts.FEMALE++;
              } else if (gender && gender.length > 0) {
                genderCounts.OTHER++;
              } else {
                genderCounts.UNKNOWN++;
              }
              
              allPatients.push({ name, gender: gender || 'UNKNOWN', sheet: sheetName });
            }
          }
        }
        
        console.log(`   Patients found: ${sheetPatients}`);
      } else {
        console.log(`   Could not find gender/name columns`);
      }
      console.log('');
    }

    console.log('📊 GENDER DISTRIBUTION SUMMARY:');
    console.log(`Total patients analyzed: ${totalPatients}`);
    console.log(`MALE: ${genderCounts.MALE} (${((genderCounts.MALE/totalPatients)*100).toFixed(1)}%)`);
    console.log(`FEMALE: ${genderCounts.FEMALE} (${((genderCounts.FEMALE/totalPatients)*100).toFixed(1)}%)`);
    console.log(`OTHER: ${genderCounts.OTHER} (${((genderCounts.OTHER/totalPatients)*100).toFixed(1)}%)`);
    console.log(`UNKNOWN: ${genderCounts.UNKNOWN} (${((genderCounts.UNKNOWN/totalPatients)*100).toFixed(1)}%)`);

    console.log('\n📋 SAMPLE PATIENTS:');
    allPatients.slice(0, 10).forEach((patient, i) => {
      console.log(`${i+1}. ${patient.name} - ${patient.gender} (${patient.sheet})`);
    });

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

checkExcelGender();