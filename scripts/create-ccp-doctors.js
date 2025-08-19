#!/usr/bin/env node

const { User, DoctorProfile, sequelize } = require('../src/models');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const log = (message, data = null) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    service: 'ccp-doctors-setup',
    message
  };
  
  if (data) {
    logEntry.data = data;
  }
  
  console.log(JSON.stringify(logEntry));
};

async function createCCPDoctors() {
  const transaction = await sequelize.transaction();
  
  try {
    log('Starting CCP doctors creation');
    
    const standardPassword = await bcrypt.hash('Doctor@123', 10);
    
    const ccpDoctors = [
      {
        id: uuidv4(),
        surname: 'Nyaka',
        otherNames: 'Georgina',
        gender: 'FEMALE',
        dateOfBirth: new Date('1985-06-15'),
        email: 'georgina.nyaka@zurihealth.com',
        telephone1: '+254722200001',
        town: 'Nairobi',
        areaOfResidence: 'Westlands',
        password: standardPassword,
        idType: 'NATIONAL_ID',
        idNumber: 'CCP001',
        nationality: 'Kenyan',
        role: 'DOCTOR',
        specialization: ['Chronic Care', 'Internal Medicine'],
        licenseNumber: 'KMD-CCP-2015-001',
        staffId: 'DOC-CCP-001',
        employeeId: 'CCP-001',
        designation: 'CCP Specialist',
        isActive: true
      },
      {
        id: uuidv4(),
        surname: 'Mwangi',
        otherNames: 'Antony',
        gender: 'MALE',
        dateOfBirth: new Date('1982-03-22'),
        email: 'antony.mwangi@zurihealth.com',
        telephone1: '+254722200002',
        town: 'Nairobi',
        areaOfResidence: 'Kilimani',
        password: standardPassword,
        idType: 'NATIONAL_ID',
        idNumber: 'CCP002',
        nationality: 'Kenyan',
        role: 'DOCTOR',
        specialization: ['Chronic Care', 'Family Medicine'],
        licenseNumber: 'KMD-CCP-2016-002',
        staffId: 'DOC-CCP-002',
        employeeId: 'CCP-002',
        designation: 'CCP Specialist',
        isActive: true
      },
      {
        id: uuidv4(),
        surname: 'Wanjiku',
        otherNames: 'Esther',
        gender: 'FEMALE',
        dateOfBirth: new Date('1988-11-08'),
        email: 'esther.wanjiku@zurihealth.com',
        telephone1: '+254722200003',
        town: 'Nairobi',
        areaOfResidence: 'Karen',
        password: standardPassword,
        idType: 'NATIONAL_ID',
        idNumber: 'CCP003',
        nationality: 'Kenyan',
        role: 'DOCTOR',
        specialization: ['Chronic Care', 'Preventive Medicine'],
        licenseNumber: 'KMD-CCP-2017-003',
        staffId: 'DOC-CCP-003',
        employeeId: 'CCP-003',
        designation: 'CCP Specialist',
        isActive: true
      }
    ];

    let createdCount = 0;
    let updatedCount = 0;

    for (const doctorData of ccpDoctors) {
      // Check if doctor already exists
      const existingDoctor = await User.findOne({
        where: {
          email: doctorData.email
        },
        transaction
      });

      if (existingDoctor) {
        // Update existing doctor
        await existingDoctor.update({
          surname: doctorData.surname,
          otherNames: doctorData.otherNames,
          specialization: doctorData.specialization,
          designation: doctorData.designation,
          isActive: true
        }, { transaction });
        
        log(`Updated existing doctor: ${doctorData.otherNames} ${doctorData.surname}`, {
          id: existingDoctor.id,
          email: doctorData.email
        });
        updatedCount++;
      } else {
        // Create new doctor
        const newDoctor = await User.create(doctorData, { transaction });
        
        // Create doctor profile if it doesn't exist
        const existingProfile = await DoctorProfile.findOne({
          where: { userId: newDoctor.id },
          transaction
        });

        if (!existingProfile) {
          await DoctorProfile.create({
            id: uuidv4(),
            userId: newDoctor.id,
            specialization: doctorData.specialization,
            licenseNumber: doctorData.licenseNumber,
            yearsOfExperience: Math.floor(Math.random() * 15) + 5,
            education: ['MBCHB', 'Chronic Care Certification'],
            consultationFee: 2000,
            isAvailable: true,
            bio: `Specialist in Chronic Care Program with focus on patient follow-up and medication management.`,
            languages: ['English', 'Swahili']
          }, { transaction });
        }
        
        log(`Created new doctor: ${doctorData.otherNames} ${doctorData.surname}`, {
          id: newDoctor.id,
          email: doctorData.email
        });
        createdCount++;
      }
    }

    await transaction.commit();
    
    log('CCP doctors setup completed successfully', {
      created: createdCount,
      updated: updatedCount,
      total: ccpDoctors.length
    });

    console.log('\n✅ CCP Doctors Setup Complete!');
    console.log(`📊 Created: ${createdCount}, Updated: ${updatedCount}`);
    console.log('\n👨‍⚕️ CCP Doctors:');
    console.log('1. Dr. Georgina Nyaka - georgina.nyaka@zurihealth.com');
    console.log('2. Dr. Antony Mwangi - antony.mwangi@zurihealth.com');
    console.log('3. Dr. Esther Wanjiku - esther.wanjiku@zurihealth.com');
    console.log('\n🔑 Default Password: Doctor@123');
    
    process.exit(0);

  } catch (error) {
    await transaction.rollback();
    log('CCP doctors setup failed', { error: error.message });
    console.error('❌ Error creating CCP doctors:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  createCCPDoctors();
}

module.exports = { createCCPDoctors };