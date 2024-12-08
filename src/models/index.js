// src/models/index.js
const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');
const path = require('path');

// Import all models
const models = {
  Department: require(path.join(__dirname, 'department.model')),
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
  DocumentShare: require(path.join(__dirname, 'document-share.model')),
  ProgressNote: require(path.join(__dirname, 'progress-note.model')),
  Consent: require(path.join(__dirname, 'consent.model')),
  Triage: require(path.join(__dirname, 'triage.model')),
  TriageNote: require(path.join(__dirname, 'triage-note.model')), 
  Billing: require(path.join(__dirname, 'billing.model')),
  ConsultationQueue: require(path.join(__dirname, 'consultation-queue.model')),

};

// Initialize models - Modified initialization function
const initializeModel = (Model) => {
  try {
    // For models using MedicalDocument's initialize pattern
    if (Model.initialize) {
      return Model.initialize(sequelize);
    }
    
    // For models using schema pattern
    if (Model.schema) {
      return Model.init(Model.schema, { 
        sequelize,
        modelName: Model.name,
        timestamps: true,
        paranoid: false
      });
    }
    
    // For traditional Sequelize models
    if (Model.init) {
      return Model.initModel(sequelize);
    }

    throw new Error(`Model ${Model.name} does not have a valid initialization pattern`);
  } catch (error) {
    console.error(`Error initializing model ${Model.name}:`, error);
    throw error;
  }
};

// Initialize models in specific order
const modelInitializationOrder = [
  'Department',  // Initialize Department first
  'Triage',
  'User',        // Then User

  'DoctorProfile',
  'Appointment',
  'ProgressNote',   
  'Consent', 
  'DoctorAvailability',
  'TestResult',
  'HealthMetric',
  'Prescription',
  'Medication',
  'PrescriptionMedications',
  'MedicalRecord',
  'LabTest',
  'LabTestTemplate',
  'Laboratory',
  'MedicationInventory',
  'MedicationDispense',
  'StockMovement',
  'Pharmacy',
  'MedicalDocument',
  'DocumentShare',
  'TriageNote',
  'Billing',
  'ConsultationQueue'
];

// Initialize models in order
const initializedModels = modelInitializationOrder.reduce((acc, modelName) => {
  const Model = models[modelName];
  if (!Model) {
    console.warn(`Model ${modelName} not found in models object`);
    return acc;
  }

  try {
    acc[modelName] = initializeModel(Model);
    console.log(`Successfully initialized model: ${modelName}`);
    return acc;
  } catch (error) {
    console.error(`Failed to initialize model ${modelName}:`, error);
    throw error;
  }
}, {});

// Create associations after all models are initialized
Object.keys(initializedModels).forEach(modelName => {
  if (typeof initializedModels[modelName].associate === 'function') {
    try {
      initializedModels[modelName].associate(initializedModels);
      console.log(`Successfully created associations for model: ${modelName}`);
    } catch (error) {
      console.error(`Failed to create associations for model ${modelName}:`, error);
      throw error;
    }
  }
});

Object.keys(initializedModels).forEach(modelName => {
  const model = initializedModels[modelName];
  console.log(`${modelName} associations:`, 
    Object.keys(model.associations || {})
  );
});

module.exports = {
  sequelize,
  ...initializedModels
};