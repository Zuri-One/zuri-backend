'use strict';
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const triageNursePassword = await bcrypt.hash('Triage@123', 10);
    
    return queryInterface.bulkInsert('Users', [{
      id: uuidv4(),
      // Required Personal Information
      surname: 'Ms.',
      otherNames: 'Alice Wangari',
      gender: 'FEMALE',
      dateOfBirth: new Date('1992-07-15'),
      
      // Required Contact Information
      email: 'alice.wangari@zurihealth.com',
      telephone1: '254722001002',
      town: 'Nairobi',
      areaOfResidence: 'Imara Daima',
      
      // Required Authentication
      password: triageNursePassword,
      
      // Required Identification
      idType: 'NATIONAL_ID',
      nationality: 'Kenyan',
      
      // Required Role
      role: 'NURSE',
      
      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date()
    }]);
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Users', null, {});
  }
};