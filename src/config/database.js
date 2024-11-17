// src/config/database.js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: process.env.NODE_ENV === 'development' ? console.log : false
});

const connectDB = async () => {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not defined in environment variables');
    }

    // Test the connection
    await sequelize.authenticate();
    console.log('PostgreSQL Connected');

    // Sync models with database in development
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('Database synced');
    }

  } catch (error) {
    console.error('PostgreSQL connection error:', error.message);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  try {
    await sequelize.close();
    console.log('PostgreSQL connection closed through app termination');
    process.exit(0);
  } catch (err) {
    console.error('Error during PostgreSQL disconnection:', err);
    process.exit(1);
  }
});

module.exports = { connectDB, sequelize };