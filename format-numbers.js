// Phone Number Formatter for Zuri Health System
// This script formats all phone numbers to proper international format

const fs = require('fs');

// Load the user data
const userData = require('./user-summary.json');

// Function to standardize phone numbers
function formatPhoneNumber(phone) {
  if (!phone) return phone;
  
  // Remove any non-digit characters except '+'
  let cleanPhone = phone.replace(/[^\d+]/g, '');
  
  // If there's no '+' at the beginning
  if (!cleanPhone.startsWith('+')) {
    // If it starts with the Kenya country code without '+'
    if (cleanPhone.startsWith('254')) {
      cleanPhone = '+' + cleanPhone;
    } 
    // If it's a local number without country code (assuming Kenya)
    else if (cleanPhone.length <= 10) {
      // Add Kenya country code (remove leading 0 if present)
      cleanPhone = cleanPhone.startsWith('0') ? 
        '+254' + cleanPhone.substring(1) : 
        '+254' + cleanPhone;
    }
    // If it's some other format, add '+' prefix
    else {
      cleanPhone = '+' + cleanPhone;
    }
  }
  
  return cleanPhone;
}

// Process all users
let updatedCount = 0;
let problemNumbers = [];

// Process each role category
Object.keys(userData.usersByRole).forEach(role => {
  userData.usersByRole[role].forEach(user => {
    const originalPhone = user.telephone1;
    const formattedPhone = formatPhoneNumber(originalPhone);
    
    // Keep track of changed numbers
    if (originalPhone !== formattedPhone) {
      updatedCount++;
      console.log(`Updated ${user.otherNames} ${user.surname}: ${originalPhone} → ${formattedPhone}`);
      
      // Check for potential problems (like numbers that seem too short/long)
      if (formattedPhone.length < 10 || formattedPhone.length > 15) {
        problemNumbers.push({
          name: `${user.otherNames} ${user.surname}`,
          email: user.email,
          originalPhone,
          formattedPhone
        });
      }
      
      // Update the phone number
      user.telephone1 = formattedPhone;
    }
  });
});

// Write the updated data back to a new file
fs.writeFileSync(
  'user-summary-updated.json', 
  JSON.stringify(userData, null, 2)
);

// Print summary
console.log(`\n=== Phone Number Formatting Summary ===`);
console.log(`Total users processed: ${userData.totalUsers}`);
console.log(`Phone numbers updated: ${updatedCount}`);

// Report any potential problems
if (problemNumbers.length > 0) {
  console.log(`\n⚠️ Potential problems with ${problemNumbers.length} phone numbers:`);
  problemNumbers.forEach(item => {
    console.log(`- ${item.name} (${item.email}): ${item.originalPhone} → ${item.formattedPhone}`);
  });
  console.log(`\nPlease review these numbers manually as they may be incorrect.`);
}

console.log(`\nUpdated data saved to user-summary-updated.json`);
console.log(`\nTo apply these changes to your database, you can use the following SQL template:`);
console.log(`
UPDATE Users 
SET telephone1 = CASE
  WHEN email = 'user@email.com' THEN '+254XXXXXXXXX'
  -- Add more cases for each updated phone
  ELSE telephone1
END
WHERE email IN ('user@email.com', ...);
`);