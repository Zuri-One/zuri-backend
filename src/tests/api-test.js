// src/tests/api-test.js
require('dotenv').config();
const axios = require('axios');

const API_URL = 'http://localhost:10000/api/v1';
let authToken;

const testAPI = async () => {
  try {
    console.log('\n🔄 Testing API endpoints...');

    // 1. Test Login
    console.log('\n1. Testing login with seeded doctor account...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'doctor@zurihealth.com',
      password: 'Doctor@123',
      role: 'doctor'
    });
    
    authToken = loginResponse.data.token;
    console.log('✅ Login successful');
    console.log('🔑 Token received:', authToken ? 'Yes' : 'No');

    // 2. Test Protected Route
    console.log('\n2. Testing protected route access...');
    const appointmentsResponse = await axios.get(`${API_URL}/appointments`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Protected route accessible');

    // 3. Test Registration
    console.log('\n3. Testing new user registration...');
    const registerResponse = await axios.post(`${API_URL}/auth/register`, {
      name: 'Test Patient',
      email: 'patient@test.com',
      password: 'Test@123'
    });
    console.log('✅ Registration successful');
    
    console.log('\n✅ All API tests completed successfully');

  } catch (error) {
    console.error('\n❌ Test failed:', {
      endpoint: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      error: error.response?.data || error.message
    });
  }
};

testAPI();