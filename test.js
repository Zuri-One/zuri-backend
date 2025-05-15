// update-miriam-db.js
const { Pool } = require('pg');

// Get database URL from environment variable
const databaseUrl = process.env.DATABASE_URL || 'postgresql://zurihealth_owner:Gqt8RyVAUwb6@ep-wandering-lab-a5b0n3ej.us-east-2.aws.neon.tech/zurihealth?sslmode=require';

// Create a new pool instance
const pool = new Pool({
  connectionString: databaseUrl,
});

// Function to update Miriam's phone number
async function updateMiriamPhone() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting update...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Update Miriam's phone number
    const updateResult = await client.query(
      'UPDATE "Users" SET "telephone1" = $1 WHERE "email" = $2 RETURNING "id", "surname", "otherNames", "email", "telephone1"',
      ['+254702789852', 'miriamwambui094@gmail.com']
    );
    
    // Check if any row was updated
    if (updateResult.rowCount === 0) {
      console.log('⚠️ No user found with email: miriamwambui094@gmail.com');
      await client.query('ROLLBACK');
      return;
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    // Display success message and updated user info
    const updatedUser = updateResult.rows[0];
    console.log('✅ Phone number updated successfully!');
    console.log('📊 Updated user info:');
    console.log(`   ID: ${updatedUser.id}`);
    console.log(`   Name: ${updatedUser.otherNames} ${updatedUser.surname}`);
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   Phone: ${updatedUser.telephone1}`);
    
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('❌ Error updating phone number:', error.message);
  } finally {
    // Release client back to pool
    client.release();
    // Close pool
    pool.end();
  }
}

// Run the function
updateMiriamPhone().catch(err => {
  console.error('Script execution failed:', err);
  process.exit(1);
});