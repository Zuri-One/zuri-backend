// reset-hudson-flavia.js
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
  fs.appendFileSync('password-resets.log', JSON.stringify(logEntry, null, 2) + ',\n');
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
const sendResets = async () => {
  // Initialize log file
  fs.writeFileSync('password-resets.log', '[\n');
  
  try {
    // List of users to send password resets to
    const usersToReset = [
      { name: "Hudson Vulimu", email: "kamandehudson@gmail.com" },
      { name: "Flavia Bagatya", email: "flavia@zuri.health" }
    ];
    
    console.log(`🔄 Sending password reset emails to ${usersToReset.length} users...\n`);
    
    // Process each user
    for (const [index, user] of usersToReset.entries()) {
      console.log(`Processing ${index + 1}/${usersToReset.length}: ${user.name} (${user.email})`);
      
      try {
        const response = await sendPasswordResetLink(user.email);
        logResponse(user.name, "password reset", response);
        
        // Add a small delay between requests
        if (index < usersToReset.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        logResponse(user.name, "password reset", null, error);
      }
    }
    
  } catch (error) {
    console.error(`❌ General error: ${error.message}`);
  }
  
  // Close log file
  fs.appendFileSync('password-resets.log', '\n]');
  
  console.log("\n✅ Password reset process completed!");
  console.log("📋 Check password-resets.log for detailed results");
};

// Run the main function
sendResets().catch(err => {
  console.error('Script execution failed:', err);
  process.exit(1);
});