const app = require('./src/app');
const connectDB = require('./src/config/database');
const seedUsers = require('./src/utils/seedUsers');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    console.log('\n🚀 Starting server...');
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

    await connectDB();
    console.log('✅ Database connected successfully');
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n📦 Development environment detected, starting seeding...');
      await seedUsers();
    }

    app.listen(PORT, () => {
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
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
};

startServer();