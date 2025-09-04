#!/usr/bin/env node

require('dotenv').config();
const { sequelize } = require('./src/config/database');
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

async function completeCCPImport() {
  console.log('🏥 COMPLETE CCP DATA IMPORT - FIXED');
  console.log('=' .repeat(60));

  const files = [
    { 
      name: 'Copy of DR. GEORGINA NYAKA - MADISON & CiC _ CCP 2025.xlsx',
      doctor: 'DR. GEORGINA NYAKA'
    },
    { 
      name: 'Copy of DR. ANTONY NDUATI - KPLC , MINET & PACIS _ CCP 2025.xlsx',
      doctor: 'DR. ANTONY NDUATI'
    },
    { 
      name: 'Copy of DR. ESTHER OGEMBO - BRITAM & GA _ CCP 2025.xlsx',
      doctor: 'DR. ESTHER OGEMBO'
    }
  ];

  try {
    const doctorsQuery = `
      SELECT id, surname, "otherNames", email 
      FROM "Users" 
      WHERE role = 'DOCTOR' AND "isActive" = true
      ORDER BY surname
    `;
    const [doctors] = await sequelize.query(doctorsQuery);
    
    console.log('\nAvailable doctors in system:');
    doctors.forEach((doctor, index) => {
      console.log(`${index + 1}. ${doctor.surname} ${doctor.otherNames} (${doctor.email})`);
    });

    for (const file of files) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📄 Processing: ${file.name}`);
      console.log(`👨⚕️ Doctor: ${file.doctor}`);
      console.log(`${'='.repeat(60)}`);

      const proceed = await askQuestion(`\nProcess ${file.doctor}'s data? (y/n): `);
      if (proceed !== 'y' && proceed !== 'yes') {
        console.log('Skipping this file...');
        continue;
      }

      // Auto-map doctor
      let selectedDoctor = null;
      
      if (file.doctor.includes('GEORGINA')) {
        selectedDoctor = doctors.find(d => d.surname.toUpperCase().includes('NYAKA') || d.otherNames.toUpperCase().includes('GEORGINA'));
      } else if (file.doctor.includes('ANTONY')) {
        selectedDoctor = doctors.find(d => d.surname.toUpperCase().includes('NDEGWA') || d.otherNames.toUpperCase().includes('ANTONY'));
      } else if (file.doctor.includes('ESTHER')) {
        selectedDoctor = doctors.find(d => d.surname.toUpperCase().includes('OGEMBO') || d.otherNames.toUpperCase().includes('ESTHER'));
      }
      
      if (!selectedDoctor) {
        console.log('\nCould not auto-map doctor. Select manually:');
        const doctorSelection = await askQuestion(`Enter doctor number (1-${doctors.length}): `);
        const selectedDoctorIndex = parseInt(doctorSelection) - 1;
        
        if (selectedDoctorIndex < 0 || selectedDoctorIndex >= doctors.length) {
          console.log('Invalid selection, skipping file...');
          continue;
        }
        selectedDoctor = doctors[selectedDoctorIndex];
      }
      
      console.log(`✅ Auto-mapped to: ${selectedDoctor.surname} ${selectedDoctor.otherNames}`);

      await processExcelFile(file.name, selectedDoctor);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    rl.close();
    await sequelize.close();
  }
}

async function processExcelFile(fileName, doctor) {
  try {
    const workbook = XLSX.readFile(`./${fileName}`);
    const validSheets = workbook.SheetNames.filter(name => 
      !name.toUpperCase().includes('TASK') && 
      !name.toUpperCase().includes('DISCONTINUATION')
    );

    console.log(`\nFound ${validSheets.length} sheets: ${validSheets.join(', ')}`);

    for (const sheetName of validSheets) {
      console.log(`\n📋 Processing sheet: ${sheetName}`);
      
      const proceed = await askQuestion(`Process sheet "${sheetName}"? (y/n): `);
      if (proceed !== 'y' && proceed !== 'yes') {
        console.log('Skipping sheet...');
        continue;
      }

      await processSheet(workbook, sheetName, doctor);
    }

  } catch (error) {
    console.error(`❌ Error processing file: ${error.message}`);
  }
}

