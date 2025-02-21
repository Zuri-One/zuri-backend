// src/config/database.js
const { Sequelize } = require('sequelize');
const MigrationManager = require('./migrationManager');
let migrationManager;

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: process.env.NODE_ENV === 'development' ? console.log : false
});

const connectDB = async () => {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not defined in environment variables');
    }

    await sequelize.authenticate();
    console.log('PostgreSQL Connected');

    // Initialize migration manager after models are loaded
    if (process.env.NODE_ENV === 'development') {
      const models = require('../models');
      migrationManager = new MigrationManager(sequelize, models);
      await migrationManager.runMigrations();
    }

  } catch (error) {
    console.error('PostgreSQL connection error:', error.message);
    process.exit(1);
  }
};

module.exports = { 
  connectDB, 
  sequelize,
  getMigrationManager: () => migrationManager 
};