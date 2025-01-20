'use strict';
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const receptionistPassword = await bcrypt.hash('Reception@123', 10);
    
    return queryInterface.bulkInsert('Users', [{
      id: uuidv4(),
      // Required Personal Information
      surname: 'Ms.',
      otherNames: 'Sarah Njeri',
      gender: 'FEMALE',
      dateOfBirth: new Date('1995-05-15'),
      
      // Required Contact Information
      email: 'sarah.njeri@zurihealth.com',
      telephone1: '254722001001',
      town: 'Nairobi',
      areaOfResidence: 'South B',
      
      // Required Authentication
      password: receptionistPassword,
      
      // Required Identification
      idType: 'NATIONAL_ID',
      nationality: 'Kenyan',
      
      // Required Role
      role: 'RECEPTIONIST',
      
      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date()
    }]);
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Users', null, {});
  }
};