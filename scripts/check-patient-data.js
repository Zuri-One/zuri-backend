require('dotenv').config();
const { sequelize } = require('../src/config/database');

async function checkPatientData() {
  const patientId = '2751c43a-a406-4344-9d2d-1fe79e0e9d0b';
  
  try {
    // Check all possible sources of visit data
    const queries = [
      `SELECT COUNT(*) as count, MAX("createdAt") as latest FROM "MedicalRecords" WHERE "patientId" = '${patientId}'`,
      `SELECT COUNT(*) as count, MAX("examinationDateTime") as latest FROM "Examinations" WHERE "patientId" = '${patientId}'`,
      `SELECT COUNT(*) as count, MAX("createdAt") as latest FROM "LabTests" WHERE "patientId" = '${patientId}'`,
      `SELECT COUNT(*) as count, MAX("createdAt") as latest FROM "Prescriptions" WHERE "patientId" = '${patientId}'`,
      `SELECT COUNT(*) as count, MAX("assessmentDateTime") as latest FROM "Triages" WHERE "patientId" = '${patientId}'`,
      `SELECT COUNT(*) as count, MAX("createdAt") as latest FROM "Appointments" WHERE "patientId" = '${patientId}'`,
      `SELECT COUNT(*) as count, MAX("createdAt") as latest FROM "QueueEntries" WHERE "patientId" = '${patientId}'`,
      `SELECT COUNT(*) as count, MAX("createdAt") as latest FROM "Billings" WHERE "patientId" = '${patientId}'`,
      `SELECT "createdAt", "ccpEnrollmentDate" FROM "Patients" WHERE "id" = '${patientId}'`
    ];

    const tables = ['MedicalRecords', 'Examinations', 'LabTests', 'Prescriptions', 'Triages', 'Appointments', 'QueueEntries', 'Billings', 'Patient Info'];

    for (let i = 0; i < queries.length; i++) {
      const [results] = await sequelize.query(queries[i]);
      console.log(`\n${tables[i]}:`, results[0]);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkPatientData();