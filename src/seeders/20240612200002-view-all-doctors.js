'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('\n=== Current Doctors in System ===\n');

    const doctors = await queryInterface.sequelize.query(`
      SELECT 
        id,
        name,
        email,
        role,
        employeeId,
        licenseNumber,
        departmentId,
        gender,
        status,
        specialization,
        contactNumber,
        isActive,
        qualification,
        joiningDate,
        createdAt
      FROM "Users"
      WHERE role = 'DOCTOR';
    `, { type: queryInterface.sequelize.QueryTypes.SELECT });

    if (doctors.length === 0) {
      console.log('No doctors found in the system.');
    } else {
      doctors.forEach((doctor, index) => {
        console.log(`\nDoctor ${index + 1}:`);
        console.log('------------------------');
        Object.entries(doctor).forEach(([key, value]) => {
          if (value !== null) {
            console.log(`${key}: ${value}`);
          }
        });
      });
    }

    console.log('\n=== End of Doctor List ===\n');
  },

  down: async () => {
    // This migration is read-only
  }
};