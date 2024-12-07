'use strict';
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // First, handle all dependencies in order
      await queryInterface.sequelize.query(`
        -- Delete related appointments
        DELETE FROM "Appointments" 
        WHERE "doctorId" IN (SELECT id FROM "Users" WHERE role = 'DOCTOR');



        -- Delete related prescriptions
        DELETE FROM "Prescriptions" 
        WHERE "doctorId" IN (SELECT id FROM "Users" WHERE role = 'DOCTOR');

        -- Delete doctor availabilities
        DELETE FROM "DoctorAvailabilities" 
        WHERE "doctorId" IN (SELECT id FROM "Users" WHERE role = 'DOCTOR');

        -- Delete lab tests
        DELETE FROM "LabTests" 
        WHERE "referringDoctorId" IN (SELECT id FROM "Users" WHERE role = 'DOCTOR');



        -- Delete doctor profiles
        DELETE FROM "DoctorProfiles" 
        WHERE "userId" IN (SELECT id FROM "Users" WHERE role = 'DOCTOR');

        -- Finally delete the doctors
        DELETE FROM "Users" WHERE role = 'DOCTOR';
      `);

      // Get department IDs
      const departments = await queryInterface.sequelize.query(
        'SELECT id, code from "Departments";',
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );

      if (!departments.length) {
        throw new Error('No departments found. Please seed departments first.');
      }

      const commonPassword = await bcrypt.hash('20405011006@Ki', 10);
      const timestamp = Date.now();

      // Create doctors data with unique employee IDs
      const doctors = [
        {
          id: uuidv4(),
          name: 'Dr. Isaac Wambiri',
          email: 'isaacwambiri254@gmail.com',
          password: commonPassword,
          role: 'DOCTOR',
          departmentId: departments.find(d => d.code === 'GEN-MED')?.id,
          specialization: ['Internal Medicine', 'Primary Care'],
          employeeId: `DOC${timestamp}1`,
          licenseNumber: `LIC${timestamp}1`,
          contactNumber: '+1234567890',
          gender: 'MALE',
          isActive: true,
          status: 'active',
          expertise: {
            skills: ['General Consultation', 'Preventive Care'],
            certifications: ['Board Certified - Internal Medicine'],
            specialProcedures: ['Basic Life Support']
          },
          dutySchedule: {
            monday: { shifts: ['MORNING'], hours: '9:00-17:00' },
            tuesday: { shifts: ['MORNING'], hours: '9:00-17:00' },
            wednesday: { shifts: ['MORNING'], hours: '9:00-17:00' },
            thursday: { shifts: ['MORNING'], hours: '9:00-17:00' },
            friday: { shifts: ['MORNING'], hours: '9:00-17:00' }
          },
          qualification: ['MD', 'MBBS', 'Internal Medicine Board Certified'],
          workSchedule: {
            regularHours: {
              start: '09:00',
              end: '17:00'
            },
            maxPatientsPerDay: 16,
            slotDuration: 30
          },
          joiningDate: new Date('2023-01-01'),
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: uuidv4(),
          name: 'Dr. Isaac W',
          email: 'isaacw@identifyafrica.io',
          password: commonPassword,
          role: 'DOCTOR',
          departmentId: departments.find(d => d.code === 'PED')?.id,
          specialization: ['Pediatrics', 'Pediatric Emergency'],
          employeeId: `DOC${timestamp}2`,
          licenseNumber: `LIC${timestamp}2`,
          contactNumber: '+1234567892',
          gender: 'MALE',
          isActive: true,
          status: 'active',
          expertise: {
            skills: ['Pediatric Care', 'Emergency Pediatrics'],
            certifications: ['Pediatrics Board Certified'],
            specialProcedures: ['Pediatric Emergency Care']
          },
          dutySchedule: {
            monday: { shifts: ['MORNING'], hours: '9:00-17:00' },
            tuesday: { shifts: ['MORNING'], hours: '9:00-17:00' },
            wednesday: { shifts: ['MORNING'], hours: '9:00-17:00' },
            thursday: { shifts: ['MORNING'], hours: '9:00-17:00' },
            friday: { shifts: ['MORNING'], hours: '9:00-17:00' }
          },
          qualification: ['MD', 'Pediatrics Board Certified'],
          workSchedule: {
            regularHours: {
              start: '09:00',
              end: '17:00'
            },
            maxPatientsPerDay: 20,
            slotDuration: 25
          },
          joiningDate: new Date('2023-03-01'),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      // Convert JSONB fields to strings for each doctor
      const doctorsFormatted = doctors.map(doctor => ({
        ...doctor,
        expertise: JSON.stringify(doctor.expertise),
        dutySchedule: JSON.stringify(doctor.dutySchedule),
        qualification: JSON.stringify(doctor.qualification),
        workSchedule: JSON.stringify(doctor.workSchedule)
      }));

      // Bulk insert doctors
      await queryInterface.bulkInsert('Users', doctorsFormatted, {});

      // Create and insert doctor availability data
      const doctorAvailability = doctors.map(doctor => ({
        id: uuidv4(),
        doctorId: doctor.id,
        weeklySchedule: JSON.stringify({
          monday: {
            isAvailable: true,
            slots: [
              { start: '09:00', end: '13:00' },
              { start: '14:00', end: '17:00' }
            ]
          },
          tuesday: {
            isAvailable: true,
            slots: [
              { start: '09:00', end: '13:00' },
              { start: '14:00', end: '17:00' }
            ]
          },
          wednesday: {
            isAvailable: true,
            slots: [
              { start: '09:00', end: '13:00' },
              { start: '14:00', end: '17:00' }
            ]
          },
          thursday: {
            isAvailable: true,
            slots: [
              { start: '09:00', end: '13:00' },
              { start: '14:00', end: '17:00' }
            ]
          },
          friday: {
            isAvailable: true,
            slots: [
              { start: '09:00', end: '13:00' },
              { start: '14:00', end: '17:00' }
            ]
          }
        }),
        defaultSlotDuration: 30,
        bufferTime: 10,
        maxDailyAppointments: 16,
        isAcceptingAppointments: true,
        exceptions: JSON.stringify([]),
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      await queryInterface.bulkInsert('DoctorAvailabilities', doctorAvailability, {});

      console.log('Doctors and availabilities seeded successfully');
    } catch (error) {
      console.error('Error details:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      const doctorEmails = [
        'isaacwambiri254@gmail.com',
        'isaacw@identifyafrica.io'
      ];

      await queryInterface.sequelize.query(`
        -- Get doctor IDs
        WITH doctor_ids AS (
          SELECT id FROM "Users" WHERE email IN (:emails)
        )
        -- Delete in proper order
        BEGIN;
          DELETE FROM "Appointments" WHERE "doctorId" IN (SELECT id FROM doctor_ids);
          DELETE FROM "MedicalRecords" WHERE "practitionerId" IN (SELECT id FROM doctor_ids);
          DELETE FROM "Prescriptions" WHERE "doctorId" IN (SELECT id FROM doctor_ids);
          DELETE FROM "DoctorAvailabilities" WHERE "doctorId" IN (SELECT id FROM doctor_ids);
          DELETE FROM "LabTests" WHERE "referringDoctorId" IN (SELECT id FROM doctor_ids);
          DELETE FROM "ProgressNotes" WHERE "createdBy" IN (SELECT id FROM doctor_ids);
          DELETE FROM "DoctorProfiles" WHERE "userId" IN (SELECT id FROM doctor_ids);
          DELETE FROM "Users" WHERE id IN (SELECT id FROM doctor_ids);
        COMMIT;
      `, {
        replacements: { emails: doctorEmails }
      });

      console.log('Doctors and related records removed successfully');
    } catch (error) {
      console.error('Down migration error:', error);
      throw error;
    }
  }
};