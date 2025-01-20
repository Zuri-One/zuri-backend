'use strict';
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create department IDs (you'll need to match these with your actual department seeds)
    // Using actual department IDs from the database
    const departmentIds = {
      emergency: 'f97a7b50-2aec-445c-a4fe-dd2b571a527e',    // EMERG
      cardiology: '70c1bd18-60cb-4dde-8f27-2e01ecd783b5',   // CARD
      pediatrics: '6c7e60c1-c540-4726-8eb7-c4574f117369',   // PEDI
      neurology: '65e870d2-bd4a-4904-aede-04c3ea7690c6',    // NEUR
      radiology: 'c3ed2617-563a-4419-9d00-601488aeac9a',    // RAD
      laboratory: '1e4f468c-4e26-4350-8bce-cb62069ebd55',   // LAB
      pharmacy: '0bdcccf4-cc88-44e6-b066-4856b02157b3',     // PHAR
      orthopedics: 'a68d8452-a40b-404e-b552-3815e5748808',  // ORTH
      nursing: '704a337e-dad5-4979-9f54-0a41e769f71a',      // NURS-001
      physiotherapy: '11367844-2afb-45cd-9ff3-67fc1babbd2c', // PHYS-001
      reception: '328c72ad-7689-4cdb-9995-77c2d54f3775',    // RECP-001
      triage: '725380c2-0120-4e90-a9e6-72120c035cf0'        // TRIG-001
    };

    // Generate a standard password for all test users
    const standardPassword = await bcrypt.hash('Test@123', 10);
    
    const users = [
      // Existing users
      {
        id: uuidv4(),
        surname: 'Dr.',
        otherNames: 'Isaac',
        email: 'isaacwambiri254@gmail.com',
        password: await bcrypt.hash('20405011006@Ki', 10),
        role: 'DOCTOR',
        gender: 'MALE',
        dateOfBirth: new Date('1990-01-01'),
        telephone1: '254722000000',
        town: 'Nairobi',
        areaOfResidence: 'Westlands',
        idType: 'NATIONAL_ID',
        nationality: 'Kenyan',
        employeeId: 'DOC001',
        licenseNumber: 'LIC001',
        specialization: ['General Medicine'],
        departmentId: departmentIds.emergency,
        primaryDepartmentId: departmentIds.emergency,
        qualification: JSON.stringify([{
          degree: 'MBBS',
          institution: 'University of Nairobi',
          year: '2015'
        }]),
        isEmailVerified: true,
        isActive: true,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        joiningDate: new Date()
      },
      {
        id: uuidv4(),
        surname: 'System',
        otherNames: 'Admin',
        email: 'admin@zurihealth.com',
        password: await bcrypt.hash('Admin@123', 10),
        role: 'ADMIN',
        gender: 'OTHER',
        dateOfBirth: new Date('1990-01-01'),
        telephone1: '254722000001',
        town: 'Nairobi',
        areaOfResidence: 'Westlands',
        idType: 'NATIONAL_ID',
        nationality: 'Kenyan',
        employeeId: 'ADM001',
        isEmailVerified: true,
        isActive: true,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        joiningDate: new Date()
      },
      // New users for different roles
      {
        id: uuidv4(),
        surname: 'Dr.',
        otherNames: 'Sarah Kamau',
        email: 'sarah.kamau@zurihealth.com',
        password: standardPassword,
        role: 'CARDIOLOGIST',
        gender: 'FEMALE',
        dateOfBirth: new Date('1985-03-15'),
        telephone1: '254722000002',
        town: 'Nairobi',
        areaOfResidence: 'Kilimani',
        idType: 'NATIONAL_ID',
        nationality: 'Kenyan',
        employeeId: 'CAR001',
        licenseNumber: 'LIC002',
        departmentId: departmentIds.cardiology,
        primaryDepartmentId: departmentIds.cardiology,
        specialization: ['Cardiology', 'Internal Medicine'],
        qualification: JSON.stringify([{
          degree: 'MBBS',
          institution: 'University of Nairobi',
          year: '2010'
        }, {
          degree: 'MD Cardiology',
          institution: 'Kenyatta University',
          year: '2015'
        }]),
        isEmailVerified: true,
        isActive: true,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        joiningDate: new Date('2020-01-15')
      },
      {
        id: uuidv4(),
        surname: 'Nurse',
        otherNames: 'Grace Muthoni',
        email: 'grace.muthoni@zurihealth.com',
        password: standardPassword,
        role: 'NURSE',
        gender: 'FEMALE',
        dateOfBirth: new Date('1992-06-20'),
        telephone1: '254722000003',
        town: 'Nairobi',
        areaOfResidence: 'South B',
        idType: 'NATIONAL_ID',
        nationality: 'Kenyan',
        employeeId: 'NUR001',
        licenseNumber: 'NLC001',
        departmentId: departmentIds.emergency,
        primaryDepartmentId: departmentIds.emergency,
        specialization: ['Critical Care'],
        qualification: JSON.stringify([{
          degree: 'BSN',
          institution: 'KMTC',
          year: '2016'
        }]),
        isEmailVerified: true,
        isActive: true,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        joiningDate: new Date('2020-02-01')
      },
      {
        id: uuidv4(),
        surname: 'Dr.',
        otherNames: 'James Odhiambo',
        email: 'james.odhiambo@zurihealth.com',
        password: standardPassword,
        role: 'PEDIATRICIAN',
        gender: 'MALE',
        dateOfBirth: new Date('1988-09-10'),
        telephone1: '254722000004',
        town: 'Nairobi',
        areaOfResidence: 'Lavington',
        idType: 'NATIONAL_ID',
        nationality: 'Kenyan',
        employeeId: 'PED001',
        licenseNumber: 'LIC003',
        departmentId: departmentIds.pediatrics,
        primaryDepartmentId: departmentIds.pediatrics,
        specialization: ['Pediatrics', 'Neonatology'],
        qualification: JSON.stringify([{
          degree: 'MBBS',
          institution: 'University of Nairobi',
          year: '2012'
        }, {
          degree: 'MD Pediatrics',
          institution: 'Aga Khan University',
          year: '2017'
        }]),
        isEmailVerified: true,
        isActive: true,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        joiningDate: new Date('2020-03-01')
      },
      {
        id: uuidv4(),
        surname: 'Mr.',
        otherNames: 'Daniel Kiprono',
        email: 'daniel.kiprono@zurihealth.com',
        password: standardPassword,
        role: 'LAB_TECHNICIAN',
        gender: 'MALE',
        dateOfBirth: new Date('1993-12-05'),
        telephone1: '254722000005',
        town: 'Nairobi',
        areaOfResidence: 'Ngara',
        idType: 'NATIONAL_ID',
        nationality: 'Kenyan',
        employeeId: 'LAB001',
        licenseNumber: 'LT001',
        departmentId: departmentIds.laboratory,
        primaryDepartmentId: departmentIds.laboratory,
        specialization: ['Clinical Laboratory'],
        qualification: JSON.stringify([{
          degree: 'BSc Medical Laboratory',
          institution: 'JKUAT',
          year: '2018'
        }]),
        isEmailVerified: true,
        isActive: true,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        joiningDate: new Date('2020-04-01')
      },
      {
        id: uuidv4(),
        surname: 'Ms.',
        otherNames: 'Faith Wanjiku',
        email: 'faith.wanjiku@zurihealth.com',
        password: standardPassword,
        role: 'PHARMACIST',
        gender: 'FEMALE',
        dateOfBirth: new Date('1991-08-15'),
        telephone1: '254722000006',
        town: 'Nairobi',
        areaOfResidence: 'Kasarani',
        idType: 'NATIONAL_ID',
        nationality: 'Kenyan',
        employeeId: 'PHARM001',
        licenseNumber: 'PH001',
        departmentId: departmentIds.pharmacy,
        primaryDepartmentId: departmentIds.pharmacy,
        specialization: ['Clinical Pharmacy'],
        qualification: JSON.stringify([{
          degree: 'BPharm',
          institution: 'University of Nairobi',
          year: '2016'
        }]),
        isEmailVerified: true,
        isActive: true,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        joiningDate: new Date('2020-05-01')
      },
      {
        id: uuidv4(),
        surname: 'Dr.',
        otherNames: 'Lucy Njeri',
        email: 'lucy.njeri@zurihealth.com',
        password: standardPassword,
        role: 'RADIOLOGIST',
        gender: 'FEMALE',
        dateOfBirth: new Date('1987-04-25'),
        telephone1: '254722000007',
        town: 'Nairobi',
        areaOfResidence: 'Karen',
        idType: 'NATIONAL_ID',
        nationality: 'Kenyan',
        employeeId: 'RAD001',
        licenseNumber: 'LIC004',
        departmentId: departmentIds.radiology,
        primaryDepartmentId: departmentIds.radiology,
        specialization: ['Diagnostic Radiology', 'MRI'],
        qualification: JSON.stringify([{
          degree: 'MBBS',
          institution: 'University of Nairobi',
          year: '2011'
        }, {
          degree: 'MD Radiology',
          institution: 'Kenyatta University',
          year: '2016'
        }]),
        isEmailVerified: true,
        isActive: true,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        joiningDate: new Date('2020-06-01')
      },
      {
        id: uuidv4(),
        surname: 'Ms.',
        otherNames: 'Rose Adhiambo',
        email: 'rose.adhiambo@zurihealth.com',
        password: standardPassword,
        role: 'RECEPTIONIST',
        gender: 'FEMALE',
        dateOfBirth: new Date('1995-11-30'),
        telephone1: '254722000008',
        town: 'Nairobi',
        areaOfResidence: 'Umoja',
        idType: 'NATIONAL_ID',
        nationality: 'Kenyan',
        employeeId: 'REC001',
        departmentId: null,
        primaryDepartmentId: null,
        qualification: JSON.stringify([{
          degree: 'Diploma in Front Office Management',
          institution: 'Kenya School of Professional Studies',
          year: '2018'
        }]),
        isEmailVerified: true,
        isActive: true,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        joiningDate: new Date('2020-07-01')
      },
      {
        id: uuidv4(),
        surname: 'Mr.',
        otherNames: 'John Mwangi',
        email: 'john.mwangi@zurihealth.com',
        password: standardPassword,
        role: 'PHYSIOTHERAPIST',
        gender: 'MALE',
        dateOfBirth: new Date('1990-07-20'),
        telephone1: '254722000009',
        town: 'Nairobi',
        areaOfResidence: 'Kileleshwa',
        idType: 'NATIONAL_ID',
        nationality: 'Kenyan',
        employeeId: 'PHY001',
        licenseNumber: 'PT001',
        departmentId: departmentIds.orthopedics,
        primaryDepartmentId: departmentIds.orthopedics,
        specialization: ['Sports Rehabilitation', 'Orthopedic Physiotherapy'],
        qualification: JSON.stringify([{
          degree: 'BSc Physiotherapy',
          institution: 'Kenyatta University',
          year: '2015'
        }]),
        isEmailVerified: true,
        isActive: true,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        joiningDate: new Date('2020-08-01')
      },
      {
        id: uuidv4(),
        surname: 'Ms.',
        otherNames: 'Patricia Akinyi',
        email: 'patricia.akinyi@zurihealth.com',
        password: standardPassword,
        role: 'NURSE',
        gender: 'FEMALE',
        dateOfBirth: new Date('1989-03-15'),
        telephone1: '254722000010',
        town: 'Nairobi',
        areaOfResidence: 'South C',
        idType: 'NATIONAL_ID',
        nationality: 'Kenyan',
        employeeId: 'NUR002',
        licenseNumber: 'NLC002',
        departmentId: departmentIds.nursing,
        primaryDepartmentId: departmentIds.nursing,
        specialization: ['General Nursing', 'Emergency Care'],
        qualification: JSON.stringify([{
          degree: 'BSN',
          institution: 'KMTC',
          year: '2014'
        }]),
        isEmailVerified: true,
        isActive: true,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        joiningDate: new Date('2020-09-01')
      },
      {
        id: uuidv4(),
        surname: 'Mr.',
        otherNames: 'Robert Kiprop',
        email: 'robert.kiprop@zurihealth.com',
        password: standardPassword,
        role: 'NURSE',
        gender: 'MALE',
        dateOfBirth: new Date('1991-05-20'),
        telephone1: '254722000011',
        town: 'Nairobi',
        areaOfResidence: 'Parklands',
        idType: 'NATIONAL_ID',
        nationality: 'Kenyan',
        employeeId: 'NUR003',
        licenseNumber: 'NLC003',
        departmentId: departmentIds.triage,
        primaryDepartmentId: departmentIds.triage,
        specialization: ['Triage', 'Emergency Nursing'],
        qualification: JSON.stringify([{
          degree: 'BSN',
          institution: 'Moi University',
          year: '2015'
        }]),
        isEmailVerified: true,
        isActive: true,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        joiningDate: new Date('2020-10-01')
      },
      {
        id: uuidv4(),
        surname: 'Dr.',
        otherNames: 'Michael Mugo',
        email: 'michael.mugo@zurihealth.com',
        password: standardPassword,
        role: 'NEUROLOGIST',
        gender: 'MALE',
        dateOfBirth: new Date('1983-07-12'),
        telephone1: '254722000012',
        town: 'Nairobi',
        areaOfResidence: 'Kilimani',
        idType: 'NATIONAL_ID',
        nationality: 'Kenyan',
        employeeId: 'NEU001',
        licenseNumber: 'LIC005',
        departmentId: departmentIds.neurology,
        primaryDepartmentId: departmentIds.neurology,
        specialization: ['Neurology', 'Neuroscience'],
        qualification: JSON.stringify([{
          degree: 'MBBS',
          institution: 'University of Nairobi',
          year: '2008'
        }, {
          degree: 'MD Neurology',
          institution: 'Kenyatta University',
          year: '2013'
        }]),
        isEmailVerified: true,
        isActive: true,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        joiningDate: new Date('2020-11-01')
      },
      {
        id: uuidv4(),
        surname: 'Ms.',
        otherNames: 'Jane Wakesho',
        email: 'jane.wakesho@zurihealth.com',
        password: standardPassword,
        role: 'RECEPTIONIST',
        gender: 'FEMALE',
        dateOfBirth: new Date('1994-09-25'),
        telephone1: '254722000013',
        town: 'Nairobi',
        areaOfResidence: 'Donholm',
        idType: 'NATIONAL_ID',
        nationality: 'Kenyan',
        employeeId: 'REC002',
        departmentId: departmentIds.reception,
        primaryDepartmentId: departmentIds.reception,
        qualification: JSON.stringify([{
          degree: 'Diploma in Hospital Administration',
          institution: 'Kenya Institute of Management',
          year: '2017'
        }]),
        isEmailVerified: true,
        isActive: true,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        joiningDate: new Date('2020-12-01')
      }
    ];

    return queryInterface.bulkInsert('Users', users);
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Users', null, {});
  }
};