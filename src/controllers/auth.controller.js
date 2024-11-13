const crypto = require('crypto');
const User = require('../models/user.model');
const sendEmail = require('../utils/email.util');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const { 
  generateVerificationEmail, 
  generateResetPasswordEmail, 
  generate2FAEmail 
} = require('../utils/email-templates.util');


const generateVerificationCode = () => {
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
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(403).json({
        message: 'Account is locked. Please try again later'
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Increment login attempts
      user.loginAttempts += 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = Date.now() + 15 * 60 * 1000; // Lock for 15 minutes
      }
      await user.save();

      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    // Reset login attempts on successful login
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = Date.now();
    await user.save();

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(401).json({
        message: 'Please verify your email first'
      });
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      const tempToken = jwt.sign(
        { id: user._id, require2FA: true },
        process.env.JWT_SECRET,
        { expiresIn: '5m' }
      );

      return res.json({
        require2FA: true,
        tempToken
      });
    }

    // Generate token
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

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message: 'No account found with this email'
      });
    }

    // Generate reset token
    const resetToken = user.generateResetToken();
    await user.save();

    // Generate reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;

    try {
      await sendEmail({
        to: user.email,
        subject: 'Password Reset Request',
        html: `
          <h1>You have requested a password reset</h1>
          <p>Please click the link below to reset your password:</p>
          <a href="${resetUrl}">Reset Password</a>
          <p>This link is valid for 1 hour.</p>
          <p>If you did not request this, please ignore this email.</p>
        `
      });

      res.json({
        message: 'Password reset email sent'
      });
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      return res.status(500).json({
        message: 'Error sending email'
      });
    }
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Hash token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired reset token'
      });
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({
      message: 'Password reset successful'
    });
  } catch (error) {
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