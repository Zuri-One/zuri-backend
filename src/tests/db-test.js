require('dotenv').config();
const { connectDB, sequelize } = require('../config/database');
const { User, Appointment, DoctorAvailability } = require('../models');

const testDatabase = async () => {
  try {
    console.log('\n🔄 Testing database connection...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected successfully');

    // Test User creation
    console.log('\n🔄 Testing User model...');
    const testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'Test@123',
      role: 'DOCTOR',
      isEmailVerified: true
    });
    console.log('✅ User created successfully:', {
      id: testUser.id,
      name: testUser.name,
      email: testUser.email
    });

    // Test DoctorAvailability
    console.log('\n🔄 Testing DoctorAvailability model...');
    const availability = await DoctorAvailability.create({
      doctorId: testUser.id,
      slots: [{
        day: 'monday',
        startTime: '09:00',
        endTime: '17:00',
        isAvailable: true
      }],
      exceptions: []
    });
    console.log('✅ DoctorAvailability created successfully');

    // Test Appointment
    console.log('\n🔄 Testing Appointment model...');
    const appointment = await Appointment.create({
      patientId: testUser.id, // Using same user as patient for test
      doctorId: testUser.id,
      dateTime: new Date(),
      type: 'video',
      reason: 'Test appointment',
      status: 'pending'
    });
    console.log('✅ Appointment created successfully');

    // Test associations
    console.log('\n🔄 Testing associations...');
    const doctorWithAppointments = await User.findByPk(testUser.id, {
      include: [
        {
          model: Appointment,
          as: 'doctorAppointments'
        },
        {
          model: DoctorAvailability
        }
      ]
    });
    console.log('✅ Associations working correctly');

    // Cleanup test data
    console.log('\n🔄 Cleaning up test data...');
    await appointment.destroy();
    await availability.destroy();
    await testUser.destroy();
    console.log('✅ Test data cleaned up successfully');

    await sequelize.close();
    console.log('\n✅ All tests completed successfully');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
};

testDatabase();