async function processSheet(workbook, sheetName, doctor) {
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  let headerRowIndex = -1;
  let headers = {};
  
  for (let i = 0; i < Math.min(10, jsonData.length); i++) {
    const row = jsonData[i];
    if (!row) continue;
    
    for (let j = 0; j < row.length; j++) {
      const cell = row[j]?.toString().toLowerCase() || '';
      if (cell.includes('patient') && cell.includes('id')) {
        headerRowIndex = i;
        break;
      }
    }
    if (headerRowIndex >= 0) break;
  }

  if (headerRowIndex === -1) {
    console.log('❌ No header row found');
    return;
  }

  // Map ALL column headers from multiple rows
  for (let rowIdx = headerRowIndex; rowIdx < Math.min(headerRowIndex + 5, jsonData.length); rowIdx++) {
    const row = jsonData[rowIdx];
    if (!row) continue;
    
    row.forEach((header, index) => {
      if (header && typeof header === 'string' && header.toString().trim().length > 0) {
        const key = header.toString().trim().toUpperCase();
        if (!headers[key] || key.length > 10) {
          headers[key] = index;
        }
        
        // Create simplified keys for common variations
        if (key.includes('PATIENT') && key.includes('ID')) {
          headers['PATIENT_ID'] = index;
        }
        if (key.includes('PATIENT') && key.includes('NAME')) {
          headers['PATIENT_NAME'] = index;
        }
        if (key.includes('FOLLOW') && key.includes('FEEDBACK')) {
          headers['FOLLOWUP_FEEDBACK'] = index;
        }
        if (key.includes('MEDICATION') && key.includes('PRESCRIBED')) {
          headers['MEDICATION_PRESCRIBED'] = index;
        }
        if (key.includes('NEXT') && key.includes('FOLLOW')) {
          headers['NEXT_FOLLOWUP_DATE'] = index;
        }
      }
    });
  }

  console.log(`Found ${Object.keys(headers).length} column headers`);
  
  // Show ALL columns that will be imported
  console.log('\nALL COLUMNS MAPPED:');
  const sortedHeaders = Object.entries(headers).sort((a, b) => a[1] - b[1]);
  sortedHeaders.forEach(([key, index]) => {
    console.log(`  Col ${index + 1}: ${key}`);
  });
  
  // Show sample data for verification
  console.log('\nSAMPLE DATA PREVIEW:');
  for (let i = headerRowIndex + 4; i < Math.min(headerRowIndex + 6, jsonData.length); i++) {
    const row = jsonData[i];
    if (row && row.length > 5) {
      console.log(`  Row ${i + 1}: ${row.slice(0, 8).map(cell => 
        cell ? `"${cell.toString().substring(0, 15)}"` : 'null'
      ).join(' | ')}`);
      break;
    }
  }

  const confirm = await askQuestion(`\nImport data from ${sheetName}? (y/n): `);
  if (confirm !== 'y' && confirm !== 'yes') {
    return;
  }

  // Process data rows
  let processed = 0;
  let errors = 0;

  for (let i = headerRowIndex + 4; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (!row || row.length < 5) continue;

    try {
      await processPatientRow(row, headers, sheetName, doctor);
      processed++;
      
      if (processed % 10 === 0) {
        console.log(`  Processed ${processed} patients...`);
      }
      
    } catch (error) {
      console.error(`  ❌ Error processing row ${i}: ${error.message}`);
      errors++;
    }
  }

  console.log(`✅ Sheet completed: ${processed} processed, ${errors} errors`);
}

