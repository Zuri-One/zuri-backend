'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const departments = [
      {
        id: uuidv4(),
        name: 'General Medicine',
        code: 'GEN-MED',
        type: 'CLINICAL',
        status: 'ACTIVE',
        specialties: ['Internal Medicine', 'Primary Care'],
        description: 'General medical consultations and primary care services',
        location: {
          building: 'Main Building',
          floor: '1',
          wing: 'East',
          roomNumbers: ['101', '102', '103'],
          waitingArea: 'EA-1',
          nursingStation: 'ENS-1'
        },
        operatingHours: {
          monday: { isOpen: true, start: '09:00', end: '17:00', breaks: [] },
          tuesday: { isOpen: true, start: '09:00', end: '17:00', breaks: [] },
          wednesday: { isOpen: true, start: '09:00', end: '17:00', breaks: [] },
          thursday: { isOpen: true, start: '09:00', end: '17:00', breaks: [] },
          friday: { isOpen: true, start: '09:00', end: '17:00', breaks: [] },
          saturday: { isOpen: false, start: '', end: '', breaks: [] },
          sunday: { isOpen: false, start: '', end: '', breaks: [] }
        },
        capacity: {
          maxPatients: 50,
          maxDoctors: 5,
          maxNurses: 10,
          consultationRooms: 3,
          waitingAreaCapacity: 20
        },
        contactInfo: {
          mainExtension: '1001',
          emergencyExtension: '1991',
          nurseStation: '1002',
          email: 'genmed@hospital.com',
          fax: '1003',
          internalPaging: '1004'
        },
        isActive: true,
        metrics: {
          averageWaitTime: 30,
          patientSatisfaction: 4.5,
          utilizationRate: 75,
          avgConsultationTime: 20
        },
        appointmentSettings: {
          allowsWalkIn: true,
          slotDuration: 20,
          bufferTime: 5,
          maxDailyAppointments: 40,
          scheduling: {
            advance: 30,
            cancelation: 24
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        name: 'Pediatrics',
        code: 'PED',
        type: 'CLINICAL',
        status: 'ACTIVE',
        specialties: ['General Pediatrics', 'Pediatric Primary Care'],
        description: 'Comprehensive pediatric care services',
        location: {
          building: 'Main Building',
          floor: '2',
          wing: 'West',
          roomNumbers: ['201', '202', '203'],
          waitingArea: 'WA-2',
          nursingStation: 'WNS-2'
        },
        operatingHours: {
          monday: { isOpen: true, start: '09:00', end: '17:00', breaks: [] },
          tuesday: { isOpen: true, start: '09:00', end: '17:00', breaks: [] },
          wednesday: { isOpen: true, start: '09:00', end: '17:00', breaks: [] },
          thursday: { isOpen: true, start: '09:00', end: '17:00', breaks: [] },
          friday: { isOpen: true, start: '09:00', end: '17:00', breaks: [] },
          saturday: { isOpen: false, start: '', end: '', breaks: [] },
          sunday: { isOpen: false, start: '', end: '', breaks: [] }
        },
        capacity: {
          maxPatients: 40,
          maxDoctors: 4,
          maxNurses: 8,
          consultationRooms: 3,
          waitingAreaCapacity: 15
        },
        contactInfo: {
          mainExtension: '2001',
          emergencyExtension: '2991',
          nurseStation: '2002',
          email: 'pediatrics@hospital.com',
          fax: '2003',
          internalPaging: '2004'
        },
        isActive: true,
        metrics: {
          averageWaitTime: 25,
          patientSatisfaction: 4.7,
          utilizationRate: 70,
          avgConsultationTime: 25
        },
        appointmentSettings: {
          allowsWalkIn: true,
          slotDuration: 25,
          bufferTime: 5,
          maxDailyAppointments: 35,
          scheduling: {
            advance: 30,
            cancelation: 24
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        name: 'Cardiology',
        code: 'CARD',
        type: 'CLINICAL',
        status: 'ACTIVE',
        specialties: ['Cardiology', 'Cardiovascular Medicine'],
        description: 'Specialized cardiac care and consultations',
        location: {
          building: 'Main Building',
          floor: '3',
          wing: 'North',
          roomNumbers: ['301', '302', '303'],
          waitingArea: 'NA-3',
          nursingStation: 'NNS-3'
        },
        operatingHours: {
          monday: { isOpen: true, start: '09:00', end: '17:00', breaks: [] },
          tuesday: { isOpen: true, start: '09:00', end: '17:00', breaks: [] },
          wednesday: { isOpen: true, start: '09:00', end: '17:00', breaks: [] },
          thursday: { isOpen: true, start: '09:00', end: '17:00', breaks: [] },
          friday: { isOpen: true, start: '09:00', end: '17:00', breaks: [] },
          saturday: { isOpen: false, start: '', end: '', breaks: [] },
          sunday: { isOpen: false, start: '', end: '', breaks: [] }
        },
        capacity: {
          maxPatients: 30,
          maxDoctors: 3,
          maxNurses: 6,
          consultationRooms: 3,
          waitingAreaCapacity: 12
        },
        contactInfo: {
          mainExtension: '3001',
          emergencyExtension: '3991',
          nurseStation: '3002',
          email: 'cardiology@hospital.com',
          fax: '3003',
          internalPaging: '3004'
        },
        isActive: true,
        metrics: {
          averageWaitTime: 35,
          patientSatisfaction: 4.6,
          utilizationRate: 80,
          avgConsultationTime: 30
        },
        appointmentSettings: {
          allowsWalkIn: false,
          slotDuration: 30,
          bufferTime: 10,
          maxDailyAppointments: 25,
          scheduling: {
            advance: 30,
            cancelation: 24
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Convert JSONB fields to strings
    const departmentsFormatted = departments.map(dept => ({
      ...dept,
      location: JSON.stringify(dept.location),
      operatingHours: JSON.stringify(dept.operatingHours),
      capacity: JSON.stringify(dept.capacity),
      contactInfo: JSON.stringify(dept.contactInfo),
      metrics: JSON.stringify(dept.metrics),
      appointmentSettings: JSON.stringify(dept.appointmentSettings)
    }));

    await queryInterface.bulkInsert('Departments', departmentsFormatted, {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Departments', null, {});
  }
};