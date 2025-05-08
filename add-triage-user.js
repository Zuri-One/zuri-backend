// add-triage-user.js
const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:10000';
const BEARER_TOKEN = process.env.BEARER_TOKEN || 'YOUR_BEARER_TOKEN';

// Helper function to generate random data
const generateRandomData = () => {
  // Random name generation - first and last name
  const firstNames = ["Alex", "Samuel", "Daniel", "Emmanuel", "David", "Isaac", "Michael", "Joseph", "James", "John"];
  const lastNames = ["Waweru", "Kamau", "Njoroge", "Mwangi", "Ochieng", "Otieno", "Kimani", "Mbugua", "Githinji", "Kariuki"];
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  
  // Random date of birth (25-40 years old)
  const now = new Date();
  const minAge = 25;
  const maxAge = 40;
  const yearRange = maxAge - minAge;
  const yearOffset = Math.floor(Math.random() * yearRange) + minAge;
  const birthYear = now.getFullYear() - yearOffset;
  
  // Random month and day
  const month = Math.floor(Math.random() * 12) + 1;
  const day = Math.floor(Math.random() * 28) + 1; // Avoid edge cases with month lengths
  
  const dateOfBirth = `${birthYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  
  // Random ID number (8 digits)
  const idNumber = Math.floor(10000000 + Math.random() * 90000000).toString();
  
  // Random phone number (Kenyan format 07XXXXXXXX)
  const phonePrefix = ['07', '01'];
  const selectedPrefix = phonePrefix[Math.floor(Math.random() * phonePrefix.length)];
  const phoneNumber = selectedPrefix + Math.floor(10000000 + Math.random() * 90000000).toString();
  
  // Employee ID
  const employeeId = `ZH-${firstName.charAt(0)}${lastName.charAt(0)}-${now.getFullYear()}`;
  
  // Generate a random license number for nurses (KNL-XXXXX)
  const licenseNumber = `KNL-${Math.floor(10000 + Math.random() * 90000)}`;
  
  return {
    firstName,
    lastName,
    dateOfBirth,
    idNumber,
    phoneNumber,
    employeeId,
    licenseNumber
  };
};

// Create a single triage user
const createTriageUser = async () => {
  try {
    console.log('🚀 Generating random triage user data...');
    
    const randomData = generateRandomData();
    
    // Build user data object
    const user = {
      surname: randomData.lastName,
      otherNames: randomData.firstName,
      email: "isaacw@identifyafrica.io",
      password: "Password123",
      role: "NURSE",
      departmentId: "725380c2-0120-4e90-a9e6-72120c035cf0", // Triage department
      primaryDepartmentId: "725380c2-0120-4e90-a9e6-72120c035cf0",
      employeeId: randomData.employeeId,
      licenseNumber: randomData.licenseNumber, // Added license number
      specialization: ["Triage Nursing", "Emergency Care"], // Added specialization
      qualification: ["BSc. Nursing"], // Added qualification
      telephone1: randomData.phoneNumber,
      gender: "MALE",
      dateOfBirth: randomData.dateOfBirth,
      town: "Nairobi",
      areaOfResidence: "Nairobi",
      idType: "NATIONAL_ID",
      idNumber: randomData.idNumber,
      nationality: "Kenyan",
      designation: "Triage Nurse"
    };
    
    console.log('👤 User details generated:');
    console.log(`   Name: ${user.otherNames} ${user.surname}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Employee ID: ${user.employeeId}`);
    console.log(`   License: ${user.licenseNumber}`);
    console.log(`   Phone: ${user.telephone1}`);
    console.log(`   DoB: ${user.dateOfBirth}`);
    console.log(`   ID Number: ${user.idNumber}`);
    console.log(`   Specialization: ${user.specialization.join(', ')}`);
    
    console.log('\n📡 Sending API request to create user...');
    
    // Set headers
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${BEARER_TOKEN}`
    };
    
    // Make the API call
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/auth/register`,
      user,
      { headers }
    );
    
    console.log('\n✅ User registration successful!');
    console.log('📋 API Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
    
  } catch (error) {
    console.error('\n❌ User registration failed!');
    console.error(`Error: ${error.message}`);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    
    throw error;
  }
};

// Execute the script
console.log('==== Zuri Health - Create Triage User ====\n');
createTriageUser()
  .then(() => {
    console.log('\n🎉 Script completed successfully!');
    console.log('📧 A welcome email with password setup instructions has been sent to isaacw@identifyafrica.io');
  })
  .catch(err => {
    console.error('\n💥 Script execution failed!');
    process.exit(1);
  });