'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // First, verify all users in the database
      const allUsers = await queryInterface.sequelize.query(
        `SELECT id, email, role FROM "Users"`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      
      console.log('All users in database:', allUsers);

      // Then try to get the specific doctor
      const doctor = await queryInterface.sequelize.query(
        `SELECT id, email, role FROM "Users" WHERE email = 'isaacwambiri254@gmail.com'`,
        { type: Sequelize.QueryTypes.SELECT }
      );

      console.log('Found doctor:', doctor);

      if (!doctor || !doctor[0]) {
        console.error('Doctor user not found in database');
        return Promise.reject(new Error('Doctor user not found'));
      }

      const doctorId = doctor[0].id;
      console.log('Using doctor ID:', doctorId);

      return queryInterface.bulkInsert('DoctorProfiles', [{
        id: uuidv4(),
        userId: doctorId,
        specialization: 'General Medicine',
        licenseNumber: 'MED123456',
        qualifications: JSON.stringify(['MBBS', 'MD']),
        experience: 10,
        consultationFee: 150.00,
        bio: 'Experienced general physician with over 10 years of practice.',
        languagesSpoken: JSON.stringify(['English', 'Swahili']),
        isAvailableForVideo: true,
        rating: 4.5,
        totalReviews: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }]);
    } catch (error) {
      console.error('Seeder error:', error);
      throw error;
    }
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('DoctorProfiles', null, {});
  }
};