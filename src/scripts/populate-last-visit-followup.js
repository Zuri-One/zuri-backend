// scripts/populate-last-visit-followup.js
require('dotenv').config();
const { Patient, MedicalRecord, CCP, sequelize } = require('../models');
const moment = require('moment');

const log = (message, data = null) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    service: 'populate-last-visit-followup',
    message
  };
  
  if (data) {
    logEntry.data = data;
  }
  
  console.log(JSON.stringify(logEntry));
};

async function populateLastVisitAndFollowup() {
  try {
    log('Starting population of lastVisit and lastFollowup fields');

    // Get all CCP enrolled patients
    const ccpPatients = await Patient.findAll({
      where: { isCCPEnrolled: true },
      attributes: ['id', 'patientNumber', 'surname', 'otherNames', 'lastVisit', 'lastFollowup']
    });

    log('Found CCP patients', { count: ccpPatients.length });

    let updatedCount = 0;

    for (const patient of ccpPatients) {
      try {
        let updateData = {};

        // Get last medical record (visit) if lastVisit is null
        if (!patient.lastVisit) {
          const lastMedicalRecord = await MedicalRecord.findOne({
            where: { patientId: patient.id },
            order: [['createdAt', 'DESC']],
            attributes: ['createdAt']
          });

          if (lastMedicalRecord) {
            updateData.lastVisit = lastMedicalRecord.createdAt;
          }
        }

        // Get last completed followup if lastFollowup is null
        if (!patient.lastFollowup) {
          const lastFollowup = await CCP.findOne({
            where: { 
              patientId: patient.id,
              isFollowupCompleted: true
            },
            order: [['actualFollowupDate', 'DESC']],
            attributes: ['actualFollowupDate']
          });

          if (lastFollowup && lastFollowup.actualFollowupDate) {
            updateData.lastFollowup = lastFollowup.actualFollowupDate;
          }
        }

        // Update patient if we have data to update
        if (Object.keys(updateData).length > 0) {
          await patient.update(updateData);
          updatedCount++;
          
          log('Updated patient', {
            patientId: patient.id,
            patientNumber: patient.patientNumber,
            fullName: `${patient.surname} ${patient.otherNames}`,
            updates: updateData
          });
        }

      } catch (error) {
        log('Error updating patient', {
          patientId: patient.id,
          error: error.message
        });
      }
    }

    log('Population completed', {
      totalPatients: ccpPatients.length,
      updatedPatients: updatedCount
    });

    return {
      success: true,
      totalPatients: ccpPatients.length,
      updatedPatients: updatedCount
    };

  } catch (error) {
    log('Error in population script', { error: error.message });
    throw error;
  }
}

// Run the script if called directly
if (require.main === module) {
  populateLastVisitAndFollowup()
    .then((result) => {
      console.log('Script completed successfully:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = populateLastVisitAndFollowup;