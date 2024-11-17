// src/seeders/20241117000001-demo-doctor-profiles.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, get the doctor's ID
    const doctor = await queryInterface.sequelize.query(
      `SELECT id FROM "Users" WHERE email = 'doctor@zurihealth.com'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (!doctor || !doctor[0]) {
      throw new Error('Doctor user not found');
    }

    const doctorId = doctor[0].id;

    return queryInterface.bulkInsert('DoctorProfiles', [{
      id: require('uuid').v4(),
      userId: doctorId,
      specialization: 'General Medicine',
      licenseNumber: 'MED123456',
      qualifications: JSON.stringify(['MBBS', 'MD']),
      experience: 10,
      consultationFee: 150.00,
      bio: 'Experienced general physician with over 10 years of practice.',
      languagesSpoken: JSON.stringify(['English', 'Spanish']),
      isAvailableForVideo: true,
      rating: 4.5,
      totalReviews: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }]);
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('DoctorProfiles', null, {});
  }
};