// scripts/check-ccp-data.js
require('dotenv').config();
const { Patient, MedicalRecord, CCP, sequelize } = require('../src/models');
const moment = require('moment');

async function checkCCPData() {
  try {
    console.log('=== CCP Data Analysis ===\n');
    
    // 1. Check CCP enrolled patients
    const ccpPatients = await Patient.findAll({
      where: { isCCPEnrolled: true },
      attributes: ['id', 'patientNumber', 'surname', 'otherNames', 'lastVisit', 'lastFollowup', 'ccpEnrollmentDate'],
      limit: 10
    });
    
    console.log(`Found ${ccpPatients.length} CCP enrolled patients:\n`);
    
    ccpPatients.forEach(patient => {
      console.log(`Patient: ${patient.patientNumber} - ${patient.surname} ${patient.otherNames}`);
      console.log(`  Enrollment Date: ${patient.ccpEnrollmentDate}`);
      console.log(`  Last Visit: ${patient.lastVisit || 'NULL'}`);
      console.log(`  Last Followup: ${patient.lastFollowup || 'NULL'}`);
      console.log('');
    });
    
    // 2. Check if lastVisit and lastFollowup columns exist
    console.log('=== Checking Patient table structure ===\n');
    
    const tableInfo = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'Patients' 
      AND column_name IN ('lastVisit', 'lastFollowup')
      ORDER BY column_name;
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log('Patient table columns for lastVisit/lastFollowup:');
    if (tableInfo.length === 0) {
      console.log('❌ lastVisit and lastFollowup columns do NOT exist in Patients table');
    } else {
      tableInfo.forEach(col => {
        console.log(`✅ ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }
    console.log('');
    
    // 3. Check medical records for these patients
    console.log('=== Checking Medical Records ===\n');
    
    for (const patient of ccpPatients.slice(0, 3)) {
      const medicalRecords = await MedicalRecord.findAll({
        where: { patientId: patient.id },
        attributes: ['id', 'createdAt', 'diagnosis'],
        order: [['createdAt', 'DESC']],
        limit: 3
      });
      
      console.log(`Medical Records for ${patient.patientNumber}:`);
      if (medicalRecords.length === 0) {
        console.log('  No medical records found');
      } else {
        medicalRecords.forEach(record => {
          console.log(`  - ${moment(record.createdAt).format('YYYY-MM-DD HH:mm')} - ${record.diagnosis || 'No diagnosis'}`);
        });
        
        const latestRecord = medicalRecords[0];
        console.log(`  Latest visit should be: ${moment(latestRecord.createdAt).format('YYYY-MM-DD HH:mm')}`);
      }
      console.log('');
    }
    
    // 4. Check CCP followup records
    console.log('=== Checking CCP Followup Records ===\n');
    
    const ccpRecords = await CCP.findAll({
      attributes: ['id', 'patientId', 'actualFollowupDate', 'isFollowupCompleted', 'createdAt'],
      limit: 10,
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`Found ${ccpRecords.length} CCP followup records:`);
    ccpRecords.forEach(record => {
      console.log(`  Patient ID: ${record.patientId}`);
      console.log(`  Completed: ${record.isFollowupCompleted}`);
      console.log(`  Actual Followup Date: ${record.actualFollowupDate || 'NULL'}`);
      console.log(`  Created: ${moment(record.createdAt).format('YYYY-MM-DD HH:mm')}`);
      console.log('');
    });
    
    // 5. Check what should be the correct lastVisit and lastFollowup
    console.log('=== Calculating Correct Values ===\n');
    
    for (const patient of ccpPatients.slice(0, 3)) {
      console.log(`Analysis for ${patient.patientNumber}:`);
      
      // Get latest medical record
      const latestMedicalRecord = await MedicalRecord.findOne({
        where: { patientId: patient.id },
        order: [['createdAt', 'DESC']]
      });
      
      // Get latest completed CCP followup
      const latestFollowup = await CCP.findOne({
        where: { 
          patientId: patient.id,
          isFollowupCompleted: true
        },
        order: [['actualFollowupDate', 'DESC']]
      });
      
      console.log(`  Current lastVisit in DB: ${patient.lastVisit || 'NULL'}`);
      console.log(`  Should be (from medical records): ${latestMedicalRecord ? moment(latestMedicalRecord.createdAt).format('YYYY-MM-DD HH:mm') : 'No records'}`);
      console.log(`  Current lastFollowup in DB: ${patient.lastFollowup || 'NULL'}`);
      console.log(`  Should be (from CCP records): ${latestFollowup ? moment(latestFollowup.actualFollowupDate).format('YYYY-MM-DD HH:mm') : 'No completed followups'}`);
      console.log('');
    }
    
    console.log('=== Summary ===');
    console.log('The issue is likely that:');
    console.log('1. lastVisit and lastFollowup columns may not exist in the Patients table');
    console.log('2. Or they exist but are not being updated when medical records/followups are created');
    console.log('3. The CCP controller is reading these fields directly instead of calculating them from related records');
    
  } catch (error) {
    console.error('Error checking CCP data:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the check
checkCCPData();