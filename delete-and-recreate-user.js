// delete-and-recreate-user.js
require('dotenv').config();
const { User } = require('./src/models');
const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:10000';
const BEARER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjdlZWNhNDQ4LWNhOTItNGYxOS1hZTc0LWY1MGZlMTVkY2QzYyIsInJvbGUiOiJBRE1JTiIsInBlcm1pc3Npb25zIjpbImFsbCJdLCJpYXQiOjE3NDY2MjUzOTksImV4cCI6MTc0NjcxMTc5OX0.GIgy-6O1gB6uiGyPwXR9RcaUniYyZJ_54m7lc3nuBq8";

// Helper function to generate random data
const generateRandomData = () => {
  // Random name generation - first and last name
  const firstNames = ["Isaac", "Samuel", "Daniel", "Emmanuel", "David"];
  const lastNames = ["Wambiri", "Kamau", "Njoroge", "Mwangi", "Ochieng"];
  
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

async function deleteAndRecreateUser() {
  try {
    console.log('==== Zuri Health - Delete and Recreate User ====\n');
    
    // Step 1: Delete the existing user
    console.log('Searching for user with email: isaacw@identifyafrica.io');
    const existingUser = await User.findOne({
      where: { email: 'isaacw@identifyafrica.io' }
    });
    
    if (existingUser) {
      console.log(`Found user: ${existingUser.otherNames} ${existingUser.surname} (ID: ${existingUser.id})`);
      console.log('Deleting user...');
      
      await existingUser.destroy();
      console.log('✅ User deleted successfully');
    } else {
      console.log('⚠️ No user found with that email');
    }
    
    // Step 2: Generate data for new user
    console.log('\n🚀 Generating data for new user...');
    const randomData = generateRandomData();
    
    // Build user data object
    const user = {
      surname: randomData.lastName,
      otherNames: randomData.firstName,
      email: "isaacw@identifyafrica.io",
      password: "Password123", // This will be reset through the email link
      role: "NURSE",
      departmentId: "725380c2-0120-4e90-a9e6-72120c035cf0", // Triage department
      primaryDepartmentId: "725380c2-0120-4e90-a9e6-72120c035cf0",
      employeeId: randomData.employeeId,
      licenseNumber: randomData.licenseNumber,
      specialization: ["Triage Nursing", "Emergency Care"],
      qualification: ["BSc. Nursing"],
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
    
    // Step 3: Create new user
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
    
    console.log('\n🎉 Process completed! A welcome email with password setup instructions has been sent to isaacw@identifyafrica.io');
    console.log('Please check inbox (and spam folder) for the registration email');
    
  } catch (error) {
    console.error('\n❌ Error:');
    console.error(`Message: ${error.message}`);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error);
    }
  } finally {
    // Close database connection
    const { sequelize } = require('./src/models');
    await sequelize.close();
    console.log('Database connection closed');
  }
}

// Run the script
deleteAndRecreateUser();