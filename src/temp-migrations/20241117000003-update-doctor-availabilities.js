'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First drop the slots column if it exists
    try {
      await queryInterface.removeColumn('DoctorAvailabilities', 'slots');
    } catch (error) {
      console.log('slots column might not exist:', error.message);
    }

    // Add the new columns
    await queryInterface.addColumn('DoctorAvailabilities', 'weeklySchedule', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {}
    });

    await queryInterface.addColumn('DoctorAvailabilities', 'defaultSlotDuration', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 30
    });

    await queryInterface.addColumn('DoctorAvailabilities', 'bufferTime', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 5
    });

    await queryInterface.addColumn('DoctorAvailabilities', 'maxDailyAppointments', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 16
    });

    await queryInterface.addColumn('DoctorAvailabilities', 'isAcceptingAppointments', {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    });

    await queryInterface.addColumn('DoctorAvailabilities', 'lastUpdated', {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('DoctorAvailabilities', 'weeklySchedule');
    await queryInterface.removeColumn('DoctorAvailabilities', 'defaultSlotDuration');
    await queryInterface.removeColumn('DoctorAvailabilities', 'bufferTime');
    await queryInterface.removeColumn('DoctorAvailabilities', 'maxDailyAppointments');
    await queryInterface.removeColumn('DoctorAvailabilities', 'isAcceptingAppointments');
    await queryInterface.removeColumn('DoctorAvailabilities', 'lastUpdated');
    
    // Add back the original slots column if needed
    await queryInterface.addColumn('DoctorAvailabilities', 'slots', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: []
    });
  }
};