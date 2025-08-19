#!/usr/bin/env node

require('dotenv').config();
const { Client } = require('pg');
const XLSX = require('xlsx');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase().trim());
    });
  });
}

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    console.log('\n=== CCP Import (Fixed - No Duplicates) ===');
    
    // Find Excel files in project root
    const projectRoot = require('path').dirname(__dirname);
    const fs = require('fs');
    const files = fs.readdirSync(projectRoot)
      .filter(file => file.toLowerCase().endsWith('.xlsx'))
      .map((file, index) => ({ index: index + 1, name: file, path: require('path').join(projectRoot, file) }));
    
    if (files.length === 0) {
      console.log('No Excel files found in project root.');
      return;
    }
    
    console.log('\nAvailable Excel files:');
    files.forEach(file => {
      console.log(`${file.index}. ${file.name}`);
    });
    
    // Get file selection
    const selection = await new Promise((resolve) => {
      rl.question(`\nSelect file (1-${files.length}): `, resolve);
    });
    
    const selectedIndex = parseInt(selection) - 1;
    if (selectedIndex < 0 || selectedIndex >= files.length) {
      console.log('Invalid selection. Exiting.');
      return;
    }
    
    const filePath = files[selectedIndex].path;
    console.log(`Selected: ${files[selectedIndex].name}`);
    
    // Get doctors
    console.log('\nFetching available doctors...');
    const doctorsResult = await client.query(`
      SELECT id, surname, "otherNames", email 
      FROM "Users" 
      WHERE role = 'DOCTOR' AND "isActive" = true
      ORDER BY surname
    `);
    
    const doctors = doctorsResult.rows;
    console.log('\nAvailable doctors:');
    doctors.forEach((doctor, index) => {
      console.log(`${index + 1}. ${doctor.surname} ${doctor.otherNames} (${doctor.email})`);
    });
    
    const doctorSelection = await new Promise((resolve) => {
      rl.question(`\nSelect doctor (1-${doctors.length}): `, resolve);
    });
    
    const selectedDoctorIndex = parseInt(doctorSelection) - 1;
    if (selectedDoctorIndex < 0 || selectedDoctorIndex >= doctors.length) {
      console.log('Invalid doctor selection. Exiting.');
      return;
    }
    
    const selectedDoctor = doctors[selectedDoctorIndex];
    console.log(`Selected doctor: ${selectedDoctor.surname} ${selectedDoctor.otherNames}`);

    // Read Excel file
    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames.filter(name => 
      !name.toUpperCase().includes('TASK') && 
      !name.toUpperCase().includes('DISCONTINUATION') &&
      !name.toUpperCase().includes('DISCONTINUED')
    );
    
    console.log(`\nFound ${sheetNames.length} sheets to process:`, sheetNames);

    // First pass: collect all unique patients across all sheets
    const allPatients = new Map(); // key: "surname|otherNames", value: patient data
    
    for (const sheetName of sheetNames) {
      const patients = parseSheet(workbook, sheetName);
      patients.forEach(patient => {
        const key = `${patient.surname}|${patient.otherNames}`;
        if (!allPatients.has(key)) {
          allPatients.set(key, {
            surname: patient.surname,
            otherNames: patient.otherNames,
            sheets: []
          });
        }
        allPatients.get(key).sheets.push({
          sheetName,
          month: extractMonth(sheetName),
          year: extractYear(sheetName),
          originalData: patient
        });
      });
    }

    console.log(`\nFound ${allPatients.size} unique patients across all sheets`);
    
    // Show preview
    const uniquePatients = Array.from(allPatients.values());
    console.log('\n--- Unique Patients Preview ---');
    uniquePatients.slice(0, 5).forEach((patient, index) => {
      console.log(`${index + 1}. ${patient.surname} ${patient.otherNames} - appears in ${patient.sheets.length} months`);
    });
    
    if (uniquePatients.length > 5) {
      console.log(`... and ${uniquePatients.length - 5} more patients`);
    }

    const proceed = await askQuestion(`\nProcess all ${uniquePatients.length} unique patients? (y/n): `);
    if (proceed !== 'y' && proceed !== 'yes') {
      console.log('Import cancelled.');
      return;
    }

    // Process each unique patient
    let processed = 0;
    let errors = 0;

    for (const patient of uniquePatients) {
      try {
        // Create patient once
        const phone = `+254700${Math.floor(Math.random() * 900000) + 100000}`;
        const patientNumber = `ZH${Date.now().toString().slice(-6)}`;
        
        const patientResult = await client.query(`
          INSERT INTO "Patients" (
            id, surname, "otherNames", sex, "dateOfBirth", 
            nationality, telephone1, town, residence, 
            "idType", "idNumber", "patientNumber", status, 
            "paymentScheme", "isActive", "isCCPEnrolled", "createdAt", "updatedAt"
          ) VALUES (
            gen_random_uuid(), $1, $2, 'FEMALE', '1990-01-01',
            'Kenyan', $3, 'Test Location', 'Test Location',
            'NATIONAL_ID', $4, $5, 'WAITING',
            '{"type": "CASH", "provider": null}', true, true, NOW(), NOW()
          ) RETURNING id, "patientNumber"
        `, [
          patient.surname,
          patient.otherNames,
          phone,
          `CCP-${Date.now()}-${processed}`,
          patientNumber
        ]);

        const createdPatient = patientResult.rows[0];
        
        // Create CCP records for each month they appear
        for (const sheet of patient.sheets) {
          await client.query(`
            INSERT INTO "CCPs" (
              id, "patientId", "followupMonth", "followupYear",
              "followupFrequency", "followupType", "followupMode",
              "scheduledBy", status, "isFollowupCompleted",
              "createdAt", "updatedAt"
            ) VALUES (
              gen_random_uuid(), $1, $2, $3,
              '1_MONTH', 'ROUTINE', 'PHONE_CALL',
              $4, 'SCHEDULED', false,
              NOW(), NOW()
            )
          `, [
            createdPatient.id,
            sheet.month,
            sheet.year,
            selectedDoctor.id
          ]);
        }

        console.log(`✅ Created: ${createdPatient.patientNumber} - ${patient.surname} ${patient.otherNames} (${patient.sheets.length} follow-ups)`);
        processed++;
        
      } catch (error) {
        console.error(`❌ Error processing ${patient.surname} ${patient.otherNames}:`, error.message);
        errors++;
      }
    }

    console.log(`\n✅ Import completed: ${processed} patients processed, ${errors} errors`);

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  } finally {
    rl.close();
    await client.end();
  }
}

