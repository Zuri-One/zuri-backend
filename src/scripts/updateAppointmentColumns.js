require('dotenv').config();
const { sequelize } = require('../config/database');

async function updateColumns() {
  try {
    console.log('Starting column updates...');
    
    await sequelize.query(`
      ALTER TABLE "Appointments"
        ALTER COLUMN "meetingLink" TYPE TEXT,
        ALTER COLUMN "startUrl" TYPE TEXT,
        ALTER COLUMN "meetingId" TYPE VARCHAR(255),
        ALTER COLUMN "meetingPassword" TYPE VARCHAR(255),
        ALTER COLUMN "platform" TYPE VARCHAR(50);
    `);

    console.log('Columns updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error updating columns:', error);
    process.exit(1);
  }
}

updateColumns();