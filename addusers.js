// update-users.js
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
  fs.appendFileSync('user-updates.log', JSON.stringify(logEntry, null, 2) + ',\n');
};

// Format phone number to include country code with + prefix
const formatPhoneNumber = (phone, country = 'Kenya') => {
  if (!phone) return null;
  
  // Already has + prefix
  if (phone.startsWith('+')) return phone;
  
  // Remove any leading zeros
  let cleanNumber = phone.replace(/^0+/, '');
  
  // Add country code based on country
  if (country === 'Kenya') {
    return `+254${cleanNumber}`;
  } else if (country === 'Uganda') {
    return `+256${cleanNumber}`;
  } else if (country === 'Nigeria') {
    return `+234${cleanNumber}`;
  }
  
  // Default to Kenya if country not specified
  return `+254${cleanNumber}`;
};

// Generate random date of birth (between 25-45 years ago)
const generateRandomDOB = () => {
  const today = new Date();
  const minAge = 25;
  const maxAge = 45;
  const randomYears = Math.floor(Math.random() * (maxAge - minAge + 1)) + minAge;
  const randomMonth = Math.floor(Math.random() * 12);
  const randomDay = Math.floor(Math.random() * 28) + 1; // Avoid edge cases with month lengths
  
  const dob = new Date(today.getFullYear() - randomYears, randomMonth, randomDay);
  return dob.toISOString().split('T')[0]; // YYYY-MM-DD format
};

// Generate random ID number (8 digits for Kenya, 9 digits for Uganda, 11 digits for Nigeria)
const generateRandomID = (country = 'Kenya') => {
  let digits = 8; // Default for Kenya
  
  if (country === 'Uganda') {
    digits = 9;
  } else if (country === 'Nigeria') {
    digits = 11;
  }
  
  let id = '';
  for (let i = 0; i < digits; i++) {
    id += Math.floor(Math.random() * 10);
  }
  return id;
};

// Function to update a user using the correct endpoint
const updateUserDetails = async (userId, updateData) => {
  try {
    console.log(`📝 Updating user ID: ${userId} with staff/update-details endpoint`);
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${BEARER_TOKEN}`
    };
    
    // Use the staff/:id/update-details endpoint that exists in your API
    const response = await axios.put(
      `${API_BASE_URL}/api/v1/users/staff/${userId}/update-details`,
      updateData,
      { headers }
    );
    
    return response;
  } catch (error) {
    console.error(`❌ Error updating user: ${error.message}`);
    throw error;
  }
};

// Function to create a new user
const createUser = async (userData) => {
  try {
    console.log(`➕ Creating new user: ${userData.email}`);
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${BEARER_TOKEN}`
    };
    
    // Use the register endpoint from your auth routes
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
    
    // Use the forgotPassword endpoint from your auth routes
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

// Main function to process users
const processUsers = async () => {
  // Initialize log file
  fs.writeFileSync('user-updates.log', '[\n');
  
  // Define all users to be processed
  const usersToProcess = [
    // --- EXISTING USER UPDATES ---
    


    {
      "action": "create",
      "userData": {
        "surname": "Agu",
        "otherNames": "Rosemary Nkiru",
        "email": "agunkiru726@gmail.com",
        "password": "Password123",
        "role": "NURSE",
        "departmentId": "725380c2-0120-4e90-a9e6-72120c035cf0",
        "primaryDepartmentId": "725380c2-0120-4e90-a9e6-72120c035cf0",
        "employeeId": "ZH-ARN-2025",
        "licenseNumber": "KNL-67842",
        "specialization": ["Triage Nursing", "Pediatric Nursing"],
        "qualification": ["BSc. Nursing"],
        "telephone1": "+254745031123",
        "gender": "FEMALE",
        "dateOfBirth": "1994-08-15",
        "town": "Nairobi",
        "areaOfResidence": "Nairobi",
        "idType": "NATIONAL_ID",
        "idNumber": "28945632",
        "nationality": "Nigerian",
        "designation": "Triage Nurse"
      }
    },
    
  
  ];
  
  console.log(`🚀 Starting processing of ${usersToProcess.length} users...`);
  
  const resetPasswordsList = [];
  
  // Process users sequentially
  for (const [index, userInfo] of usersToProcess.entries()) {
    try {
      console.log(`\nProcessing ${index + 1}/${usersToProcess.length}: ${userInfo.action === "create" ? userInfo.userData.email : userInfo.email}`);
      
      if (userInfo.action === "update") {
        try {
          // Update user using the update-details endpoint
          const response = await updateUserDetails(userInfo.userId, userInfo.userData);
          logResponse(`${userInfo.userData.otherNames} ${userInfo.userData.surname}`, "update", response);
          
          // Add to password reset list - use the new email if it was updated
          resetPasswordsList.push(userInfo.userData.email || userInfo.email);
          
        } catch (error) {
          console.error(`❌ Error updating user ${userInfo.email}: ${error.message}`);
          if (error.response) {
            console.error(`Response status: ${error.response.status}`);
            console.error('Response data:', error.response.data);
          }
        }
      } else if (userInfo.action === "create") {
        try {
          // Create new user
          const response = await createUser(userInfo.userData);
          logResponse(`${userInfo.userData.otherNames} ${userInfo.userData.surname}`, "create", response);
          
          // Add to password reset list
          resetPasswordsList.push(userInfo.userData.email);
          
        } catch (error) {
          // Check if this is a duplicate error - still add to password reset list
          if (error.response && error.response.data && error.response.data.message && 
              error.response.data.message.includes("already registered")) {
            console.log(`⚠️ Email already exists: ${userInfo.userData.email}. Will send password reset anyway.`);
            resetPasswordsList.push(userInfo.userData.email);
          } else {
            console.error(`❌ Error creating user: ${error.message}`);
            if (error.response) {
              console.error(`Response status: ${error.response.status}`);
              console.error('Response data:', error.response.data);
            }
          }
        }
      }
      
      // Add delay between operations
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ General error processing user: ${error.message}`);
    }
  }
  
  // Send password reset links to everyone
  console.log("\n🔑 Sending password reset links to all processed users...");
  
  for (const [index, email] of resetPasswordsList.entries()) {
    try {
      console.log(`Sending password reset ${index + 1}/${resetPasswordsList.length}: ${email}`);
      
      const response = await sendPasswordResetLink(email);
      logResponse(email, "password reset", response);
      
      // Add small delay between reset requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      logResponse(email, "password reset", null, error);
    }
  }
  
  // Close log file
  fs.appendFileSync('user-updates.log', '\n]');
  
  // Print summary
  console.log('\n✅ User updates completed!');
  console.log(`🔄 Updated ${usersToProcess.filter(u => u.action === "update").length} existing users`);
  console.log(`➕ Added ${usersToProcess.filter(u => u.action === "create").length} new users`);
  console.log(`📧 Sent ${resetPasswordsList.length} password reset emails`);
  console.log('📋 Check user-updates.log for detailed results');
};

// Execute the script
processUsers().catch(err => {
  console.error('Script execution failed:', err);
  process.exit(1);
});