// scripts/update-ccp-dates.js
require('dotenv').config();
const { Patient, MedicalRecord, CCP, sequelize } = require('../src/models');
const moment = require('moment');

async function updateCCPDates() {
  try {
    console.log('=== Updating CCP Patient lastVisit and lastFollowup Dates ===\n');
    
    // Get all CCP enrolled patients
    const ccpPatients = await Patient.findAll({
      where: { isCCPEnrolled: true },
      attributes: ['id', 'patientNumber', 'surname', 'otherNames', 'lastVisit', 'lastFollowup']
    });
    
    console.log(`Found ${ccpPatients.length} CCP enrolled patients to update\n`);
    
    let updatedCount = 0;
    
    for (const patient of ccpPatients) {
      console.log(`Processing ${patient.patientNumber} - ${patient.surname} ${patient.otherNames}`);
      
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
      
      // Calculate new values
      const newLastVisit = latestMedicalRecord ? latestMedicalRecord.createdAt : null;
      const newLastFollowup = latestFollowup ? latestFollowup.actualFollowupDate : null;
      
      // Check if update is needed
      const currentLastVisit = patient.lastVisit;
      const currentLastFollowup = patient.lastFollowup;
      
      let needsUpdate = false;
      const updates = {};
      
      // Check lastVisit
      if (!currentLastVisit && newLastVisit) {
        updates.lastVisit = newLastVisit;
        needsUpdate = true;
        console.log(`  Setting lastVisit: ${moment(newLastVisit).format('YYYY-MM-DD HH:mm')}`);
      } else if (currentLastVisit && newLastVisit && 
                 moment(currentLastVisit).format('YYYY-MM-DD HH:mm') !== moment(newLastVisit).format('YYYY-MM-DD HH:mm')) {
        updates.lastVisit = newLastVisit;
        needsUpdate = true;
        console.log(`  Updating lastVisit: ${moment(currentLastVisit).format('YYYY-MM-DD HH:mm')} -> ${moment(newLastVisit).format('YYYY-MM-DD HH:mm')}`);
      } else if (!newLastVisit) {
        console.log(`  No medical records found - lastVisit remains NULL`);
      } else {
        console.log(`  lastVisit is correct: ${moment(currentLastVisit).format('YYYY-MM-DD HH:mm')}`);
      }
      
      // Check lastFollowup
      if (!currentLastFollowup && newLastFollowup) {
        updates.lastFollowup = newLastFollowup;
        needsUpdate = true;
        console.log(`  Setting lastFollowup: ${moment(newLastFollowup).format('YYYY-MM-DD HH:mm')}`);
      } else if (currentLastFollowup && newLastFollowup && 
                 moment(currentLastFollowup).format('YYYY-MM-DD HH:mm') !== moment(newLastFollowup).format('YYYY-MM-DD HH:mm')) {
        updates.lastFollowup = newLastFollowup;
        needsUpdate = true;
        console.log(`  Updating lastFollowup: ${moment(currentLastFollowup).format('YYYY-MM-DD HH:mm')} -> ${moment(newLastFollowup).format('YYYY-MM-DD HH:mm')}`);
      } else if (!newLastFollowup) {
        console.log(`  No completed followups found - lastFollowup remains NULL`);
      } else {
        console.log(`  lastFollowup is correct: ${moment(currentLastFollowup).format('YYYY-MM-DD HH:mm')}`);
      }
      
      // Perform update if needed
      if (needsUpdate) {
        await patient.update(updates);
        updatedCount++;
        console.log(`  Updated patient record`);
      } else {
        console.log(`  No updates needed`);
      }
      
      console.log('');
    }
    
    console.log(`=== Update Complete ===`);
    console.log(`Total patients processed: ${ccpPatients.length}`);
    console.log(`Patients updated: ${updatedCount}`);
    console.log(`Patients unchanged: ${ccpPatients.length - updatedCount}`);
    
  } catch (error) {
    console.error('Error updating CCP dates:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the update
updateCCPDates();