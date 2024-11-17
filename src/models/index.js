// src/models/index.js
const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

// Import models
const User = require('./user.model');
const Appointment = require('./appointment.model');
const DoctorAvailability = require('./doctor-availability.model');
const DoctorProfile = require('./doctor-profile.model');
const TestResult = require('./test-result.model');
const HealthMetric = require('./health-metric.model');

// Helper function to initialize a model based on its structure
const initializeModel = (Model) => {
  // For models using initModel pattern
  if (typeof Model.initModel === 'function') {
    return Model.initModel(sequelize);
  }
  
  // For models using direct init with schema
  if (Model.schema) {
    return Model.init(Model.schema, { sequelize });
  }
  
  // For traditional Sequelize models
  if (typeof Model.init === 'function') {
    return Model.init({ sequelize });
  }

  throw new Error(`Model ${Model.name} does not have a valid initialization pattern`);
};

// Initialize models with sequelize instance
const models = {
  User: initializeModel(User),
  Appointment: initializeModel(Appointment),
  DoctorAvailability: initializeModel(DoctorAvailability),
  DoctorProfile: initializeModel(DoctorProfile),
  TestResult: initializeModel(TestResult),
  HealthMetric: initializeModel(HealthMetric)
};

// Define associations
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

module.exports = {
  sequelize,
  ...models
};