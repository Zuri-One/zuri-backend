// src/scripts/resetDb.js
require('dotenv').config();
const { Sequelize } = require('sequelize');

const resetDatabase = async () => {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: true
  });

  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    console.log('🔄 Dropping all tables...');
    
    // Get all table names
    const [tables] = await sequelize.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public';
    `);

    // Drop enum types
    const [enums] = await sequelize.query(`
      SELECT typname 
      FROM pg_type 
      JOIN pg_enum ON pg_type.oid = pg_enum.enumtypid 
      GROUP BY typname;
    `);

    // Drop tables
    for (const table of tables) {
      await sequelize.query(`DROP TABLE IF EXISTS "${table.tablename}" CASCADE;`);
      console.log(`Dropped table: ${table.tablename}`);
    }

    // Drop enums
    for (const enum_type of enums) {
      await sequelize.query(`DROP TYPE IF EXISTS "${enum_type.typname}" CASCADE;`);
      console.log(`Dropped enum type: ${enum_type.typname}`);
    }

    console.log('✅ Database reset successful');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  }
};

resetDatabase();