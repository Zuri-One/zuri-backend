// add-metadata-column.js
// Run this script once to add the metadata column to your LabTests table

const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const addMetadataColumn = async () => {
  console.log('🔄 Starting metadata column addition script...');
  
  // Create connection to database
  const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: console.log
  });

  try {
    // Test connection
    console.log('🔗 Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful');

    // Check if column already exists
    console.log('🔍 Checking if metadata column already exists...');
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'LabTests' AND column_name = 'metadata'
    `);

    if (results.length > 0) {
      console.log('✅ metadata column already exists, no action needed');
      return;
    }

    console.log('📝 metadata column does not exist, adding it...');

    // Add the metadata column
    await sequelize.query(`
      ALTER TABLE "LabTests" 
      ADD COLUMN metadata JSONB DEFAULT NULL
    `);

    console.log('✅ Successfully added metadata column');

    // Add GIN index for better JSONB performance
    console.log('🔄 Adding GIN index on metadata column...');
    try {
      await sequelize.query(`
        CREATE INDEX CONCURRENTLY lab_tests_metadata_gin_idx 
        ON "LabTests" USING gin (metadata)
      `);
      console.log('✅ Successfully added GIN index on metadata column');
    } catch (indexError) {
      console.log('⚠️  Could not add GIN index (this is optional):', indexError.message);
    }

    // Verify the column was added
    console.log('🔍 Verifying column was added...');
    const [verifyResults] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'LabTests' AND column_name = 'metadata'
    `);

    if (verifyResults.length > 0) {
      console.log('✅ Verification successful:', verifyResults[0]);
    } else {
      console.log('❌ Verification failed - column not found');
    }

  } catch (error) {
    console.error('❌ Error adding metadata column:', error);
    throw error;
  } finally {
    // Close connection
    await sequelize.close();
    console.log('🔌 Database connection closed');
  }
};

// Run the script
addMetadataColumn()
  .then(() => {
    console.log('🎉 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });