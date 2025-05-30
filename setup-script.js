// updates.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

async function runUpdates() {
  const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: console.log
  });

  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Add the new columns to MedicalRecords table
    const queryInterface = sequelize.getQueryInterface();

    console.log('Adding examinationNotes column...');
    await queryInterface.addColumn('MedicalRecords', 'examinationNotes', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    console.log('Adding reviewOtherSystems column...');
    await queryInterface.addColumn('MedicalRecords', 'reviewOtherSystems', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    console.log('Adding specialHistory column...');
    await queryInterface.addColumn('MedicalRecords', 'specialHistory', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    console.log('All columns added successfully!');

  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await sequelize.close();
  }
}

module.exports = runUpdates;

// If running directly
if (require.main === module) {
  runUpdates();
}