#!/usr/bin/env node

require('dotenv').config();
const { Client } = require('pg');
const XLSX = require('xlsx');
const readline = require('readline');

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

    console.log('\n=== CCP Import (Raw PostgreSQL) ===');
    
    // Get Excel file
    const filePath = '/Users/isaac/Desktop/zurihealth/zuri-backend/Copy of DR. GEORGINA NYAKA - MADISON & CiC _ CCP 2025.xlsx';
    console.log(`Selected file: Copy of DR. GEORGINA NYAKA - MADISON & CiC _ CCP 2025.xlsx`);
    
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

    // Process each sheet
    for (let i = 0; i < sheetNames.length; i++) {
      const sheetName = sheetNames[i];
      
      console.log(`\n--- Sheet ${i + 1}/${sheetNames.length}: ${sheetName} ---`);
      
      const proceed = await askQuestion(`Process sheet "${sheetName}"? (y/n/q to quit): `);
      
      if (proceed === 'q' || proceed === 'quit') {
        console.log('Stopping import as requested.');
        break;
      }
      
      if (proceed !== 'y' && proceed !== 'yes') {
        console.log(`Skipping sheet: ${sheetName}`);
        continue;
      }
      
      await processSheet(client, workbook, sheetName, selectedDoctor);
    }

    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  } finally {
    rl.close();
    await client.end();
  }
}

async function processSheet(client, workbook, sheetName, selectedDoctor) {
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  console.log(`Processing sheet: ${sheetName}`);
  console.log(`Found ${jsonData.length} rows`);
  
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
  
  if (headerRow === -1) {
    console.log('❌ Could not find header row');
    return;
  }
  
  console.log(`Found header at row ${headerRow + 1}`);
  
  // Collect patients
  const patients = [];
  for (let i = headerRow + 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (!row || row.length === 0) continue;
    
    const patientId = row[patientIdCol];
    const name = row[nameCol];
    
    if (!patientId || !name) continue;
    
    patients.push({ patientId, name, row });
  }
  
  console.log(`\n--- Data Preview ---`);
  patients.slice(0, 3).forEach((patient, index) => {
    console.log(`${index + 1}. ID: ${patient.patientId}, Name: ${patient.name}`);
  });
  
  if (patients.length > 3) {
    console.log(`... and ${patients.length - 3} more patients`);
  }
  
  const processAll = await askQuestion(`Process all ${patients.length} patients? (y/n/s for select individual): `);
  
  if (processAll === 'n' || processAll === 'no') {
    console.log('Skipping sheet.');
    return;
  }
  
  let patientsToProcess = patients;
  
  if (processAll === 's' || processAll === 'select') {
    patientsToProcess = [];
    for (let i = 0; i < patients.length; i++) {
      const patient = patients[i];
      console.log(`\n${i + 1}/${patients.length}: ${patient.patientId} - ${patient.name}`);
      const processThis = await askQuestion('Process this patient? (y/n): ');
      if (processThis === 'y' || processThis === 'yes') {
        patientsToProcess.push(patient);
      }
    }
  }
  
  console.log(`\nProcessing ${patientsToProcess.length} patients...`);
  
  let processed = 0;
  let errors = 0;
  
  for (const patient of patientsToProcess) {
    try {
      const phone = `+254700${Math.floor(Math.random() * 900000) + 100000}`;
      
      // Generate simple patient number
      const patientNumber = `ZH${Date.now().toString().slice(-6)}`;
      
      const result = await client.query(`
        INSERT INTO "Patients" (
          id, surname, "otherNames", sex, "dateOfBirth", 
          nationality, telephone1, town, residence, 
          "idType", "idNumber", "patientNumber", status, 
          "paymentScheme", "isActive", "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(), $1, $2, 'FEMALE', '1990-01-01',
          'Kenyan', $3, 'Test Location', 'Test Location',
          'NATIONAL_ID', $4, $5, 'WAITING',
          '{"type": "CASH", "provider": null}', true, NOW(), NOW()
        ) RETURNING id, "patientNumber"
      `, [
        patient.name.split(' ')[0] || 'Unknown',
        patient.name.split(' ').slice(1).join(' ') || 'Unknown',
        phone,
        `CCP-${Date.now()}-${processed}`,
        patientNumber
      ]);
      
      console.log(`✅ Created: ${result.rows[0].patientNumber} - ${patient.name}`);
      processed++;
      
    } catch (error) {
      console.error(`❌ Error processing ${patient.patientId}:`, error.message);
      errors++;
    }
  }
  
  console.log(`\n✅ Sheet completed: ${processed} processed, ${errors} errors`);
}

if (require.main === module) {
  main().catch(console.error);
}