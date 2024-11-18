// src/server.js
const app = require('./src/app');
const { sequelize } = require('./src/config/database');
const { User } = require('./src/models');

// Constants
const PORT = process.env.PORT || 10000;

// Graceful shutdown function
const gracefulShutdown = async (server) => {
  console.log('\n🛑 Received shutdown signal. Starting graceful shutdown...');
  
  server.close(async () => {
    console.log('🔄 Closing remaining connections...');
    try {
      await sequelize.close();
      console.log('✅ Database connection closed.');
      process.exit(0);
    } catch (err) {
      console.error('❌ Error during shutdown:', err);
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('⚠️ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

// Server startup function
const startServer = async () => {
  try {
    console.log('\n🚀 Starting server...');
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.');

    // Sync models in development (be careful with this in production)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Database synchronized');
    }

    // Seed initial data in development
    if (process.env.NODE_ENV === 'development') {
      const adminExists = await User.findOne({
        where: { email: 'admin@zurihealth.com' }
      });

      if (!adminExists) {
        console.log('\n📦 Seeding initial data...');
        // You can move this to a separate seeder file
        await require('./src/seeders/20241117000000-demo-users').up(sequelize.queryInterface, sequelize);
        console.log('✅ Initial data seeded');
      }
    }

    const server = app.listen(PORT, () => {
      console.log(`\n✅ Server running on port ${PORT}`);
      console.log(`http://localhost:${PORT}`);
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('\nTest Credentials:');
        console.log('Admin:');
        console.log('  Email: admin@zurihealth.com');
        console.log('  Password: Admin@123');
        console.log('Doctor:');
        console.log('  Email: doctor@zurihealth.com');
        console.log('  Password: Doctor@123');
      }
    });

    // Setup graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown(server));
    process.on('SIGINT', () => gracefulShutdown(server));

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
};

// Keep-alive ping for Render free tier
if (process.env.NODE_ENV === 'production') {
  const https = require('https');
  setInterval(() => {
    https.get(process.env.RENDER_EXTERNAL_URL || 'https://zuri-8f5l.onrender.com/health', (resp) => {
      if (resp.statusCode === 200) {
        console.log('Keep-alive ping successful');
      }
    }).on('error', (err) => {
      console.error('Keep-alive ping failed:', err.message);
    });
  }, 14 * 60 * 1000); // Ping every 14 minutes
}

startServer();