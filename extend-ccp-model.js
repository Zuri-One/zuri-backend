require('dotenv').config();
const { sequelize } = require('./src/models');

async function extendCCPModel() {
  try {
    await sequelize.query(`
      ALTER TABLE "Patients" 
      ADD COLUMN IF NOT EXISTS "insuranceCompany" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "membershipNumber" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "originalPatientId" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "assignedDoctor" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "importSource" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "importDate" TIMESTAMP DEFAULT NOW();
    `);
    
    console.log('Patient model extended successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

extendCCPModel();