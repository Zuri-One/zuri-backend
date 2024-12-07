'use strict';
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const hashedPassword = await bcrypt.hash('20405011006@Ki', 10);
    const adminPassword = await bcrypt.hash('Admin@123', 10);
    
    return queryInterface.bulkInsert('Users', [
      {
        id: uuidv4(),
        name: 'Dr. Isaac',
        email: 'isaacwambiri254@gmail.com',  // This was the email we wanted
        password: hashedPassword,
        role: 'DOCTOR',
        isEmailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        name: 'System Admin',
        email: 'admin@zurihealth.com',
        password: adminPassword,
        role: 'admin',
        isEmailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Users', null, {});
  }
};