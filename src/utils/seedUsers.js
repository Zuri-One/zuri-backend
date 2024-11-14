const User = require('../models/user.model');
const bcrypt = require('bcryptjs');

const seedUsers = async () => {
  try {
    await User.deleteMany({});
    console.log('\n🗑️  Cleared existing users');

    // Create doctor by letting the model handle password hashing
    const doctor = new User({
      name: 'Dr. John Doe',
      email: 'kgicha@gmail.com',
      password: 'Doctor@123', // Plain password - let model hash it
      role: 'doctor',
      isEmailVerified: true
    });
    await doctor.save();

    // Create admin account
    const admin = new User({
      name: 'System Admin',
      email: 'admin@zurihealth.com',
      password: 'Admin@123', // Plain password - let model hash it
      role: 'admin',
      isEmailVerified: true
    });
    await admin.save();

    const patient = new User({
      name: 'System Admin',
      email: 'wambiriisaac@gmail.com',
      password: 'Admin@123', // Plain password - let model hash it
      role: 'patient',
      isEmailVerified: true
    });
    await patient.save();

    console.log('\n✅ Users seeded successfully');
    console.log('\nTest credentials:');
    console.log('Doctor - email: doctor@zurihealth.com, password: Doctor@123');
    console.log('Admin - email: admin@zurihealth.com, password: Admin@123');

  } catch (error) {
    console.error('\n❌ Error seeding users:', error);
    throw error;
  }
};

module.exports = seedUsers;