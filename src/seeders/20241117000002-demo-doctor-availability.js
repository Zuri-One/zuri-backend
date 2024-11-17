// src/seeders/20241117000002-demo-doctor-availability.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get the doctor's ID
    const doctor = await queryInterface.sequelize.query(
      `SELECT id FROM "Users" WHERE email = 'doctor@zurihealth.com'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (!doctor || !doctor[0]) {
      throw new Error('Doctor user not found');
    }

    const doctorId = doctor[0].id;

    // Create weekly schedule
    const weeklySchedule = {
      monday: [
        { startTime: '09:00', endTime: '12:00', isAvailable: true },
        { startTime: '14:00', endTime: '17:00', isAvailable: true }
      ],
      tuesday: [
        { startTime: '09:00', endTime: '12:00', isAvailable: true },
        { startTime: '14:00', endTime: '17:00', isAvailable: true }
      ],
      wednesday: [
        { startTime: '09:00', endTime: '12:00', isAvailable: true },
        { startTime: '14:00', endTime: '17:00', isAvailable: true }
      ],
      thursday: [
        { startTime: '09:00', endTime: '12:00', isAvailable: true },
        { startTime: '14:00', endTime: '17:00', isAvailable: true }
      ],
      friday: [
        { startTime: '09:00', endTime: '12:00', isAvailable: true },
        { startTime: '14:00', endTime: '17:00', isAvailable: true }
      ]
    };

    return queryInterface.bulkInsert('DoctorAvailabilities', [{
      id: require('uuid').v4(),
      doctorId: doctorId,
      weeklySchedule: JSON.stringify(weeklySchedule),
      exceptions: JSON.stringify([]),
      defaultSlotDuration: 30,
      bufferTime: 5,
      maxDailyAppointments: 16,
      isAcceptingAppointments: true,
      lastUpdated: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }]);
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('DoctorAvailabilities', null, {});
  }
};