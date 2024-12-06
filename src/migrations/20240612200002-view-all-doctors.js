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
        "employeeId",
        "licenseNumber",
        "departmentId",
        gender,
        status,
        specialization,
        "contactNumber",
        "isActive",
        qualification,
        expertise,
        "dutySchedule",
        "workSchedule",
        "joiningDate",
        "createdAt"
      FROM "Users"
      WHERE role::text IN ('DOCTOR', 'doctor');
    `, { type: queryInterface.sequelize.QueryTypes.SELECT });

    if (doctors.length === 0) {
      console.log('No doctors found in the system.');
    } else {
      doctors.forEach((doctor, index) => {
        console.log(`\nDoctor ${index + 1}:`);
        console.log('------------------------');
        Object.entries(doctor).forEach(([key, value]) => {
          if (value !== null) {
            if (typeof value === 'object') {
              console.log(`${key}:`);
              console.log(JSON.stringify(value, null, 2));
            } else {
              console.log(`${key}: ${value}`);
            }
          }
        });
      });
    }

    console.log('\n=== End of Doctor List ===\n');
    
    return Promise.resolve();
  },

  down: async () => {
    // This migration is read-only
  }
};