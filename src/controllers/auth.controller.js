const crypto = require('crypto');
const User = require('../models/user.model');
const sendEmail = require('../utils/email.util');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const { 
  generateVerificationEmail, 
  generateResetPasswordEmail, 
  generate2FAEmail,
  generatePasswordResetEmail,
  generatePasswordChangeConfirmationEmail
} = require('../utils/email-templates.util');



const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateResetCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

exports.verifyEmailWithCode = async (req, res, next) => {
  try {
    const { email, code } = req.body;

    console.log('Verification attempt:', { email, code });

    // Include emailVerificationCode in the query using select
    const user = await User.findOne({ email }).select('+emailVerificationCode');
    
    if (!user) {
      console.log('User not found');
      return res.status(400).json({
        message: 'Invalid or expired verification code'
      });
    }

    console.log('Stored verification code:', user.emailVerificationCode);
    console.log('Received code:', code);
    console.log('Verification expires:', user.emailVerificationExpires);
    console.log('Current time:', new Date());

    // Check if code matches and is not expired
    if (
      user.emailVerificationCode !== code || 
      user.emailVerificationExpires < Date.now()
    ) {
      console.log('Code mismatch or expired');
      return res.status(400).json({
        message: 'Invalid or expired verification code'
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({
      message: 'Email verified successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Verification error:', error);
    next(error);
  }
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        message: 'Email already registered'
      });
    }

    // Generate verification code and token
    const verificationCode = generateVerificationCode();
    const verificationToken = crypto.randomBytes(32).toString('hex');

    console.log('Generated verification code:', verificationCode);

    // Create new user document
    const newUser = new User({
      name,
      email,
      password,
      emailVerificationCode: verificationCode, // Save the verification code
      emailVerificationToken: crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex'),
      emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000
    });

    // Save the user
    user = await newUser.save();

    // Generate verification URL
    const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}`;

    // Send verification email with both link and code
    await sendEmail({
      to: user.email,
      subject: 'Verify your email',
      html: generateVerificationEmail(user.name, verificationUrl, verificationCode)
    });

    res.status(201).json({
      message: 'Registration successful. Please verify your email.',
      userId: user._id
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;
    console.log('\nLogin attempt:', { email, role });

    // Explicitly select password and check role
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      role 
    }).select('+password');

    console.log('User found:', user ? {
      id: user._id,
      email: user.email,
      role: user.role,
      hasPassword: !!user.password,
      passwordHash: user.password
    } : 'No user found');

    if (!user) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    // Test password directly with bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password verification:', {
      providedPassword: password,
      correctHash: user.password,
      isMatch: isMatch
    });

    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    // Generate token and complete login
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    next(error);
  }
};

exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    // Hash token
    const emailVerificationToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with token
    const user = await User.findOne({
      emailVerificationToken,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired verification token'
      });
    }

    // Update user
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({
      message: 'Email verified successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        message: 'Email already verified'
      });
    }

    // Generate new verification token
    const verificationToken = user.generateVerificationToken();
    await user.save();

    // Generate verification URL
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    // Send verification email
    await sendEmail({
      to: user.email,
      subject: 'Email Verification',
      html: generateVerificationEmail(user.name, verificationUrl)
    });

    res.json({
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    console.log('Password reset requested for:', email);

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // We'll still send a success message even if user not found (security best practice)
    if (!user) {
      console.log('No user found with email:', email);
      return res.status(200).json({
        message: 'If this email exists, you will receive a password reset code'
      });
    }

    console.log('User found:', { userId: user._id, email: user.email });

    // Generate reset code
    const resetCode = generateResetCode();
    console.log('Generated reset code for user:', resetCode);

    // Hash reset code
    const hashedResetCode = crypto
      .createHash('sha256')
      .update(resetCode)
      .digest('hex');

    // Update user with reset code
    user.resetPasswordToken = hashedResetCode;
    user.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
    await user.save();

    // Send email using the template from utils
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Code - Zuri Health',
      html: generatePasswordResetEmail(user.name, resetCode)
    });

    console.log('Reset code email sent successfully to:', email);

    res.status(200).json({
      message: 'If this email exists, you will receive a password reset code'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      message: 'An error occurred while processing your request'
    });
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { code, password } = req.body;

    // Hash the provided code for comparison
    const hashedCode = crypto
      .createHash('sha256')
      .update(code)
      .digest('hex');

    // Find user with valid reset code
    const user = await User.findOne({
      resetPasswordToken: hashedCode,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired reset code'
      });
    }

    // Validate new password
    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters long'
      });
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Send password change confirmation email
    await sendEmail({
      to: user.email,
      subject: 'Password Changed Successfully - Zuri Health',
      html: generatePasswordChangeConfirmationEmail(user.name)
    });

    res.json({
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    next(error);
  }
};


exports.enable2FA = async (req, res, next) => {
  try {
    const { id } = req.user;
    
    const secret = speakeasy.generateSecret({
      name: `HMS:${req.user.email}`
    });

    const user = await User.findById(id);
    user.twoFactorSecret = secret.base32;
    user.twoFactorEnabled = true;
    await user.save();

    // Send email notification
    await sendEmail({
      to: user.email,
      subject: '2FA Enabled',
      html: `
        <h1>Two-Factor Authentication Enabled</h1>
        <p>2FA has been successfully enabled for your account.</p>
        <p>If you did not enable this, please contact support immediately.</p>
      `
    });

    res.json({
      message: '2FA enabled successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.verify2FA = async (req, res, next) => {
  try {
    const { tempToken, code } = req.body;

    const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    if (!decoded.require2FA) {
      return res.status(400).json({
        message: 'Invalid token'
      });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Verify 2FA code
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 2 // Allow for some time drift
    });

    if (!verified) {
      return res.status(401).json({
        message: 'Invalid 2FA code'
      });
    }

    // Generate final token
    const token = user.generateAuthToken();

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};