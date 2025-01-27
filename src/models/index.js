// src/models/index.js
const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');
const path = require('path');

// Import all models
const models = {
  Department: require(path.join(__dirname, 'department.model')),
  User: require(path.join(__dirname, 'user.model')),
  Patient: require(path.join(__dirname, 'patient.model')),
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
  DepartmentQueue: require(path.join(__dirname, 'department-queue.model')),
  Examination: require(path.join(__dirname, 'examination.model')),
};

// Enhanced initialization function that supports multiple patterns
const initializeModel = (Model) => {
  try {
    // Log the initialization attempt
    console.log(`Attempting to initialize model: ${Model.name}`);
    
    // For models using initModel pattern (like Medication)
    if (typeof Model.initModel === 'function') {
      console.log(`Using initModel pattern for ${Model.name}`);
      return Model.initModel(sequelize);
    }
    
    // For models using MedicalDocument's initialize pattern
    if (typeof Model.initialize === 'function') {
      console.log(`Using initialize pattern for ${Model.name}`);
      return Model.initialize(sequelize);
    }
    
    // For models using schema pattern
    if (Model.schema) {
      console.log(`Using schema pattern for ${Model.name}`);
      return Model.init(Model.schema, { 
        sequelize,
        modelName: Model.name,
        timestamps: true,
        paranoid: false
      });
    }

    // For traditional Sequelize models using init
    if (typeof Model.init === 'function') {
      console.log(`Using traditional init pattern for ${Model.name}`);
      return Model.init(Model.getAttributes(), {
        sequelize,
        modelName: Model.name
      });
    }

    // If no valid initialization pattern is found
    throw new Error(`Model ${Model.name} does not have a valid initialization pattern`);
  } catch (error) {
    console.error(`Error initializing model ${Model.name}:`, error);
    throw error;
  }
};

// Specific initialization order to handle dependencies
const modelInitializationOrder = [
  'Department',
  'Triage',
  'User',
  'Patient',
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
  'StockMovement',
  'Pharmacy',
  'MedicalDocument',
  'DocumentShare',
  'TriageNote',
  'Billing',
  'ConsultationQueue',
  'DepartmentQueue',
  'Examination'
];

// Initialize models in order with enhanced error handling
const initializedModels = modelInitializationOrder.reduce((acc, modelName) => {
  const Model = models[modelName];
  if (!Model) {
    console.warn(`Model ${modelName} not found in models object`);
    return acc;
  }

  try {
    // Initialize the model
    acc[modelName] = initializeModel(Model);
    
    // Verify initialization
    if (!acc[modelName]) {
      throw new Error(`Model ${modelName} initialization returned null or undefined`);
    }

    // Log successful initialization and available attributes
    console.log(`Successfully initialized model: ${modelName}`);
    console.log(`${modelName} attributes:`, 
      Object.keys(acc[modelName].rawAttributes || {}));
    
    return acc;
  } catch (error) {
    console.error(`Failed to initialize model ${modelName}:`, error);
    throw error;
  }
}, {});


Object.keys(initializedModels).forEach(modelName => {
  if (typeof initializedModels[modelName].associate === 'function') {
    try {
      initializedModels[modelName].associate(initializedModels);
      console.log(`Successfully created associations for model: ${modelName}`);
      
      // Log the associations
      console.log(`${modelName} associations:`, 
        Object.keys(initializedModels[modelName].associations || {}));
    } catch (error) {
      console.error(`Failed to create associations for model ${modelName}:`, error);
      throw error;
    }
  }
});

// Add sequelize instance
initializedModels.sequelize = sequelize;

// Final verification of initialized models
Object.keys(initializedModels).forEach(modelName => {
  if (modelName !== 'sequelize') {
    const model = initializedModels[modelName];
    if (!model || !model.rawAttributes) {
      console.warn(`Warning: Model ${modelName} may not be properly initialized`);
    }
  }
});

module.exports = initializedModels;