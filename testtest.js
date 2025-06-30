// create-ccp-table.js
// Run this script once to create the CCPs table if it doesn't exist

const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const createCCPTable = async () => {
  console.log('🔄 Starting CCP table creation script...');
  
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

    // Check if table already exists
    console.log('🔍 Checking if CCPs table already exists...');
    const [tableResults] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'CCPs'
    `);

    if (tableResults.length > 0) {
      console.log('✅ CCPs table already exists, no action needed');
      
      // Optionally check if all required columns exist
      console.log('🔍 Verifying table structure...');
      const [columnResults] = await sequelize.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'CCPs'
        ORDER BY ordinal_position
      `);
      
      console.log('📋 Current table columns:');
      columnResults.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      return;
    }

    console.log('📝 CCPs table does not exist, creating it...');

    // Create the CCPs table
    await sequelize.query(`
      CREATE TABLE "CCPs" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        
        -- Patient reference
        "patientId" UUID NOT NULL REFERENCES "Patients"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        
        -- Follow-up scheduling
        "nextFollowupDate" TIMESTAMP WITH TIME ZONE,
        "dueFollowupDate" TIMESTAMP WITH TIME ZONE,
        "followupFrequency" VARCHAR(20) NOT NULL DEFAULT '1_MONTH' 
          CHECK ("followupFrequency" IN ('1_WEEK', '2_WEEKS', '1_MONTH', '2_MONTHS', '3_MONTHS', '6_MONTHS', '12_MONTHS')),
        "followupFrequencyValue" INTEGER NOT NULL DEFAULT 1,
        "followupFrequencyUnit" VARCHAR(10) NOT NULL DEFAULT 'MONTH' 
          CHECK ("followupFrequencyUnit" IN ('WEEK', 'MONTH', 'YEAR')),
        
        -- Follow-up status tracking
        "isFollowupCompleted" BOOLEAN NOT NULL DEFAULT FALSE,
        "followupMonth" INTEGER NOT NULL CHECK ("followupMonth" BETWEEN 1 AND 12),
        "followupYear" INTEGER NOT NULL CHECK ("followupYear" BETWEEN 2020 AND 2050),
        
        -- Feedback and notes
        "followupFeedback" TEXT,
        "consultationFeedback" TEXT,
        
        -- Additional tracking fields
        "scheduledBy" UUID REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "completedBy" UUID REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        
        "followupType" VARCHAR(20) NOT NULL DEFAULT 'ROUTINE' 
          CHECK ("followupType" IN ('ROUTINE', 'URGENT', 'MEDICATION_REVIEW', 'LAB_FOLLOWUP', 'SYMPTOM_CHECK', 'EMERGENCY')),
        "followupMode" VARCHAR(20) NOT NULL DEFAULT 'IN_PERSON' 
          CHECK ("followupMode" IN ('IN_PERSON', 'PHONE_CALL', 'VIDEO_CALL', 'SMS', 'HOME_VISIT')),
        
        -- Clinical indicators
        "vitalSigns" JSONB DEFAULT '{}',
        "symptomsAssessment" JSONB DEFAULT '{}',
        "medicationCompliance" VARCHAR(20) CHECK ("medicationCompliance" IN ('EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'NON_COMPLIANT')),
        
        -- Follow-up outcomes
        "actionItems" JSONB DEFAULT '[]',
        "referralsNeeded" JSONB DEFAULT '[]',
        "labTestsOrdered" JSONB DEFAULT '[]',
        
        -- Status and priority
        "status" VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED' 
          CHECK ("status" IN ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED')),
        "priority" VARCHAR(10) NOT NULL DEFAULT 'NORMAL' 
          CHECK ("priority" IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
        
        -- Timing
        "actualFollowupDate" TIMESTAMP WITH TIME ZONE,
        "duration" INTEGER, -- Duration in minutes
        
        -- Notes
        "privateNotes" TEXT,
        "patientNotes" TEXT,
        
        -- Timestamps
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        
        -- Unique constraint: one followup per patient per month/year
        CONSTRAINT "unique_patient_month_year" UNIQUE ("patientId", "followupMonth", "followupYear")
      )
    `);

    console.log('✅ Successfully created CCPs table');

    // Create indexes for better performance
    console.log('🔄 Creating indexes...');
    
    const indexes = [
      {
        name: 'idx_ccps_patient_id',
        sql: 'CREATE INDEX "idx_ccps_patient_id" ON "CCPs" ("patientId")'
      },
      {
        name: 'idx_ccps_followup_month_year',
        sql: 'CREATE INDEX "idx_ccps_followup_month_year" ON "CCPs" ("followupMonth", "followupYear")'
      },
      {
        name: 'idx_ccps_is_followup_completed',
        sql: 'CREATE INDEX "idx_ccps_is_followup_completed" ON "CCPs" ("isFollowupCompleted")'
      },
      {
        name: 'idx_ccps_next_followup_date',
        sql: 'CREATE INDEX "idx_ccps_next_followup_date" ON "CCPs" ("nextFollowupDate")'
      },
      {
        name: 'idx_ccps_status',
        sql: 'CREATE INDEX "idx_ccps_status" ON "CCPs" ("status")'
      },
      {
        name: 'idx_ccps_priority',
        sql: 'CREATE INDEX "idx_ccps_priority" ON "CCPs" ("priority")'
      }
    ];

    for (const index of indexes) {
      try {
        await sequelize.query(index.sql);
        console.log(`✅ Created index: ${index.name}`);
      } catch (indexError) {
        console.log(`⚠️  Could not create index ${index.name}:`, indexError.message);
      }
    }

    // Create GIN indexes for JSONB columns
    console.log('🔄 Creating GIN indexes for JSONB columns...');
    
    const ginIndexes = [
      {
        name: 'ccps_vital_signs_gin_idx',
        sql: 'CREATE INDEX CONCURRENTLY "ccps_vital_signs_gin_idx" ON "CCPs" USING gin ("vitalSigns")'
      },
      {
        name: 'ccps_symptoms_assessment_gin_idx',
        sql: 'CREATE INDEX CONCURRENTLY "ccps_symptoms_assessment_gin_idx" ON "CCPs" USING gin ("symptomsAssessment")'
      },
      {
        name: 'ccps_action_items_gin_idx',
        sql: 'CREATE INDEX CONCURRENTLY "ccps_action_items_gin_idx" ON "CCPs" USING gin ("actionItems")'
      },
      {
        name: 'ccps_referrals_needed_gin_idx',
        sql: 'CREATE INDEX CONCURRENTLY "ccps_referrals_needed_gin_idx" ON "CCPs" USING gin ("referralsNeeded")'
      },
      {
        name: 'ccps_lab_tests_ordered_gin_idx',
        sql: 'CREATE INDEX CONCURRENTLY "ccps_lab_tests_ordered_gin_idx" ON "CCPs" USING gin ("labTestsOrdered")'
      }
    ];

    for (const ginIndex of ginIndexes) {
      try {
        await sequelize.query(ginIndex.sql);
        console.log(`✅ Created GIN index: ${ginIndex.name}`);
      } catch (ginError) {
        console.log(`⚠️  Could not create GIN index ${ginIndex.name} (this is optional):`, ginError.message);
      }
    }

    // Create trigger for updating updatedAt
    console.log('🔄 Creating updatedAt trigger...');
    try {
      await sequelize.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW."updatedAt" = NOW();
          RETURN NEW;
        END;
        $$ language 'plpgsql'
      `);
      
      await sequelize.query(`
        CREATE TRIGGER update_ccps_updated_at 
        BEFORE UPDATE ON "CCPs" 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `);
      
      console.log('✅ Created updatedAt trigger');
    } catch (triggerError) {
      console.log('⚠️  Could not create updatedAt trigger:', triggerError.message);
    }

    // Verify the table was created with all columns
    console.log('🔍 Verifying table creation...');
    const [verifyColumns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'CCPs'
      ORDER BY ordinal_position
    `);

    console.log('📋 Created table with columns:');
    verifyColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}) ${col.column_default ? `default: ${col.column_default}` : ''}`);
    });

    // Verify constraints
    console.log('🔍 Verifying table constraints...');
    const [constraints] = await sequelize.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints 
      WHERE table_name = 'CCPs'
    `);

    console.log('🔒 Table constraints:');
    constraints.forEach(constraint => {
      console.log(`  - ${constraint.constraint_name}: ${constraint.constraint_type}`);
    });

    // Verify foreign keys
    console.log('🔍 Verifying foreign key relationships...');
    const [foreignKeys] = await sequelize.query(`
      SELECT 
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'CCPs'
    `);

    console.log('🔗 Foreign key relationships:');
    foreignKeys.forEach(fk => {
      console.log(`  - ${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });

    console.log('✅ Table verification completed successfully');

  } catch (error) {
    console.error('❌ Error creating CCPs table:', error);
    
    // If table creation failed, try to clean up
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Table creation conflict detected, this might be expected');
    } else {
      console.log('🧹 Attempting cleanup...');
      try {
        await sequelize.query('DROP TABLE IF EXISTS "CCPs" CASCADE');
        console.log('✅ Cleanup completed');
      } catch (cleanupError) {
        console.log('⚠️  Cleanup failed:', cleanupError.message);
      }
    }
    
    throw error;
  } finally {
    // Close connection
    await sequelize.close();
    console.log('🔌 Database connection closed');
  }
};

// Run the script
createCCPTable()
  .then(() => {
    console.log('🎉 Script completed successfully');
    console.log('');
    console.log('📝 Next steps:');
    console.log('  1. Verify that your CCP model matches the created table structure');
    console.log('  2. Run your application to test the new CCP functionality');
    console.log('  3. Create some test CCP followup records');
    console.log('');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('  1. Check that your database connection is working');
    console.log('  2. Ensure Patients and Users tables exist');
    console.log('  3. Verify you have CREATE TABLE permissions');
    console.log('  4. Check for any conflicting table names');
    console.log('');
    process.exit(1);
  });