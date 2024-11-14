const app = require('./src/app');
const mongoose = require('mongoose'); // Add this import
const connectDB = require('./src/config/database');
const seedUsers = require('./src/utils/seedUsers');

// Constants
const PORT = process.env.PORT || 10000; // Changed to match Render's detected port

// Graceful shutdown function
const gracefulShutdown = (server) => {
  console.log('\n🛑 Received shutdown signal. Starting graceful shutdown...');
  
  server.close(async () => {
    console.log('🔄 Closing remaining connections...');
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed.');
      }
      
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

// Health check endpoint
app.get('/health', (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    responsetime: process.hrtime(),
    message: 'OK',
    timestamp: Date.now(),
    mongoConnection: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  };
  try {
    res.status(200).json(healthcheck);
  } catch (e) {
    healthcheck.message = e;
    res.status(503).json(healthcheck);
  }
});

// Database connection with retry logic
const connectWithRetry = async (retries = 5) => {
  try {
    await connectDB();
    console.log('✅ Database connected successfully');
    return true;
  } catch (err) {
    if (retries > 0) {
      console.log(`🔄 Retrying database connection... Attempts left: ${retries}`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      return connectWithRetry(retries - 1);
    }
    throw err;
  }
};

// Server startup function
const startServer = async () => {
  try {
    console.log('\n🚀 Starting server...');
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

    // Connect to database with retry mechanism
    await connectWithRetry();
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n📦 Development environment detected, starting seeding...');
      await seedUsers();
    }

    const server = app.listen(PORT, () => {
      console.log(`\n✅ Server running on port ${PORT}`);
      console.log(`http://localhost:${PORT}`);
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('\nSeeded User Credentials:');
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
    https.get('https://zuri-8f5l.onrender.com/health', (resp) => {
      if (resp.statusCode === 200) {
        console.log('Keep-alive ping successful');
      }
    }).on('error', (err) => {
      console.error('Keep-alive ping failed:', err.message);
    });
  }, 14 * 60 * 1000); // Ping every 14 minutes to prevent sleep
}

startServer();