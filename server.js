const app = require('./src/app');
const connectDB = require('./src/config/database');
const seedUsers = require('./src/utils/seedUsers');

// Constants
const PORT = process.env.PORT || 5000;
const MAX_RETRIES = 5;
const RETRY_DELAY = 5000;

// Graceful shutdown function
const gracefulShutdown = (server) => {
  console.log('\n🛑 Received shutdown signal. Starting graceful shutdown...');
  
  server.close(async () => {
    console.log('🔄 Closing remaining connections...');
    try {
      // Close MongoDB connection
      await mongoose.connection.close();
      console.log('✅ MongoDB connection closed.');
      
      console.log('👋 Server shut down gracefully');
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

// Database connection with retry logic
const connectWithRetry = async (retries = MAX_RETRIES) => {
  try {
    await connectDB();
    console.log('✅ Database connected successfully');
    return true;
  } catch (err) {
    console.error(`❌ Database connection attempt failed. Retries left: ${retries}`);
    if (retries > 0) {
      console.log(`🔄 Retrying in ${RETRY_DELAY/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return connectWithRetry(retries - 1);
    }
    throw new Error('Failed to connect to database after multiple retries');
  }
};

// Server startup function
const startServer = async () => {
  try {
    console.log('\n🚀 Starting server...');
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

    // Connect to database with retry mechanism
    await connectWithRetry();
    
    // Seed users in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n📦 Development environment detected, starting seeding...');
      await seedUsers();
    }

    // Add health check endpoint
    app.get('/health', (req, res) => {
      const healthcheck = {
        uptime: process.uptime(),
        message: 'OK',
        timestamp: Date.now()
      };
      try {
        res.send(healthcheck);
      } catch (e) {
        healthcheck.message = e;
        res.status(503).send();
      }
    });

    // Start server
    const server = app.listen(PORT, () => {
      console.log(`\n✅ Server running on port ${PORT}`);
      console.log(`http://localhost:${PORT}\n`);
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('Seeded User Credentials:');
        console.log('Admin:');
        console.log('  Email: admin@zurihealth.com');
        console.log('  Password: Admin@123');
        console.log('\nDoctor:');
        console.log('  Email: doctor@zurihealth.com');
        console.log('  Password: Doctor@123\n');
      }
    });

    // Handle errors after initial connection
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
    });

    // Setup graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown(server));
    process.on('SIGINT', () => gracefulShutdown(server));

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      gracefulShutdown(server);
    });

  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
};

startServer();