async function processPatientRow(row, headers, sheetName, doctor) {
  const patientId = getColumnValue(row, headers, ['PATIENT ID', 'PATIENT_ID']);
  const patientName = getColumnValue(row, headers, ['PATIENT\'S NAME', 'PATIENT NAME', 'NAME', 'PATIENT_NAME']);
  
  if (!patientId || !patientName) return;

  const [existingPatients] = await sequelize.query(`
    SELECT id, "patientNumber", surname, "otherNames" 
    FROM "Patients" 
    WHERE "patientNumber" = ? OR UPPER(CONCAT(surname, ' ', "otherNames")) LIKE UPPER(?)
  `, [patientId, `%${patientName}%`]);

  if (existingPatients.length === 0) {
    console.log(`  ⚠️  Patient not found: ${patientName} (${patientId})`);
    return;
  }

  const patient = existingPatients[0];
  const month = extractMonth(sheetName);
  const year = extractYear(sheetName);

  await updatePatientDetails(patient.id, row, headers);
  await updateCCPRecord(patient.id, month, year, row, headers, doctor.id);
  await createMedicalRecord(patient.id, row, headers, doctor.id);
  await createPrescriptions(patient.id, row, headers, doctor.id);
  await createLabTests(patient.id, row, headers, doctor.id);
}

async function updatePatientDetails(patientId, row, headers) {
  const updates = {};
  
  const gender = getColumnValue(row, headers, ['GENDER', 'SEX']);
  if (gender) {
    updates.sex = gender.toUpperCase().includes('F') ? 'FEMALE' : 'MALE';
  }
  
  const age = getColumnValue(row, headers, ['AGE', 'AGE(YRS)']);
  if (age && !isNaN(age)) {
    const birthYear = new Date().getFullYear() - parseInt(age);
    updates.dateOfBirth = `${birthYear}-01-01`;
  }
  
  const contact = getColumnValue(row, headers, ['CONTACT', 'PATIENT\'S CONTACT', 'PHONE']);
  if (contact) {
    updates.telephone1 = contact.toString();
  }
  
  const email = getColumnValue(row, headers, ['EMAIL', 'EMAIL ADDRESS', 'EMAIL ADRESS']);
  if (email && email.includes('@')) {
    updates.email = email;
  }
  
  const location = getColumnValue(row, headers, ['LOCATION', 'ADDRESS', 'RESIDENCE']);
  if (location) {
    updates.town = location;
    updates.residence = location;
  }
  
  const insurance = getColumnValue(row, headers, ['INSURANCE SCHEME', 'INSURANCE']);
  if (insurance) {
    updates.paymentScheme = JSON.stringify({
      type: insurance.toUpperCase().includes('CASH') ? 'CASH' : 'INSURANCE',
      provider: insurance
    });
  }
  
  const condition = getColumnValue(row, headers, ['KNOWN UNDERLYING CONDITION', 'CONDITION', 'DIAGNOSIS']);
  if (condition) {
    updates.medicalHistory = JSON.stringify({
      existingConditions: [condition],
      allergies: []
    });
  }

  if (Object.keys(updates).length > 0) {
    const setClause = Object.keys(updates).map(key => `"${key}" = ?`).join(', ');
    const values = Object.values(updates);
    
    await sequelize.query(`
      UPDATE "Patients" 
      SET ${setClause}, "updatedAt" = NOW()
      WHERE id = ?
    `, [...values, patientId]);
  }
}

