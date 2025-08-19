#!/usr/bin/env node

require('dotenv').config();
const { Patient, sequelize } = require('../src/models');

async function testPatientCreation() {
  console.log('=== Testing Patient Creation ===');
  
  const transaction = await sequelize.transaction();
  
  try {
    console.log('1. Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection OK');
    
    console.log('2. Checking existing patients...');
    const existingCount = await Patient.count({ transaction });
    console.log(`✅ Found ${existingCount} existing patients`);
    
    console.log('3. Generating unique phone...');
    const phone = `+254700${Math.floor(Math.random() * 900000) + 100000}`;
    console.log(`✅ Generated phone: ${phone}`);
    
    console.log('4. Checking phone uniqueness...');
    const phoneExists = await Patient.findOne({
      where: { telephone1: phone },
      transaction
    });
    console.log(`✅ Phone unique: ${!phoneExists}`);
    
    console.log('5. Generating patient number...');
    const lastPatient = await Patient.findOne({
      where: { patientNumber: { [require('sequelize').Op.like]: 'ZH%' } },
      order: [['patientNumber', 'DESC']],
      transaction
    });
    const patientNumber = lastPatient ? 
      `ZH${(parseInt(lastPatient.patientNumber.replace('ZH', '')) + 1).toString().padStart(6, '0')}` : 
      'ZH000001';
    console.log(`✅ Generated patient number: ${patientNumber}`);
    
    console.log('6. Creating minimal patient data...');
    const patientData = {
      patientNumber,
      surname: 'TEST',
      otherNames: 'PATIENT',
      sex: 'FEMALE',
      dateOfBirth: new Date('1990-01-01'),
      telephone1: phone,
      residence: 'Test Location',
      town: 'Test Town',
      nationality: 'Kenyan',
      occupation: 'Test',
      idType: 'NATIONAL_ID',
      idNumber: `TEST-${Date.now()}`,
      isCCPEnrolled: false,
      status: 'WAITING',
      paymentScheme: { type: 'CASH', provider: null },
      isActive: true
    };
    
    console.log('7. Patient data to create:');
    console.log(JSON.stringify(patientData, null, 2));
    
    console.log('8. Creating patient...');
    const startTime = Date.now();
    
    const patient = await Patient.create(patientData, { 
      transaction,
      logging: (sql, timing) => {
        console.log(`SQL: ${sql}`);
        if (timing) console.log(`Timing: ${timing}ms`);
      }
    });
    
    const endTime = Date.now();
    console.log(`✅ Patient created successfully in ${endTime - startTime}ms`);
    console.log(`Patient ID: ${patient.id}`);
    console.log(`Patient Number: ${patient.patientNumber}`);
    
    console.log('9. Committing transaction...');
    await transaction.commit();
    console.log('✅ Transaction committed');
    
    console.log('10. Verifying patient exists...');
    const verifyPatient = await Patient.findByPk(patient.id);
    console.log(`✅ Patient verified: ${!!verifyPatient}`);
    
  } catch (error) {
    console.error('❌ Error occurred:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
    
    if (error.sql) {
      console.error('SQL that failed:', error.sql);
    }
    
    if (error.parameters) {
      console.error('SQL parameters:', error.parameters);
    }
    
    try {
      await transaction.rollback();
      console.log('✅ Transaction rolled back');
    } catch (rollbackError) {
      console.error('❌ Rollback failed:', rollbackError.message);
    }
  } finally {
    await sequelize.close();
    console.log('✅ Database connection closed');
  }
}

if (require.main === module) {
  testPatientCreation().catch(console.error);
}