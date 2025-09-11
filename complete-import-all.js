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
  console.log('🏥 COMPLETE ALL COLUMNS IMPORT');
  console.log('=' .repeat(60));

  const files = [
    { 
      name: 'Copy of DR. GEORGINA NYAKA - MADISON & CiC _ CCP 2025.xlsx',
      doctor: 'DR. GEORGINA NYAKA'
    }
  ];

  try {
    const [doctors] = await sequelize.query(`
      SELECT id, surname, "otherNames", email 
      FROM "Users" 
      WHERE role = 'DOCTOR' AND "isActive" = true
      ORDER BY surname
    `);

    for (const file of files) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📄 Processing: ${file.name}`);

      const proceed = await askQuestion(`\nProcess ${file.doctor}'s data? (y/n): `);
      if (proceed !== 'y' && proceed !== 'yes') continue;

      const selectedDoctor = doctors.find(d => d.surname.toUpperCase().includes('NYAKA'));
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
  const workbook = XLSX.readFile(`./${fileName}`);
  const validSheets = workbook.SheetNames.filter(name => 
    !name.toUpperCase().includes('TASK') && 
    !name.toUpperCase().includes('DISCONTINUATION')
  );

  for (const sheetName of validSheets.slice(0, 2)) {
    console.log(`\n📋 Processing sheet: ${sheetName}`);
    
    const proceed = await askQuestion(`Process sheet "${sheetName}"? (y/n): `);
    if (proceed !== 'y' && proceed !== 'yes') continue;

    await processSheet(workbook, sheetName, doctor);
  }
}

async function processSheet(workbook, sheetName, doctor) {
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  let headerRowIndex = -1;
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

  const headers = {};
  for (let rowIdx = headerRowIndex; rowIdx < Math.min(headerRowIndex + 5, jsonData.length); rowIdx++) {
    const row = jsonData[rowIdx];
    if (!row) continue;
    
    row.forEach((header, index) => {
      if (header && typeof header === 'string' && header.toString().trim().length > 0) {
        const key = header.toString().trim().toUpperCase();
        headers[key] = index;
      }
    });
  }

  console.log(`Found ${Object.keys(headers).length} column headers`);

  const confirm = await askQuestion(`\nImport ALL data from ${sheetName}? (y/n): `);
  if (confirm !== 'y' && confirm !== 'yes') return;

  let processed = 0;
  let errors = 0;

  for (let i = headerRowIndex + 4; i < Math.min(headerRowIndex + 10, jsonData.length); i++) {
    const row = jsonData[i];
    if (!row || row.length < 5) continue;

    try {
      await processPatientRowComplete(row, headers, sheetName, doctor);
      processed++;
      console.log(`  ✅ Processed row ${i}`);
      
    } catch (error) {
      console.error(`  ❌ Error processing row ${i}: ${error.message}`);
      errors++;
    }
  }

  console.log(`✅ Sheet completed: ${processed} processed, ${errors} errors`);
}

async function processPatientRowComplete(row, headers, sheetName, doctor) {
  const patientId = getColumnValue(row, headers, 'PATIENT ID');
  const patientName = getColumnValue(row, headers, 'PATIENT\'S NAME');
  
  if (!patientId || !patientName) return;

  const [existingPatients] = await sequelize.query(
    `SELECT id, "patientNumber", surname, "otherNames" 
     FROM "Patients" 
     WHERE "patientNumber" = :patientId OR UPPER(CONCAT(surname, ' ', "otherNames")) LIKE UPPER(:patientName)`,
    {
      replacements: { 
        patientId: patientId,
        patientName: `%${patientName}%`
      }
    }
  );

  if (existingPatients.length === 0) {
    console.log(`  ⚠️  Patient not found: ${patientName} (${patientId})`);
    return;
  }

  const patient = existingPatients[0];
  const month = extractMonth(sheetName);
  const year = extractYear(sheetName);

  // Update patient details with ALL available data
  await updatePatientComplete(patient.id, row, headers);
  
  // Update CCP record with ALL available data
  await updateCCPComplete(patient.id, month, year, row, headers, doctor.id);
  
  // Create medical records
  await createMedicalRecordComplete(patient.id, row, headers, doctor.id);
  
  // Create prescriptions
  await createPrescriptionComplete(patient.id, row, headers, doctor.id);
  
  // Create lab tests
  await createLabTestComplete(patient.id, row, headers, doctor.id);
  
  console.log(`  ✅ Complete update: ${patient.surname} ${patient.otherNames}`);
}

