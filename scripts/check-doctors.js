#!/usr/bin/env node

require('dotenv').config();
const { User } = require('../src/models');

async function checkDoctors() {
  try {
    const doctors = await User.findAll({
      where: { role: 'DOCTOR' },
      attributes: ['id', 'surname', 'otherNames', 'email', 'isActive'],
      order: [['surname', 'ASC']]
    });

    console.log(`\n👨⚕️ Found ${doctors.length} doctors in the system:\n`);
    
    doctors.forEach((doctor, index) => {
      const status = doctor.isActive ? '✅' : '❌';
      console.log(`${index + 1}. ${status} Dr. ${doctor.otherNames} ${doctor.surname}`);
      console.log(`   📧 ${doctor.email}`);
      console.log(`   🆔 ${doctor.id}\n`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkDoctors();