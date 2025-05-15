// add-user-send-resets.js
const axios = require('axios');
const fs = require('fs');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:10000';
const BEARER_TOKEN = process.env.BEARER_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjdlZWNhNDQ4LWNhOTItNGYxOS1hZTc0LWY1MGZlMTVkY2QzYyIsInJvbGUiOiJBRE1JTiIsInBlcm1pc3Npb25zIjpbImFsbCJdLCJpYXQiOjE3NDczMTg3MTQsImV4cCI6MTc0NzQwNTExNH0.JEHC16bQ178H0fzL10wkoTnaHRP_fg5jVrX6RUZhR_I';

// Helper function to log responses
const logResponse = (name, action, response, error = null) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    user: name,
    action: action,
    success: !error,
    data: error ? null : response.data,
    error: error ? (error.response ? error.response.data : error.message) : null,
    status: error ? (error.response ? error.response.status : 'ERROR') : response.status
  };
  
  console.log(`${logEntry.success ? '✅' : '❌'} ${name} - ${action}: ${logEntry.success ? 'Success' : 'Failed'}`);
  
  // Append to log file
  fs.appendFileSync('user-actions.log', JSON.stringify(logEntry, null, 2) + ',\n');
};

// Format phone number
const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  if (phone.startsWith('+')) return phone;
  
  let cleanNumber = phone.replace(/^0+/, '');
  return `+254${cleanNumber}`;
};

// Function to create a new user
const createUser = async (userData) => {
  try {
    console.log(`➕ Creating new user: ${userData.email}`);
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${BEARER_TOKEN}`
    };
    
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/auth/register`,
      userData,
      { headers }
    );
    
    return response;
  } catch (error) {
    console.error(`❌ Error creating user: ${error.message}`);
    throw error;
  }
};

// Function to send password reset link
const sendPasswordResetLink = async (email) => {
  try {
    console.log(`📧 Sending password reset link to: ${email}`);
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/auth/forgot-password`,
      { email },
      { headers }
    );
    
    return response;
  } catch (error) {
    console.error(`❌ Error sending reset link: ${error.message}`);
    throw error;
  }
};

// Main function
const processUsers = async () => {
  // Initialize log file
  fs.writeFileSync('user-actions.log', '[\n');
  
  try {
    // 1. Create new user - Evangeline Wanjiru
    const evangelineData = {
      surname: "Wanjiru",
      otherNames: "Evangeline",
      email: "evangeline@zuri.health",
      password: "Password123",
      role: "RECEPTIONIST",
      departmentId: "328c72ad-7689-4cdb-9995-77c2d54f3775", // Reception department
      primaryDepartmentId: "328c72ad-7689-4cdb-9995-77c2d54f3775",
      employeeId: "ZH-EW-2025",
      telephone1: formatPhoneNumber("0718842424"),
      gender: "FEMALE",
      dateOfBirth: "1995-05-15", // Assuming a birth date
      town: "Nairobi",
      areaOfResidence: "Nairobi",
      idType: "NATIONAL_ID",
      idNumber: "29876543", // Generated ID number
      nationality: "Kenyan",
      designation: "Receptionist"
    };
    
    console.log("\n== Creating new receptionist: Evangeline Wanjiru ==");
    try {
      const createResponse = await createUser(evangelineData);
      logResponse("Evangeline Wanjiru", "create", createResponse);
    } catch (error) {
      if (error.response && error.response.data && error.response.data.message && 
          error.response.data.message.includes("already registered")) {
        console.log(`⚠️ Email evangeline@zuri.health already exists. Will still send password reset.`);
      } else {
        throw error;
      }
    }
    
    // 2. Send password reset emails
    const emailsToReset = [
      { name: "Evangeline Wanjiru", email: "evangeline@zuri.health" },
      { name: "Joy John", email: "joy@zuri.health" },
      { name: "Antony Ndegwa", email: "antony@zuri.health" }
    ];
    
    console.log("\n== Sending password reset emails ==");
    for (const user of emailsToReset) {
      try {
        const resetResponse = await sendPasswordResetLink(user.email);
        logResponse(user.name, "password reset", resetResponse);
        
        // Add a small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        logResponse(user.name, "password reset", null, error);
      }
    }
    
  } catch (error) {
    console.error(`❌ Error in process: ${error.message}`);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data:`, error.response.data);
    }
  }
  
  // Close log file
  fs.appendFileSync('user-actions.log', '\n]');
  
  console.log("\n✅ Process completed!");
  console.log("📋 Check user-actions.log for detailed results");
};

// Run the main function
processUsers().catch(err => {
  console.error('Script execution failed:', err);
  process.exit(1);
});