async function updateCCPRecord(patientId, month, year, row, headers, doctorId) {
  const [existingCCP] = await sequelize.query(`
    SELECT id FROM "CCPs" 
    WHERE "patientId" = ? AND "followupMonth" = ? AND "followupYear" = ?
  `, [patientId, month, year]);

  if (existingCCP.length === 0) return;

  const ccpId = existingCCP[0].id;
  const updates = {};

  // Extract ALL possible followup data
  const followupFeedback = getColumnValue(row, headers, [
    'FOLLOW-UP FEEDBACK', 'FOLLOWUP FEEDBACK', 'FEEDBACK', 'FOLLOW UP FEEDBACK',
    'FOLLOWUP_FEEDBACK', 'CLIENT\'S FOLLOW UP'
  ]);
  if (followupFeedback) {
    updates.followupFeedback = followupFeedback;
  }

  const previousFeedback = getColumnValue(row, headers, [
    'PREVIOUS FOLLOW-UP FEEDBACK', 'PREVIOUS FEEDBACK', 'PREVIOUS FOLLOW UP FEEDBACK'
  ]);
  if (previousFeedback) {
    updates.previousFollowupFeedback = previousFeedback;
  }

  const consultationFeedback = getColumnValue(row, headers, [
    'CONSULTATION FEEDBACK', 'CONSULTATION', 'DOCTOR FEEDBACK'
  ]);
  if (consultationFeedback) {
    updates.consultationFeedback = consultationFeedback;
  }

  const nextFollowupDate = getColumnValue(row, headers, [
    'NEXT FOLLOW-UP DATE', 'NEXT FOLLOWUP DATE', 'NEXT FOLLOW UP DATE', 'NEXT_FOLLOWUP_DATE'
  ]);
  if (nextFollowupDate) {
    updates.nextFollowupDate = parseDate(nextFollowupDate);
  }

  const dueDate = getColumnValue(row, headers, [
    'DUE FOLLOW UP DATE', 'DUE FOLLOWUP DATE'
  ]);
  if (dueDate) {
    updates.dueFollowupDate = parseDate(dueDate);
  }

  const followupStatus = getColumnValue(row, headers, [
    'FOLLOW UP STATUS', 'FOLLOWUP STATUS', 'STATUS'
  ]);
  if (followupStatus) {
    updates.status = followupStatus.toUpperCase().includes('COMPLETED') ? 'COMPLETED' : 'SCHEDULED';
    updates.isFollowupCompleted = followupStatus.toUpperCase().includes('COMPLETED');
  }

  // Extract vital signs from any feedback text
  const allFeedback = [followupFeedback, previousFeedback, consultationFeedback].filter(f => f).join(' ');
  const vitalSigns = extractVitalSigns(allFeedback);
  if (Object.keys(vitalSigns).length > 0) {
    updates.vitalSigns = JSON.stringify(vitalSigns);
  }

  // Extract medications from ALL possible columns
  const medications = getColumnValue(row, headers, [
    'MEDICATION PRESCRIBED', 'MEDICATIONS', 'DRUGS', 'MEDICATION_PRESCRIBED',
    'MEDICATION DISPATCHMENT', 'MEDICATION REFILL'
  ]);
  if (medications) {
    updates.medicationsPrescribed = JSON.stringify([{ medication: medications }]);
  }

  // Extract lab tests
  const labTests = getColumnValue(row, headers, [
    'LABORATORY SERVICES', 'LAB TESTS', 'TESTS', 'LABORATORY'
  ]);
  if (labTests) {
    updates.labTestsPerformed = JSON.stringify([{ test: labTests }]);
  }

  // Extract medication compliance
  const compliance = getColumnValue(row, headers, [
    'MEDICATION COMPLIANCE', 'COMPLIANCE', 'ADHERENCE'
  ]);
  if (compliance) {
    updates.medicationCompliance = compliance.toUpperCase().includes('GOOD') ? 'GOOD' : 
                                   compliance.toUpperCase().includes('POOR') ? 'POOR' : 'FAIR';
  }

  if (Object.keys(updates).length > 0) {
    const setClause = Object.keys(updates).map(key => `"${key}" = ?`).join(', ');
    const values = Object.values(updates);
    
    await sequelize.query(`
      UPDATE "CCPs" 
      SET ${setClause}, "updatedAt" = NOW()
      WHERE id = ?
    `, [...values, ccpId]);
  }
}

