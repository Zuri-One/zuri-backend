const { Pool } = require('pg');

// Get database URL from environment variable
const databaseUrl = process.env.DATABASE_URL || 'postgresql://zurihealth_owner:Gqt8RyVAUwb6@ep-wandering-lab-a5b0n3ej.us-east-2.aws.neon.tech/zurihealth?sslmode=require';

// Create a new pool instance
const pool = new Pool({
  connectionString: databaseUrl,
});

// Function to update Rose Mutua's email
async function updateRoseEmail() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting update...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Update Rose Mutua's email address
    const updateResult = await client.query(
      'UPDATE "Users" SET "email" = $1 WHERE "surname" = $2 AND "otherNames" = $3 RETURNING "id", "surname", "otherNames", "email", "telephone1"',
      ['kaninir63@gmail.com', 'Mutua', 'Rose']
    );
    
    // Check if any row was updated
    if (updateResult.rowCount === 0) {
      console.log('⚠️ No user found with name: Rose Mutua');
      await client.query('ROLLBACK');
      return;
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    // Display success message and updated user info
    const updatedUser = updateResult.rows[0];
    console.log('✅ Email address updated successfully!');
    console.log('📊 Updated user info:');
    console.log(`   ID: ${updatedUser.id}`);
    console.log(`   Name: ${updatedUser.otherNames} ${updatedUser.surname}`);
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   Phone: ${updatedUser.telephone1}`);
    
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('❌ Error updating email address:', error.message);
  } finally {
    // Release client back to pool
    client.release();
    // Close pool
    pool.end();
  }
}

// Run the function
updateRoseEmail().catch(err => {
  console.error('Script execution failed:', err);
  process.exit(1);
});