async function updatePatientComplete(patientId, row, headers) {
  const updates = {};
  
  // Extract ALL patient fields
  const gender = getColumnValue(row, headers, 'GENDER');
  if (gender) updates.sex = gender.toUpperCase().includes('F') ? 'FEMALE' : 'MALE';
  
  const age = getColumnValue(row, headers, 'AGE(YRS)');
  if (age && !isNaN(age)) {
    const birthYear = new Date().getFullYear() - parseInt(age);
    updates.dateOfBirth = `${birthYear}-01-01`;
  }
  
  const contact = getColumnValue(row, headers, 'CONTACT');
  if (contact) updates.telephone1 = contact.toString();
  
  const email = getColumnValue(row, headers, 'EMAIL ADRESS') || getColumnValue(row, headers, 'EMAIL ADDRESS');
  if (email && email.includes('@')) updates.email = email;
  
  const location = getColumnValue(row, headers, 'LOCATION');
  if (location) {
    updates.town = location;
    updates.residence = location;
  }
  
  const insurance = getColumnValue(row, headers, 'INSURANCE SCHEME');
  if (insurance) {
    updates.paymentScheme = JSON.stringify({
      type: insurance.toUpperCase().includes('CASH') ? 'CASH' : 'INSURANCE',
      provider: insurance
    });
  }
  
  const condition = getColumnValue(row, headers, 'KNOWN UNDERLYING CONDITION');
  if (condition) {
    updates.medicalHistory = JSON.stringify({
      existingConditions: [condition],
      allergies: []
    });
  }

  if (Object.keys(updates).length > 0) {
    const updateFields = Object.keys(updates).map(key => `"${key}" = :${key}`).join(', ');
    
    await sequelize.query(
      `UPDATE "Patients" 
       SET ${updateFields}, "updatedAt" = NOW()
       WHERE id = :patientId`,
      {
        replacements: { ...updates, patientId }
      }
    );
    console.log(`    📝 Updated patient: ${Object.keys(updates).join(', ')}`);
  }
}

async function updateCCPComplete(patientId, month, year, row, headers, doctorId) {
  const [existingCCP] = await sequelize.query(
    `SELECT id FROM "CCPs" 
     WHERE "patientId" = :patientId AND "followupMonth" = :month AND "followupYear" = :year`,
    {
      replacements: { patientId, month, year }
    }
  );

  if (existingCCP.length === 0) return;

  const ccpId = existingCCP[0].id;
  const updates = {};

  // Extract ALL CCP fields
  const followupFeedback = getColumnValue(row, headers, 'FOLLOW-UP FEEDBACK') || 
                          getColumnValue(row, headers, 'PREVIOUS FOLLOW-UP FEEDBACK');
  if (followupFeedback) updates.followupFeedback = followupFeedback;

  const consultationFeedback = getColumnValue(row, headers, 'CONSULATION FEEDBACK') ||
                              getColumnValue(row, headers, 'CONSULTATION FEEDBACK');
  if (consultationFeedback) updates.consultationFeedback = consultationFeedback;

  const medications = getColumnValue(row, headers, 'MEDICATION PRESCRIBED') ||
                     getColumnValue(row, headers, 'MEDICATION DISPATCHMENT');
  if (medications) updates.medicationsPrescribed = JSON.stringify([{ medication: medications }]);

  const labTests = getColumnValue(row, headers, 'LABORATORY SERVICES');
  if (labTests) updates.labTestsPerformed = JSON.stringify([{ test: labTests }]);

  const nextFollowup = getColumnValue(row, headers, 'NEXT FOLLOW-UP DATE');
  if (nextFollowup) updates.nextFollowupDate = parseDate(nextFollowup);

  const dueFollowup = getColumnValue(row, headers, 'DUE FOLLOW UP DATE');
  if (dueFollowup) updates.dueFollowupDate = parseDate(dueFollowup);

  const followupStatus = getColumnValue(row, headers, 'FOLLOW UP STATUS');
  if (followupStatus) {
    updates.status = followupStatus.toUpperCase().includes('COMPLETED') ? 'COMPLETED' : 'SCHEDULED';
    updates.isFollowupCompleted = followupStatus.toUpperCase().includes('COMPLETED');
  }

  const refillFreq = getColumnValue(row, headers, 'REFILL FREQUENCY');
  if (refillFreq) updates.refillFrequency = refillFreq;

  const refillDate = getColumnValue(row, headers, 'NEXT REFILL DATE');
  if (refillDate) updates.nextRefillDate = parseDate(refillDate);

  const refillComments = getColumnValue(row, headers, 'MEDICATION REFILL COMMENTS');
  if (refillComments) updates.patientNotes = refillComments;

  // Extract vital signs from feedback
  const allFeedback = [followupFeedback, consultationFeedback].filter(f => f).join(' ');
  const vitalSigns = extractVitalSigns(allFeedback);
  if (Object.keys(vitalSigns).length > 0) updates.vitalSigns = JSON.stringify(vitalSigns);

  if (Object.keys(updates).length > 0) {
    const updateFields = Object.keys(updates).map(key => `"${key}" = :${key}`).join(', ');
    
    await sequelize.query(
      `UPDATE "CCPs" 
       SET ${updateFields}, "updatedAt" = NOW()
       WHERE id = :ccpId`,
      {
        replacements: { ...updates, ccpId }
      }
    );
    console.log(`    🏥 Updated CCP: ${Object.keys(updates).join(', ')}`);
  }
}

