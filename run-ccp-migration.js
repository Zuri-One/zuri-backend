#!/usr/bin/env node

require('dotenv').config();

const { sequelize } = require('./src/config/database'); // Use the same path as other scripts
const migration = require('./src/migrations/20250819-add-ccp-excel-fields.js');

async function runMigration() {
  try {
    console.log('Running CCP Excel fields migration...');
    
    await migration.up(sequelize.getQueryInterface(), sequelize.Sequelize);
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();