require('dotenv').config();
const { sequelize } = require('./src/models');

async function addFields() {
  try {
    await sequelize.query(`
      ALTER TABLE "Patients" 
      ADD COLUMN IF NOT EXISTS "lastVisit" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "lastFollowup" TIMESTAMP;
    `);
    
    console.log('Fields added successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

addFields();