function parseSheet(workbook, sheetName) {
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  // Find header row
  let headerRow = -1;
  let patientIdCol = -1;
  let nameCol = -1;
  
  for (let i = 0; i < Math.min(10, jsonData.length); i++) {
    const row = jsonData[i];
    if (!row) continue;
    
    for (let j = 0; j < row.length; j++) {
      const cell = row[j]?.toString().toLowerCase() || '';
      if (cell.includes('patient') && cell.includes('id')) patientIdCol = j;
      if (cell.includes('name') && !cell.includes('next')) nameCol = j;
    }
    
    if (patientIdCol >= 0 && nameCol >= 0) {
      headerRow = i;
      break;
    }
  }
  
  if (headerRow === -1) return [];
  
  const patients = [];
  for (let i = headerRow + 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (!row || row.length === 0) continue;
    
    const patientId = row[patientIdCol];
    const name = row[nameCol];
    
    if (!patientId || !name) continue;
    
    const nameParts = name.toString().split(' ');
    patients.push({
      patientId,
      surname: nameParts[0] || 'Unknown',
      otherNames: nameParts.slice(1).join(' ') || 'Unknown'
    });
  }
  
  return patients;
}

function extractMonth(sheetName) {
  const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 
                  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  for (let i = 0; i < months.length; i++) {
    if (sheetName.toUpperCase().includes(months[i])) {
      return i + 1;
    }
  }
  return new Date().getMonth() + 1;
}

function extractYear(sheetName) {
  const yearMatch = sheetName.match(/20\d{2}/);
  return yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();
}

if (require.main === module) {
  main().catch(console.error);
}