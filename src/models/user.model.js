// src/models/user.model.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
 name: {
   type: String,
   required: [true, 'Please provide your name'],
   trim: true
 },
 email: {
   type: String,
   required: [true, 'Please provide your email'],
   unique: true,
   trim: true,
   lowercase: true,
   match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
 },
 password: {
   type: String,
   required: [true, 'Please provide a password'],
   minlength: [8, 'Password must be at least 8 characters'],
   select: false
 },
 role: {
   type: String,
   enum: ['patient', 'doctor', 'admin', 'staff'],
   default: 'patient'
 },
 isEmailVerified: {
   type: Boolean,
   default: false
 },
 emailVerificationToken: {
   type: String,
   select: false
 },
 emailVerificationCode: {
   type: String,
   select: false
 },
 emailVerificationExpires: {
   type: Date,
   select: false
 },
 resetPasswordToken: {
   type: String,
   select: false
 },
 resetPasswordExpires: {
   type: Date,
   select: false
 },
 twoFactorSecret: {
   type: String,
   select: false
 },
 twoFactorEnabled: {
   type: Boolean,
   default: false
 },
 lastLogin: Date,
 isActive: {
   type: Boolean,
   default: true
 },
 loginAttempts: {
   type: Number,
   default: 0
 },
 lockUntil: Date
}, {
 timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
 if (!this.isModified('password')) return next();

 try {
   const salt = await bcrypt.genSalt(10);
   this.password = await bcrypt.hash(this.password, salt);
   next();
 } catch (error) {
   next(error);
 }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    console.log('Password comparison debug:', {
      candidatePasswordLength: candidatePassword.length,
      storedPasswordLength: this.password.length,
      candidatePassword: candidatePassword,
      storedPassword: this.password // In development only
    });
    
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    console.log('bcrypt.compare result:', isMatch);
    return isMatch;
  } catch (error) {
    console.error('Password comparison error:', error);
    throw error;
  }
};

// Generate JWT token
userSchema.methods.generateAuthToken = function() {
 return jwt.sign(
   { id: this._id, role: this.role },
   process.env.JWT_SECRET,
   { expiresIn: process.env.JWT_EXPIRE }
 );
};

// Generate verification token
userSchema.methods.generateVerificationToken = function() {
 const verificationToken = crypto.randomBytes(32).toString('hex');
 
 this.emailVerificationToken = crypto
   .createHash('sha256')
   .update(verificationToken)
   .digest('hex');
   
 this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
 
 return verificationToken;
};

// Generate password reset token
userSchema.methods.generateResetToken = function() {
 const resetToken = crypto.randomBytes(32).toString('hex');
 
 this.resetPasswordToken = crypto
   .createHash('sha256')
   .update(resetToken)
   .digest('hex');
   
 this.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
 
 return resetToken;
};

module.exports = mongoose.model('User', userSchema);