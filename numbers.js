// update-phone-numbers.js
require('dotenv').config();
const { User } = require('./src/models');
const { Op } = require('sequelize');

// Utility function to format phone numbers with Kenyan country code
const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  
  // Remove any non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // If it starts with 0, replace with 254
  if (digitsOnly.startsWith('0')) {
    return '254' + digitsOnly.substring(1);
    
  }
  
  // If it's already in international format (starts with 254), return as is
  if (digitsOnly.startsWith('254')) {
    return digitsOnly;
  }
  
  // If it's just 9 digits (without the leading 0), add 254
  if (digitsOnly.length === 9) {
    return '254' + digitsOnly;
  }
  
  // Return original digits as fallback
  return digitsOnly;
};

// Main function to update phone numbers
const updatePhoneNumbers = async () => {
  try {
    console.log('🔄 Starting phone number update process...');
    
    // Fetch all users with phone numbers starting with 0
    const users = await User.findAll({
      where: {
        [Op.or]: [
          { telephone1: { [Op.like]: '0%' } },
          { telephone2: { [Op.like]: '0%' } }
        ]
      }
    });
    
    console.log(`Found ${users.length} users with phone numbers to update`);
    
    // Track stats
    const stats = {
      total: users.length,
      updated: 0,
      skipped: 0,
      errors: 0
    };
    
    // Process each user
    for (const user of users) {
      try {
        console.log(`\nProcessing user: ${user.surname} ${user.otherNames} (${user.email})`);
        
        const originalPhone1 = user.telephone1;
        const originalPhone2 = user.telephone2;
        
        // Format phone numbers
        const newPhone1 = formatPhoneNumber(originalPhone1);
        const newPhone2 = formatPhoneNumber(originalPhone2);
        
        // Only update if the phone number actually changed
        if (newPhone1 !== originalPhone1 || newPhone2 !== originalPhone2) {
          console.log(`Updating phone numbers for ${user.email}:`);
          if (newPhone1 !== originalPhone1) {
            console.log(`  - Primary: ${originalPhone1} -> ${newPhone1}`);
          }
          if (newPhone2 !== originalPhone2) {
            console.log(`  - Secondary: ${originalPhone2} -> ${newPhone2}`);
          }
          
          // Update the user record
          await user.update({
            telephone1: newPhone1,
            telephone2: newPhone2
          });
          
          stats.updated++;
          console.log(`✅ Phone numbers updated successfully`);
        } else {
          console.log(`ℹ️ No changes needed for ${user.email}`);
          stats.skipped++;
        }
      } catch (error) {
        console.error(`❌ Error updating phone for ${user.email}: ${error.message}`);
        stats.errors++;
      }
    }
    
    // Print summary
    console.log('\n=== PHONE NUMBER UPDATE SUMMARY ===');
    console.log(`Total users processed: ${stats.total}`);
    console.log(`✅ Successfully updated: ${stats.updated}`);
    console.log(`ℹ️ No changes needed: ${stats.skipped}`);
    console.log(`❌ Errors: ${stats.errors}`);
    
    return stats;
  } catch (error) {
    console.error(`❌ Fatal error: ${error.message}`);
    throw error;
  } finally {
    // Close database connection
    const { sequelize } = require('./src/models');
    await sequelize.close();
    console.log('Database connection closed.');
  }
};

// Run the script
console.log('==== ZURI HEALTH PHONE NUMBER UPDATE SCRIPT ====');
console.log(`Started at: ${new Date().toISOString()}`);
console.log('=======================================\n');

updatePhoneNumbers()
  .then((stats) => {
    console.log('\n=======================================');
    console.log(`Completed at: ${new Date().toISOString()}`);
    console.log('==== SCRIPT EXECUTION COMPLETED ====');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script execution failed:', error);
    process.exit(1);
  });