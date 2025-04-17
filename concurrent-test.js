const axios = require('axios');
const https = require('https');

// Base URL and authentication
const BASE_URL = 'https://portal.identifyafrica.io/api/v1';
const CLIENT_ID = 'api-d6cf3b98c7';
const CLIENT_SECRET = 'uEToyTfqh5k4N2gJtLECV8AXKQTT8FN6pJo';

// Test data
const phoneNumbers = [
  '254794298129',
  '254707348768', 
  '254726680907',
  '254707220283',
  '254720631652',
  '254707451263',
  '254720139206'
];

const idNumbers = [
  '36331067',
  '36441264',
  '36012356',
  '23132363',
  '27046565',
  '38352005',
  '39014001',
  '32462689'
];

const kraPins = [
  'A014606933Y',
  'A007362361Q',
  'A015585155D',
  'A015810577A',
  'A012014059G',
  'A020253888C',
  'A014593065Y'
];

// Create an axios instance with authentication
const api = axios.create({
  baseURL: BASE_URL,
  auth: {
    username: CLIENT_ID,
    password: CLIENT_SECRET
  },
  httpsAgent: new https.Agent({  
    rejectUnauthorized: false // Ignore SSL certificate issues (for testing only)
  }),
  timeout: 30000 // 30 second timeout
});

// Function to make API calls
async function makeApiCall(endpoint, params) {
  try {
    const response = await api.post(endpoint, params);
    return {
      success: true,
      endpoint,
      params,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      endpoint,
      params,
      status: error.response?.status || 'Network Error',
      data: error.response?.data || error.message
    };
  }
}

// Make concurrent API calls
async function runConcurrentTests() {
  console.log('Starting concurrent API tests...');
  
  const phonePromises = phoneNumbers.slice(0, 5).map(number => 
    makeApiCall('/validateaccount', { 
      account_number: number, 
      institution_code: '63902' 
    })
  );
  
  const idPromises = idNumbers.slice(0, 5).map(id => 
    makeApiCall('/id', { idnumber: id })
  );
  
  const kraPromises = kraPins.slice(0, 5).map(pin => 
    makeApiCall('/krapin', { pinnumber: pin })
  );
  
  const dlPromises = idNumbers.slice(0, 5).map(id => 
    makeApiCall('/dl', { idnumber: id })
  );
  
  // Combine all promises
  const allPromises = [
    ...phonePromises,
    ...idPromises,
    ...kraPromises,
    ...dlPromises
  ];
  
  // Execute all requests simultaneously
  const startTime = Date.now();
  const results = await Promise.all(allPromises);
  const endTime = Date.now();
  
  // Analyze results
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;
  const walletErrors = results.filter(r => 
    r.data?.message === 'Wallet Error' || 
    r.data?.data?.message === 'Wallet Error'
  ).length;
  
  console.log(`Test completed in ${(endTime - startTime)/1000} seconds`);
  console.log(`Total requests: ${results.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failureCount}`);
  console.log(`Wallet Errors: ${walletErrors}`);
  
  // Log detailed results
  console.log('\nDetailed Results:');
  results.forEach((result, index) => {
    const endpoint = result.endpoint.replace('/', '');
    const param = Object.values(result.params)[0];
    if (result.success) {
      const responseCode = result.data?.response_code || 'Unknown';
      console.log(`✅ [${index+1}] ${endpoint} (${param}): ${responseCode}`);
    } else {
      const errorMsg = result.data?.message || JSON.stringify(result.data);
      console.log(`❌ [${index+1}] ${endpoint} (${param}): ${result.status} - ${errorMsg}`);
    }
  });
  
  // Print all wallet errors with details
  if (walletErrors > 0) {
    console.log('\nWallet Error Details:');
    results.filter(r => 
      r.data?.message === 'Wallet Error' || 
      r.data?.data?.message === 'Wallet Error'
    ).forEach((result, index) => {
      const endpoint = result.endpoint.replace('/', '');
      const param = Object.values(result.params)[0];
      console.log(`⚠️ [${index+1}] ${endpoint} (${param}): Wallet Error`);
    });
  }
}

// Run the test
runConcurrentTests()
  .catch(error => {
    console.error('Test failed:', error);
  });