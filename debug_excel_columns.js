#!/usr/bin/env node

const XLSX = require('xlsx');

function debugExcelColumns() {
  const file = 'Copy of DR. ESTHER OGEMBO - BRITAM & GA _ CCP 2025.xlsx';
  console.log(`🔍 DEBUGGING EXCEL COLUMNS: ${file}\n`);

  try {
    const workbook = XLSX.readFile(`./${file}`);
    const sheetName = 'JAN - BRITAM';
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    console.log(`📋 Sheet: ${sheetName}`);
    console.log(`Total rows: ${jsonData.length}\n`);

    // Show first 10 rows with column numbers
    for (let row = 0; row < Math.min(10, jsonData.length); row++) {
      const rowData = jsonData[row];
      if (rowData && rowData.length > 0) {
        console.log(`Row ${row + 1}:`);
        for (let col = 0; col < Math.min(15, rowData.length); col++) {
          const cell = rowData[col];
          if (cell) {
            console.log(`  Col ${col + 1}: "${cell}"`);
          }
        }
        console.log('');
      }
    }

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

debugExcelColumns();