// src/models/index.js
const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');
const path = require('path');

// Import models using path.join to handle cross-platform paths
const models = {
  User: require(path.join(__dirname, 'user.model')),
  Appointment: require(path.join(__dirname, 'appointment.model')),
  DoctorAvailability: require(path.join(__dirname, 'doctor-availability.model')),
  DoctorProfile: require(path.join(__dirname, 'doctor-profile.model')),
  TestResult: require(path.join(__dirname, 'test-result.model')),
  HealthMetric: require(path.join(__dirname, 'health-metric.model')),
  Prescription: require(path.join(__dirname, 'prescription.model')),
  Medication: require(path.join(__dirname, 'medication.model')),
  PrescriptionMedications: require(path.join(__dirname, 'prescription-medications.model')),
  MedicalRecord: require(path.join(__dirname, 'medical-record.model')),
  LabTest: require(path.join(__dirname, 'lab-test.model')),
  LabTestTemplate: require(path.join(__dirname, 'lab-test-template.model')),
  Laboratory: require(path.join(__dirname, 'laboratory.model')),
  MedicationInventory: require(path.join(__dirname, 'medication-inventory.model')),
  MedicationDispense: require(path.join(__dirname, 'medication-dispense.model')),
  StockMovement: require(path.join(__dirname, 'stock-movement.model')),
  Pharmacy: require(path.join(__dirname, 'pharmacy.model')),
  MedicalDocument: require(path.join(__dirname, 'medical-document.model')), 
  DocumentShare: require(path.join(__dirname, 'document-share.model'))
};

// Helper function to initialize a model based on its structure
const initializeModel = (Model) => {
  // For models using initialize pattern (like MedicalDocument)
  if (typeof Model.initialize === 'function') {
    return Model.initialize(sequelize);
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

// Initialize all models
const initializedModels = Object.entries(models).reduce((acc, [key, Model]) => {
  try {
    if (key === 'MedicalDocument') {
      // Special handling for MedicalDocument
      acc[key] = Model.initialize(sequelize);
    } else {
      acc[key] = initializeModel(Model);
    }
    return acc;
  } catch (error) {
    console.error(`Error initializing model ${key}:`, error);
    process.exit(1);
  }
}, {});

// Define associations
Object.keys(initializedModels).forEach(modelName => {
  if (initializedModels[modelName].associate) {
    initializedModels[modelName].associate(initializedModels);
  }
});

module.exports = {
  sequelize,
  ...initializedModels
};