async function createMedicalRecord(patientId, row, headers, doctorId) {
  const condition = getColumnValue(row, headers, ['KNOWN UNDERLYING CONDITION', 'CONDITION', 'DIAGNOSIS']);
  const feedback = getColumnValue(row, headers, ['FOLLOW-UP FEEDBACK', 'FEEDBACK', 'CONSULTATION FEEDBACK']);
  
  if (!condition && !feedback) return;

  const [existing] = await sequelize.query(`
    SELECT id FROM "MedicalRecords" 
    WHERE "patientId" = ? AND "doctorId" = ?
    ORDER BY "createdAt" DESC LIMIT 1
  `, [patientId, doctorId]);

  if (existing.length > 0) return;

  await sequelize.query(`
    INSERT INTO "MedicalRecords" (
      id, "patientId", "doctorId", diagnosis, notes, status, "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid(), ?, ?, ?, ?, 'active', NOW(), NOW()
    )
  `, [patientId, doctorId, condition || 'CCP Follow-up', feedback || 'CCP consultation']);
}

async function createPrescriptions(patientId, row, headers, doctorId) {
  const medications = getColumnValue(row, headers, [
    'MEDICATION PRESCRIBED', 'MEDICATIONS', 'DRUGS', 'MEDICATION DISPATCHMENT'
  ]);
  
  if (!medications) return;

  const [existing] = await sequelize.query(`
    SELECT id FROM "Prescriptions" 
    WHERE "patientId" = ? AND "doctorId" = ?
    ORDER BY "createdAt" DESC LIMIT 1
  `, [patientId, doctorId]);

  if (existing.length > 0) return;

  await sequelize.query(`
    INSERT INTO "Prescriptions" (
      id, "patientId", "doctorId", medications, status, "validUntil", "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid(), ?, ?, ?, 'active', NOW() + INTERVAL '3 months', NOW(), NOW()
    )
  `, [patientId, doctorId, JSON.stringify([{ name: medications, dosage: 'As prescribed' }])]);
}

async function createLabTests(patientId, row, headers, doctorId) {
  const labTests = getColumnValue(row, headers, [
    'LABORATORY SERVICES', 'LAB TESTS', 'TESTS', 'LABORATORY'
  ]);
  
  if (!labTests) return;

  const [existing] = await sequelize.query(`
    SELECT id FROM "LabTests" 
    WHERE "patientId" = ? AND "requestedById" = ?
    ORDER BY "createdAt" DESC LIMIT 1
  `, [patientId, doctorId]);

  if (existing.length > 0) return;

  await sequelize.query(`
    INSERT INTO "LabTests" (
      id, "patientId", "requestedById", "testType", status, "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid(), ?, ?, ?, 'completed', NOW(), NOW()
    )
  `, [patientId, doctorId, labTests]);
}

function getColumnValue(row, headers, possibleKeys) {
  for (const key of possibleKeys) {
    const upperKey = key.toUpperCase();
    let index = headers[upperKey];
    
    if (index !== undefined && row[index]) {
      return row[index].toString().trim();
    }
    
    // Try partial matches
    for (const [headerKey, headerIndex] of Object.entries(headers)) {
      if (headerKey.includes(upperKey) || upperKey.includes(headerKey)) {
        if (row[headerIndex]) {
          return row[headerIndex].toString().trim();
        }
      }
    }
  }
  return null;
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

function parseDate(dateStr) {
  if (!dateStr) return null;
  
  const formats = [
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
    /(\d{4})-(\d{1,2})-(\d{1,2})/,
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      const [, part1, part2, part3] = match;
      return `${part3}-${part2.padStart(2, '0')}-${part1.padStart(2, '0')}`;
    }
  }
  
  return null;
}

function extractVitalSigns(text) {
  const vitalSigns = {};
  
  if (!text) return vitalSigns;
  
  const bpMatch = text.match(/BP[:\-\s]*(\d{2,3})\/(\d{2,3})/i);
  if (bpMatch) {
    vitalSigns.systolicBP = parseInt(bpMatch[1]);
    vitalSigns.diastolicBP = parseInt(bpMatch[2]);
  }
  
  const weightMatch = text.match(/weight[:\-\s]*(\d+\.?\d*)/i);
  if (weightMatch) {
    vitalSigns.weight = parseFloat(weightMatch[1]);
  }
  
  return vitalSigns;
}

if (require.main === module) {
  completeCCPImport().catch(console.error);
}