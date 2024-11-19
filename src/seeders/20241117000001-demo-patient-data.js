// src/seeders/20241117000001-demo-patient-data.js
'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, get your user's ID
    const patient = await queryInterface.sequelize.query(
      `SELECT id FROM "Users" WHERE email = 'wambiriisaac@gmail.com'`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const patientId = patient[0]?.id;

    // Get the doctor's ID
    const doctor = await queryInterface.sequelize.query(
      `SELECT id FROM "Users" WHERE email = 'isaacwambiri254@gmail.com'`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const doctorId = doctor[0]?.id;

    if (!patientId || !doctorId) {
      console.log('Required users not found');
      return;
    }

    // Create health metrics
    const healthMetrics = [];
    // Generate last 30 days of health metrics
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Heart rate between 60-100
      healthMetrics.push({
        id: uuidv4(),
        patientId,
        type: 'heartRate',
        value: Math.floor(Math.random() * (100 - 60) + 60),
        date,
        createdAt: date,
        updatedAt: date
      });

      // Blood pressure (systolic) between 110-130
      healthMetrics.push({
        id: uuidv4(),
        patientId,
        type: 'bloodPressure',
        value: Math.floor(Math.random() * (130 - 110) + 110),
        date,
        createdAt: date,
        updatedAt: date
      });

      // Glucose levels between 80-120
      healthMetrics.push({
        id: uuidv4(),
        patientId,
        type: 'glucose',
        value: Math.floor(Math.random() * (120 - 80) + 80),
        date,
        createdAt: date,
        updatedAt: date
      });
    }

    // Create appointments
    const appointmentTypes = ['in-person', 'video'];
    const appointmentStatus = ['pending', 'confirmed', 'completed', 'cancelled'];
    const appointments = [];

    // Generate 5 past appointments
    for (let i = 0; i < 5; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (i * 7)); // One appointment every week in the past
      appointments.push({
        id: uuidv4(),
        patientId,
        doctorId,
        dateTime: date,
        type: appointmentTypes[Math.floor(Math.random() * appointmentTypes.length)],
        status: 'completed',
        reason: 'Regular checkup',
        symptoms: JSON.stringify(['fatigue', 'headache']),
        notes: 'Patient showing good progress',
        diagnosis: 'Mild stress',
        prescription: JSON.stringify([
          { medicine: 'Vitamin C', dosage: '500mg', frequency: 'daily' }
        ]),
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // Generate 3 upcoming appointments
    for (let i = 1; i <= 3; i++) {
      const date = new Date();
      date.setDate(date.getDate() + (i * 7)); // One appointment every week in the future
      appointments.push({
        id: uuidv4(),
        patientId,
        doctorId,
        dateTime: date,
        type: appointmentTypes[Math.floor(Math.random() * appointmentTypes.length)],
        status: 'confirmed',
        reason: 'Follow-up checkup',
        symptoms: JSON.stringify(['none']),
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // Create test results
    const testNames = ['Complete Blood Count', 'Lipid Panel', 'Thyroid Function', 'Liver Function', 'Urinalysis'];
    const testStatus = ['normal', 'perfect', 'needs-attention'];
    const testResults = [];

    for (let i = 0; i < 10; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (i * 3)); // One test result every 3 days
      testResults.push({
        id: uuidv4(),
        patientId,
        doctorId,
        testName: testNames[Math.floor(Math.random() * testNames.length)],
        date,
        result: `${Math.random() * 100 + 50} units`,
        status: testStatus[Math.floor(Math.random() * testStatus.length)],
        comments: 'Regular test results',
        createdAt: date,
        updatedAt: date
      });
    }

    // Insert all the data
    await queryInterface.bulkInsert('HealthMetrics', healthMetrics);
    await queryInterface.bulkInsert('Appointments', appointments);
    await queryInterface.bulkInsert('TestResults', testResults);

    console.log('Seeded test data for patient:', patientId);
  },

  down: async (queryInterface, Sequelize) => {
    // Get the patient ID
    const patient = await queryInterface.sequelize.query(
      `SELECT id FROM "Users" WHERE email = 'wambiriisaac@gmail.com'`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const patientId = patient[0]?.id;

    if (patientId) {
      await queryInterface.bulkDelete('HealthMetrics', { patientId });
      await queryInterface.bulkDelete('Appointments', { patientId });
      await queryInterface.bulkDelete('TestResults', { patientId });
    }
  }
};