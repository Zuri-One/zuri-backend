'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get the doctor's ID
    const doctor = await queryInterface.sequelize.query(
      `SELECT id FROM "Users" WHERE email = 'isaacwambiri254@gmail.com'`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (!doctor || !doctor[0]) {
      console.error('Doctor user not found');
      return Promise.reject(new Error('Doctor user not found'));
    }

    const doctorId = doctor[0].id;

    // Create weekly schedule
    const weeklySchedule = {
      monday: [
        { startTime: '09:00', endTime: '12:00', isAvailable: true, slotDuration: 30 },
        { startTime: '14:00', endTime: '17:00', isAvailable: true, slotDuration: 30 }
      ],
      tuesday: [
        { startTime: '09:00', endTime: '12:00', isAvailable: true, slotDuration: 30 },
        { startTime: '14:00', endTime: '17:00', isAvailable: true, slotDuration: 30 }
      ],
      wednesday: [
        { startTime: '09:00', endTime: '12:00', isAvailable: true, slotDuration: 30 },
        { startTime: '14:00', endTime: '17:00', isAvailable: true, slotDuration: 30 }
      ],
      thursday: [
        { startTime: '09:00', endTime: '12:00', isAvailable: true, slotDuration: 30 },
        { startTime: '14:00', endTime: '17:00', isAvailable: true, slotDuration: 30 }
      ],
      friday: [
        { startTime: '09:00', endTime: '12:00', isAvailable: true, slotDuration: 30 },
        { startTime: '14:00', endTime: '17:00', isAvailable: true, slotDuration: 30 }
      ]
    };

    return queryInterface.bulkInsert('DoctorAvailabilities', [{
      id: uuidv4(),
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