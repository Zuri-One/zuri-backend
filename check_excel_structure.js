#!/usr/bin/env node

const XLSX = require('xlsx');

function checkExcelStructure() {
  console.log('📋 EXCEL STRUCTURE ANALYSIS\n');

  const files = [
    'Copy of DR. GEORGINA NYAKA - MADISON & CiC _ CCP 2025.xlsx',
    'Copy of DR. ANTONY NDUATI - KPLC , MINET & PACIS _ CCP 2025.xlsx', 
    'Copy of DR. ESTHER OGEMBO - BRITAM & GA _ CCP 2025.xlsx'
  ];

  files.forEach((file, index) => {
    console.log(`\n${index + 1}. 📄 ${file}`);
    console.log('='.repeat(80));
    
    try {
      const workbook = XLSX.readFile(`./${file}`);
      console.log(`   Sheets: ${workbook.SheetNames.length}`);
      
      // Check first valid sheet
      const validSheets = workbook.SheetNames.filter(name => 
        !name.toUpperCase().includes('TASK') && 
        !name.toUpperCase().includes('DISCONTINUATION')
      );
      
      if (validSheets.length > 0) {
        const firstSheet = validSheets[0];
        console.log(`   Analyzing sheet: "${firstSheet}"`);
        
        const worksheet = workbook.Sheets[firstSheet];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Find header rows
        console.log('\n   📊 HEADER STRUCTURE:');
        for (let i = 0; i < Math.min(5, jsonData.length); i++) {
          const row = jsonData[i];
          if (row && row.length > 0) {
            console.log(`   Row ${i + 1}: ${row.length} columns`);
            
            // Show key columns
            const keyColumns = [];
            row.forEach((cell, colIndex) => {
              if (cell && typeof cell === 'string') {
                const cellStr = cell.toString().toLowerCase();
                if (cellStr.includes('patient') || 
                    cellStr.includes('name') || 
                    cellStr.includes('gender') ||
                    cellStr.includes('contact') ||
                    cellStr.includes('follow') ||
                    cellStr.includes('medication')) {
                  keyColumns.push(`Col ${colIndex + 1}: "${cell}"`);
                }
              }
            });
            
            if (keyColumns.length > 0) {
              console.log(`      Key columns: ${keyColumns.slice(0, 5).join(', ')}`);
            }
          }
        }
        
        // Show sample data
        console.log('\n   📋 SAMPLE DATA:');
        let dataRowFound = false;
        for (let i = 0; i < Math.min(10, jsonData.length); i++) {
          const row = jsonData[i];
          if (row && row.length > 5) {
            // Check if this looks like a data row (not header)
            const firstCell = row[0]?.toString() || '';
            const secondCell = row[1]?.toString() || '';
            
            if (firstCell && secondCell && 
                !firstCell.toLowerCase().includes('patient') &&
                !firstCell.toLowerCase().includes('doctor') &&
                !firstCell.toLowerCase().includes('name') &&
                firstCell.length < 50) {
              
              console.log(`   Data Row ${i + 1}:`);
              console.log(`      Col 1-5: ${row.slice(0, 5).map(cell => 
                cell ? `"${cell.toString().substring(0, 20)}"` : 'null'
              ).join(' | ')}`);
              
              dataRowFound = true;
              if (dataRowFound) break; // Just show one sample
            }
          }
        }
        
        if (!dataRowFound) {
          console.log('   No clear data rows found in first 10 rows');
        }
        
        // Column count analysis
        const nonEmptyRows = jsonData.filter(row => row && row.length > 0);
        if (nonEmptyRows.length > 0) {
          const maxCols = Math.max(...nonEmptyRows.map(row => row.length));
          const avgCols = Math.round(nonEmptyRows.reduce((sum, row) => sum + row.length, 0) / nonEmptyRows.length);
          console.log(`\n   📈 STRUCTURE STATS:`);
          console.log(`      Total rows: ${jsonData.length}`);
          console.log(`      Non-empty rows: ${nonEmptyRows.length}`);
          console.log(`      Max columns: ${maxCols}`);
          console.log(`      Avg columns: ${avgCols}`);
        }
        
      } else {
        console.log('   No valid sheets found');
      }
      
    } catch (error) {
      console.log(`   ❌ Error reading file: ${error.message}`);
    }
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('📋 EXPECTED STRUCTURE COMPARISON:');
  console.log('Expected columns based on your specification:');
  console.log('1. DOCTOR IN CHARGE');
  console.log('2. PATIENT ID');
  console.log('3. ENROLLMENT STATUS');
  console.log('4. DATE ENROLLED');
  console.log('5. PATIENT\'S NAME');
  console.log('6. GENDER');
  console.log('7. AGE(YRS)');
  console.log('8. CONTACT');
  console.log('9. EMAIL ADDRESS');
  console.log('10. LOCATION');
  console.log('11. INSURANCE SCHEME');
  console.log('12. KNOWN UNDERLYING CONDITION');
  console.log('... (and many more medical/pharmacy columns)');
}

checkExcelStructure();