async function createMedicalRecordComplete(patientId, row, headers, doctorId) {
  const condition = getColumnValue(row, headers, 'KNOWN UNDERLYING CONDITION');
  const feedback = getColumnValue(row, headers, 'FOLLOW-UP FEEDBACK') ||
                  getColumnValue(row, headers, 'CONSULATION FEEDBACK');
  
  if (!condition && !feedback) return;

  const [existing] = await sequelize.query(
    `SELECT id FROM "MedicalRecords" 
     WHERE "patientId" = :patientId AND "doctorId" = :doctorId
     ORDER BY "createdAt" DESC LIMIT 1`,
    { replacements: { patientId, doctorId } }
  );

  if (existing.length > 0) return;

  await sequelize.query(
    `INSERT INTO "MedicalRecords" (
      id, "patientId", "doctorId", diagnosis, notes, status, "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid(), :patientId, :doctorId, :diagnosis, :notes, 'active', NOW(), NOW()
    )`,
    {
      replacements: {
        patientId,
        doctorId,
        diagnosis: condition || 'CCP Follow-up',
        notes: feedback || 'CCP consultation'
      }
    }
  );
  console.log(`    📋 Created medical record`);
}

async function createPrescriptionComplete(patientId, row, headers, doctorId) {
  const medications = getColumnValue(row, headers, 'MEDICATION PRESCRIBED') ||
                     getColumnValue(row, headers, 'MEDICATION DISPATCHMENT');
  
  if (!medications) return;

  const [existing] = await sequelize.query(
    `SELECT id FROM "Prescriptions" 
     WHERE "patientId" = :patientId AND "doctorId" = :doctorId
     ORDER BY "createdAt" DESC LIMIT 1`,
    { replacements: { patientId, doctorId } }
  );

  if (existing.length > 0) return;

  await sequelize.query(
    `INSERT INTO "Prescriptions" (
      id, "patientId", "doctorId", medications, status, "validUntil", "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid(), :patientId, :doctorId, :medications, 'active', NOW() + INTERVAL '3 months', NOW(), NOW()
    )`,
    {
      replacements: {
        patientId,
        doctorId,
        medications: JSON.stringify([{ name: medications, dosage: 'As prescribed' }])
      }
    }
  );
  console.log(`    💊 Created prescription`);
}

async function createLabTestComplete(patientId, row, headers, doctorId) {
  const labTests = getColumnValue(row, headers, 'LABORATORY SERVICES');
  
  if (!labTests) return;

  const [existing] = await sequelize.query(
    `SELECT id FROM "LabTests" 
     WHERE "patientId" = :patientId AND "requestedById" = :doctorId
     ORDER BY "createdAt" DESC LIMIT 1`,
    { replacements: { patientId, doctorId } }
  );

  if (existing.length > 0) return;

  await sequelize.query(
    `INSERT INTO "LabTests" (
      id, "patientId", "requestedById", "testType", status, "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid(), :patientId, :doctorId, :testType, 'completed', NOW(), NOW()
    )`,
    {
      replacements: {
        patientId,
        doctorId,
        testType: labTests
      }
    }
  );
  console.log(`    🧪 Created lab test`);
}

function getColumnValue(row, headers, columnName) {
  const index = headers[columnName.toUpperCase()];
  if (index !== undefined && row[index]) {
    return row[index].toString().trim();
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
  
  const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
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
  
  const fbsMatch = text.match(/FBS[:\-\s]*(\d+\.?\d*)/i);
  if (fbsMatch) {
    vitalSigns.fbs = parseFloat(fbsMatch[1]);
  }

  const hba1cMatch = text.match(/HBA1C[:\-\s]*(\d+\.?\d*)/i);
  if (hba1cMatch) {
    vitalSigns.hba1c = parseFloat(hba1cMatch[1]);
  }
  
  return vitalSigns;
}

if (require.main === module) {
  completeCCPImport().catch(console.error);
}