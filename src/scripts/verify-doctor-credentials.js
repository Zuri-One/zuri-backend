const mongoose = require('mongoose');
const User = require('../models/user.model');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/database');

const verifyAndFixCredentials = async () => {
  try {
    // Use the same database connection as server
    await connectDB();
    console.log('Connected to database');

    // First, let's delete the existing doctor
    await User.deleteOne({ email: 'doctor@zurihealth.com' });
    console.log('Existing doctor account removed');

    // Create new password hash
    const password = 'Doctor@123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create new doctor account
    const newDoctor = await User.create({
      name: 'Dr. John Doe',
      email: 'doctor@zurihealth.com',
      password: hashedPassword,
      role: 'DOCTOR',
      isEmailVerified: true,
      specialization: 'General Medicine'
    });

    console.log('New doctor account created');

    // Verify the password
    const storedDoctor = await User.findById(newDoctor._id).select('+password');
    const testPass = 'Doctor@123';
    const verificationResult = await bcrypt.compare(testPass, storedDoctor.password);

    console.log('Verification test:', {
      email: 'doctor@zurihealth.com',
      testPassword: testPass,
      passwordHash: storedDoctor.password,
      verificationSuccess: verificationResult
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

verifyAndFixCredentials();