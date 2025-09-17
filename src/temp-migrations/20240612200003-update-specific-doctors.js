'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const timestamp = Date.now();
    
    // Update Dr. Isaac's record
    await queryInterface.sequelize.query(`
      UPDATE "Users"
      SET 
        "employeeId" = 'DOC${timestamp}1',
        "licenseNumber" = 'LIC${timestamp}1',
        "departmentId" = (SELECT id FROM "Departments" WHERE code = 'GEN-MED'),
        specialization = ARRAY['Internal Medicine', 'Primary Care']::text[],
        expertise = :expertise,
        "dutySchedule" = :dutySchedule,
        "workSchedule" = :workSchedule,
        qualification = :qualification
      WHERE email = 'isaacwambiri254@gmail.com'
    `, {
      replacements: {
        expertise: JSON.stringify({
          skills: ['General Consultation', 'Preventive Care'],
          certifications: ['Board Certified - Internal Medicine'],
          specialProcedures: ['Basic Life Support']
        }),
        dutySchedule: JSON.stringify({
          monday: { shifts: ['MORNING'], hours: '9:00-17:00' },
          tuesday: { shifts: ['MORNING'], hours: '9:00-17:00' },
          wednesday: { shifts: ['MORNING'], hours: '9:00-17:00' },
          thursday: { shifts: ['MORNING'], hours: '9:00-17:00' },
          friday: { shifts: ['MORNING'], hours: '9:00-17:00' }
        }),
        workSchedule: JSON.stringify({
          regularHours: { start: '09:00', end: '17:00' },
          maxPatientsPerDay: 16,
          slotDuration: 30
        }),
        qualification: JSON.stringify(['MD', 'MBBS', 'Internal Medicine Board Certified'])
      }
    });

    // Update Wambiri's record
    await queryInterface.sequelize.query(`
      UPDATE "Users"
      SET 
        "employeeId" = 'DOC${timestamp}2',
        "licenseNumber" = 'LIC${timestamp}2',
        "departmentId" = (SELECT id FROM "Departments" WHERE code = 'PED'),
        specialization = ARRAY['Pediatrics', 'Pediatric Emergency']::text[],
        expertise = :expertise,
        "dutySchedule" = :dutySchedule,
        "workSchedule" = :workSchedule,
        qualification = :qualification
      WHERE email = 'isaacw@identifyafrica.io'
    `, {
      replacements: {
        expertise: JSON.stringify({
          skills: ['Pediatric Care', 'Emergency Pediatrics'],
          certifications: ['Pediatrics Board Certified'],
          specialProcedures: ['Pediatric Emergency Care']
        }),
        dutySchedule: JSON.stringify({
          monday: { shifts: ['MORNING'], hours: '9:00-17:00' },
          tuesday: { shifts: ['MORNING'], hours: '9:00-17:00' },
          wednesday: { shifts: ['MORNING'], hours: '9:00-17:00' },
          thursday: { shifts: ['MORNING'], hours: '9:00-17:00' },
          friday: { shifts: ['MORNING'], hours: '9:00-17:00' }
        }),
        workSchedule: JSON.stringify({
          regularHours: { start: '09:00', end: '17:00' },
          maxPatientsPerDay: 20,
          slotDuration: 25
        }),
        qualification: JSON.stringify(['MD', 'Pediatrics Board Certified'])
      }
    });

    console.log('Doctors updated successfully with unique IDs');
  },

  down: async (queryInterface, Sequelize) => {
    // Revert changes if needed
    await queryInterface.sequelize.query(`
      UPDATE "Users"
      SET 
        "employeeId" = NULL,
        "licenseNumber" = NULL,
        "departmentId" = NULL,
        specialization = NULL,
        expertise = '{}',
        "dutySchedule" = '{}',
        "workSchedule" = '{}',
        qualification = '[]'
      WHERE email IN ('isaacwambiri254@gmail.com', 'isaacw@identifyafrica.io')
    `);
  }
};