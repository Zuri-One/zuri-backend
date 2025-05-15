// update-miriam-db.js
const { Pool } = require('pg');

// Get database URL from environment variable
const databaseUrl = process.env.DATABASE_URL || 'postgresql://zurihealth_owner:Gqt8RyVAUwb6@ep-wandering-lab-a5b0n3ej.us-east-2.aws.neon.tech/zurihealth?sslmode=require';

// Create a new pool instance
const pool = new Pool({
  connectionString: databaseUrl,
});

// Function to update Rosemary's email
async function updateRosemaryEmail() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting update for Agu Rosemary...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // First, check if Rosemary exists with the original email
    const checkResult = await client.query(
      'SELECT "id", "surname", "otherNames", "email" FROM "Users" WHERE "email" = $1',
      ['rosemary.agu@zuri.health']
    );
    
    if (checkResult.rowCount === 0) {
      console.log('⚠️ No user found with email: rosemary.agu@zuri.health');
      
      // Try to find by surname and otherNames
      const nameCheck = await client.query(
        'SELECT "id", "surname", "otherNames", "email" FROM "Users" ' +
        'WHERE "surname" = $1 AND "otherNames" ILIKE $2',
        ['Agu', '%Rosemary%']
      );
      
      if (nameCheck.rowCount === 0) {
        console.log('⚠️ No user found with surname "Agu" and otherName containing "Rosemary"');
        await client.query('ROLLBACK');
        return;
      } else {
        // Use the found user instead
        const user = nameCheck.rows[0];
        console.log(`🔍 Found user by name: ${user.otherNames} ${user.surname} (${user.email})`);
        
        // Update email address
        const updateResult = await client.query(
          'UPDATE "Users" SET "email" = $1 WHERE "id" = $2 RETURNING "id", "surname", "otherNames", "email"',
          ['agunkiru726@gmail.com', user.id]
        );
        
        // Display success message
        console.log(`✅ Email updated from ${user.email} to agunkiru726@gmail.com`);
      }
    } else {
      // Use the direct email match
      const user = checkResult.rows[0];
      
      // Check if the email is already the new one
      if (user.email === 'agunkiru726@gmail.com') {
        console.log('ℹ️ Email is already set to agunkiru726@gmail.com');
        await client.query('ROLLBACK');
        return;
      }
      
      // Update email address
      const updateResult = await client.query(
        'UPDATE "Users" SET "email" = $1 WHERE "id" = $2 RETURNING "id", "surname", "otherNames", "email"',
        ['agunkiru726@gmail.com', user.id]
      );
      
      // Display success message
      console.log(`✅ Email updated from ${user.email} to agunkiru726@gmail.com`);
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    // Verify the update
    const verifyResult = await client.query(
      'SELECT "id", "surname", "otherNames", "email", "telephone1", "role" ' +
      'FROM "Users" WHERE "email" = $1',
      ['agunkiru726@gmail.com']
    );
    
    if (verifyResult.rowCount > 0) {
      const updatedUser = verifyResult.rows[0];
      console.log('\n📊 Updated user info:');
      console.log(`   ID: ${updatedUser.id}`);
      console.log(`   Name: ${updatedUser.otherNames} ${updatedUser.surname}`);
      console.log(`   Email: ${updatedUser.email}`);
      console.log(`   Phone: ${updatedUser.telephone1}`);
      console.log(`   Role: ${updatedUser.role}`);
    } else {
      console.log('⚠️ Verification failed. Could not find user with new email: agunkiru726@gmail.com');
    }
    
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('❌ Error updating email:', error.message);
  } finally {
    // Release client back to pool
    client.release();
    // Close pool
    pool.end();
  }
}

// Run the function
updateRosemaryEmail().catch(err => {
  console.error('Script execution failed:', err);
  process.exit(1);
});