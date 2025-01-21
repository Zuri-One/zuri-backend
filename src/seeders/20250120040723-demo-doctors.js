'use strict';
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const standardPassword = await bcrypt.hash('Doctor@123', 10);
    
    const doctors = [
      // Cardiology Doctor
      {
        id: uuidv4(),
        surname: 'Dr.',
        otherNames: 'James Maina',
        gender: 'MALE',
        dateOfBirth: new Date('1980-03-15'),
        email: 'james.maina@zurihealth.com',
        telephone1: '254722100101',
        town: 'Nairobi',
        areaOfResidence: 'Kilimani',
        password: standardPassword,
        idType: 'NATIONAL_ID',
        idNumber: '12345678',
        nationality: 'Kenyan',
        role: 'DOCTOR',
        departmentId: '70c1bd18-60cb-4dde-8f27-2e01ecd783b5', // Cardiology
        specialization: ['Cardiology', 'Internal Medicine'],
        licenseNumber: 'KMD-C-2010-001',
        staffId: 'DOC-CARD-001',
        employeeId: 'EMP-001',
        designation: 'Senior Cardiologist',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      
      // Emergency Doctor
      {
        id: uuidv4(),
        surname: 'Dr.',
        otherNames: 'Peter Otieno',
        gender: 'MALE',
        dateOfBirth: new Date('1988-11-30'),
        email: 'peter.otieno@zurihealth.com',
        telephone1: '254722100102',
        town: 'Nairobi',
        areaOfResidence: 'South B',
        password: standardPassword,
        idType: 'NATIONAL_ID',
        idNumber: '23456789',
        nationality: 'Kenyan',
        role: 'DOCTOR',
        departmentId: 'f97a7b50-2aec-445c-a4fe-dd2b571a527e', // Emergency
        specialization: ['Emergency Medicine'],
        licenseNumber: 'KMD-E-2015-002',
        staffId: 'DOC-EMERG-001',
        employeeId: 'EMP-002',
        designation: 'Emergency Physician',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Neurology Doctor
      {
        id: uuidv4(),
        surname: 'Dr.',
        otherNames: 'Lucy Waithera',
        gender: 'FEMALE',
        dateOfBirth: new Date('1985-08-22'),
        email: 'lucy.waithera@zurihealth.com',
        telephone1: '254722100103',
        town: 'Nairobi',
        areaOfResidence: 'Westlands',
        password: standardPassword,
        idType: 'NATIONAL_ID',
        idNumber: '34567890',
        nationality: 'Kenyan',
        role: 'DOCTOR',
        departmentId: '65e870d2-bd4a-4904-aede-04c3ea7690c6', // Neurology
        specialization: ['Neurology'],
        licenseNumber: 'KMD-N-2012-003',
        staffId: 'DOC-NEUR-001',
        employeeId: 'EMP-003',
        designation: 'Neurologist',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Pediatrics Doctor
      {
        id: uuidv4(),
        surname: 'Dr.',
        otherNames: 'Grace Wambui',
        gender: 'FEMALE',
        dateOfBirth: new Date('1983-04-18'),
        email: 'grace.wambui@zurihealth.com',
        telephone1: '254722100104',
        town: 'Nairobi',
        areaOfResidence: 'Lavington',
        password: standardPassword,
        idType: 'NATIONAL_ID',
        idNumber: '45678901',
        nationality: 'Kenyan',
        role: 'DOCTOR',
        departmentId: '6c7e60c1-c540-4726-8eb7-c4574f117369', // Pediatrics
        specialization: ['Pediatrics'],
        licenseNumber: 'KMD-P-2011-004',
        staffId: 'DOC-PED-001',
        employeeId: 'EMP-004',
        designation: 'Senior Pediatrician',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Orthopedics Doctor
      {
        id: uuidv4(),
        surname: 'Dr.',
        otherNames: 'Samuel Kipruto',
        gender: 'MALE',
        dateOfBirth: new Date('1982-09-25'),
        email: 'samuel.kipruto@zurihealth.com',
        telephone1: '254722100105',
        town: 'Nairobi',
        areaOfResidence: 'Karen',
        password: standardPassword,
        idType: 'NATIONAL_ID',
        idNumber: '56789012',
        nationality: 'Kenyan',
        role: 'DOCTOR',
        departmentId: 'a68d8452-a40b-404e-b552-3815e5748808', // Orthopedics
        specialization: ['Orthopedics', 'Sports Medicine'],
        licenseNumber: 'KMD-O-2013-005',
        staffId: 'DOC-ORTH-001',
        employeeId: 'EMP-005',
        designation: 'Orthopedic Surgeon',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    return queryInterface.bulkInsert('Users', doctors);
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Users', null, {});
  }
};