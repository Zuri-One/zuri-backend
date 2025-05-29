// src/controllers/auth.controller.js
const crypto = require('crypto');
const { User, Department } = require('../models');
const {Patient} = require('../models');
const sendEmail = require('../utils/email.util');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const whatsappService = require('../services/whatsapp.service');
const { Op } = require('sequelize');
const { 
  generateVerificationEmail,
  generateResetPasswordEmail,
  generate2FAEmail,
  generatePasswordResetEmail,
  generatePasswordChangeConfirmationEmail
} = require('../utils/email-templates.util');



exports.registerAdmin = async (req, res, next) => {
  try {
    const {
      surname,
      otherNames,
      email,
      password,
      employeeId,
      telephone1,
      telephone2,
      gender,
      dateOfBirth,
      postalAddress,
      postalCode,
      town,
      areaOfResidence,
      idType,
      idNumber,
      nationality,
      designation
    } = req.body;

    // Validate required fields
    const requiredFields = [
      'surname',
      'otherNames',
      'email',
      'password',
      'employeeId',
      'telephone1',
      'gender',
      'dateOfBirth',
      'town',
      'areaOfResidence',
      'idType',
      'nationality'
    ];

    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Password strength validation
    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters long'
      });
    }

    // Check for existing email or employeeId
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { email: email.toLowerCase() },
          { employeeId }
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({
        message: existingUser.email === email.toLowerCase() ? 
          'Email already registered' : 
          'Employee ID already registered'
      });
    }

    // Create admin user without verification fields
    const user = await User.create({
      surname,
      otherNames,
      email: email.toLowerCase(),
      password: password, // bcrypt hashing happens in the User model's beforeSave hook
      role: 'ADMIN',
      employeeId,
      telephone1,
      telephone2,
      gender: gender.toUpperCase(),
      dateOfBirth,
      postalAddress,
      postalCode,
      town,
      areaOfResidence,
      idType,
      idNumber,
      nationality,
      designation,
      joiningDate: new Date(),
      isEmailVerified: true, // Skip email verification
      isActive: true,
      status: 'active'
    });

    // Log registration success and return response immediately
    console.log(`Admin registration successful for ${email}`);
    
    res.status(201).json({
      message: 'Admin registration successful',
      userId: user.id,
      employeeId: user.employeeId
    });

    // Generate reset token for initial password setup
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Update user with reset token
    user.resetPasswordToken = hashedResetToken;
    user.resetPasswordExpires = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours
    await user.save();

    // Create reset URL
    const resetUrl = `${process.env.BACKEND_URL}/api/v1/auth/reset-password-form?token=${resetToken}&setup=true`;

    // Send only the welcome email with password setup link
    try {
      await sendEmail({
        to: user.email,
        subject: 'Welcome to Zuri Health - Admin Account Created',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to Zuri Health - Admin Account</h2>
            <p>Dear ${user.surname} ${user.otherNames},</p>
            <p>Your administrator account has been successfully created with the following details:</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Email:</strong> ${user.email}</p>
              <p><strong>Employee ID:</strong> ${user.employeeId}</p>
              <p><strong>Role:</strong> Administrator</p>
            </div>
            
            <p>To set up your password and access the system, please click the button below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Set Your Password</a>
            </div>
            
            <p>This link will expire in 72 hours for security reasons.</p>
            
            <p>You can access the Zuri Health Management System at: <a href="${process.env.FRONTEND_URL}">${process.env.FRONTEND_URL}</a></p>
            
            <p>If you have any questions or need assistance, please contact the system support team.</p>
            <p>Best regards,<br>Zuri Health Team</p>
          </div>
        `
      });
      
      console.log(`Admin welcome email with password setup link sent to ${email}`);
    } catch (emailError) {
      console.error('Failed to send admin welcome email:', emailError);
      // Email failure doesn't affect registration success
    }

  } catch (error) {
    console.error('Admin registration error:', error);
    next(error);
  }
};


exports.resetPasswordForm = async (req, res, next) => {
  try {
    const { token, setup, error } = req.query;
    
    if (!token) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invalid Reset Link</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .error-container { background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="error-container">
            <h2>Invalid Reset Link</h2>
            <p>The password reset link is invalid or missing a required token.</p>
            <p>Please request a new password reset link.</p>
          </div>
        </body>
        </html>
      `);
    }
    
    // Verify token exists in database (without revealing if it's valid)
    // This just checks if any user has a reset token, without revealing which user
    const anyValidToken = await User.findOne({
      where: {
        resetPasswordToken: crypto.createHash('sha256').update(token).digest('hex'),
        resetPasswordExpires: { [Op.gt]: new Date() }
      }
    });
    
    // Render the form
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${setup === 'true' ? 'Set Your Password' : 'Reset Your Password'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f7f9fc;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 500px;
            margin: 40px auto;
            padding: 30px;
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          h1 {
            color: #2c3e50;
            margin-bottom: 20px;
            font-size: 24px;
          }
          .form-group {
            margin-bottom: 20px;
          }
          label {
            display: block;
            margin-bottom: 8px;
            font-weight: bold;
            color: #555;
          }
          input {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 16px;
            box-sizing: border-box;
          }
          button {
            background-color: #4CAF50;
            color: white;
            border: none;
            padding: 14px 0;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            width: 100%;
            font-weight: bold;
          }
          button:hover {
            background-color: #45a049;
          }
          .error-message {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 20px;
            display: ${error ? 'block' : 'none'};
          }
          .password-requirements {
            font-size: 13px;
            color: #666;
            margin-top: 8px;
          }
          .password-requirements ul {
            margin-top: 5px;
            padding-left: 15px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${setup === 'true' ? 'Set Your Password' : 'Reset Your Password'}</h1>
          </div>
          
          <div class="error-message" ${!error ? 'style="display:none"' : ''}>
            ${error || ''}
          </div>
          
          <form action="${process.env.BACKEND_URL}/api/v1/auth/process-password-reset" method="POST">
            <input type="hidden" name="token" value="${token}">
            <input type="hidden" name="setup" value="${setup === 'true' ? 'true' : 'false'}">
            
            <div class="form-group">
              <label for="password">New Password</label>
              <input type="password" id="password" name="password" required>
              <div class="password-requirements">
                Password requirements:
                <ul>
                  <li>At least 8 characters</li>
                  <li>At least one uppercase letter</li>
                  <li>At least one lowercase letter</li>
                  <li>At least one number</li>
                  <li>At least one special character</li>
                </ul>
              </div>
            </div>
            
            <div class="form-group">
              <label for="confirmPassword">Confirm New Password</label>
              <input type="password" id="confirmPassword" name="confirmPassword" required>
            </div>
            
            <button type="submit">${setup === 'true' ? 'Set Password' : 'Reset Password'}</button>
          </form>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error rendering reset form:', error);
    next(error);
  }
};

exports.processPasswordReset = async (req, res, next) => {
  try {
    const { token, password, confirmPassword, setup } = req.body;
    
    // Validate input
    if (!token) {
      return res.redirect(`/api/v1/auth/reset-password-form?error=Missing+token`);
    }
    
    if (!password || password.length < 8) {
      return res.redirect(`/api/v1/auth/reset-password-form?token=${token}&setup=${setup}&error=Password+must+be+at+least+8+characters+long`);
    }
    
    if (password !== confirmPassword) {
      return res.redirect(`/api/v1/auth/reset-password-form?token=${token}&setup=${setup}&error=Passwords+do+not+match`);
    }
    
    // Validate password strength
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    
    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      return res.redirect(`/api/v1/auth/reset-password-form?token=${token}&setup=${setup}&error=Password+must+include+uppercase+and+lowercase+letters,+numbers,+and+special+characters`);
    }
    
    // Hash the token to compare with stored hashed token
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    // Find user with this token
    const user = await User.findOne({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { [Op.gt]: new Date() }
      }
    });
    
    if (!user) {
      return res.redirect(`/api/v1/auth/reset-password-form?token=${token}&setup=${setup}&error=Invalid+or+expired+reset+token.+Please+request+a+new+password+reset+link.`);
    }
    
    // Update password
    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();
    
    // Send confirmation email
    await sendEmail({
      to: user.email,
      subject: `Password ${setup === 'true' ? 'Set' : 'Reset'} Successfully - Zuri Health`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password ${setup === 'true' ? 'Set' : 'Changed'} Successfully</h2>
          <p>Hello ${user.surname} ${user.otherNames},</p>
          <p>Your password for Zuri Health has been ${setup === 'true' ? 'set' : 'changed'} successfully.</p>
          <p>If you did not make this change, please contact our support team immediately.</p>
          <div style="margin: 30px 0; padding: 10px; background-color: #f5f5f5; border-left: 4px solid #4CAF50;">
            <p style="margin-top: 0;"><strong>Account Details:</strong></p>
            <p>Email: ${user.email}</p>
            <p>Role: ${user.role}</p>
            ${user.employeeId ? `<p>Employee ID: ${user.employeeId}</p>` : ''}
          </div>
          <p>You can now login with your ${setup === 'true' ? 'new' : ''} password.</p>
          <p>Best regards,<br>Zuri Health Team</p>
        </div>
      `
    });
    
    // Redirect to success page
    return res.redirect(`/api/v1/auth/password-reset-success?setup=${setup}`);
    
  } catch (error) {
    console.error('Error processing password reset:', error);
    return res.redirect(`/api/v1/auth/reset-password-form?token=${req.body.token || ''}&setup=${req.body.setup || ''}&error=An+unexpected+error+occurred.+Please+try+again.`);
  }
};

exports.passwordResetSuccess = (req, res) => {
  const { setup } = req.query;
  const isSetup = setup === 'true';
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Password ${isSetup ? 'Set' : 'Reset'} Successfully</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f7f9fc;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 500px;
          margin: 40px auto;
          padding: 30px;
          background-color: #fff;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          text-align: center;
        }
        .success-icon {
          font-size: 48px;
          color: #4CAF50;
          margin-bottom: 20px;
        }
        h1 {
          color: #2c3e50;
          margin-bottom: 20px;
          font-size: 24px;
        }
        .button {
          display: inline-block;
          background-color: #4CAF50;
          color: white;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 4px;
          font-weight: bold;
          margin-top: 20px;
        }
        .button:hover {
          background-color: #45a049;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="success-icon">✓</div>
        <h1>Password ${isSetup ? 'Set' : 'Reset'} Successfully</h1>
        <p>Your password has been ${isSetup ? 'set' : 'reset'} successfully.</p>
        <p>You can now log in to your account using your new password.</p>
        <a href="${process.env.FRONTEND_URL}/auth/staff-login" class="button">Go to Login</a>
      </div>
    </body>
    </html>
  `);
};


exports.staffLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    console.log('=== STAFF LOGIN ATTEMPT ===');
    console.log('Email:', email);
    console.log('Timestamp:', new Date().toISOString());

    // Find user and include department information
    const user = await User.findOne({ 
      where: { 
        email: email.toLowerCase(),
        role: {
          [Op.notIn]: ['PATIENT', 'ADMIN']  // Exclude patients and admin
        },
        isActive: true,  // Only active users can login
        status: 'active' // Only users with active status
      },
      include: [
        {
          model: Department,
          as: 'assignedDepartment',
          attributes: ['id', 'name']
        },
        {
          model: Department,
          as: 'primaryDepartment',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!user) {
      console.log('❌ User not found or invalid role/status for email:', email);
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    console.log('✅ User found:');
    console.log('- User ID:', user.id);
    console.log('- Name:', `${user.surname} ${user.otherNames}`);
    console.log('- Role:', user.role);
    console.log('- Phone 1:', user.telephone1 || 'Not set');
    console.log('- Phone 2:', user.telephone2 || 'Not set');
    console.log('- Email:', user.email);
    console.log('- Has Password:', user.password ? 'Yes' : 'No');
    console.log('- Is Active:', user.isActive);
    console.log('- Status:', user.status);

    // Check if password is set
    if (!user.password) {
      console.log('❌ Password is null - account setup incomplete');
      return res.status(401).json({
        message: 'Account setup incomplete. Please check your email for setup instructions or contact administrator.'
      });
    }

    // Check account lock (if you still have this method)
    if (typeof user.isAccountLocked === 'function' && user.isAccountLocked()) {
      console.log('❌ Account is locked');
      return res.status(401).json({
        message: 'Account is locked. Please try again later.'
      });
    }

    // Verify password
    console.log('🔒 Verifying password...');
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('❌ Password verification failed');
      
      // Increment login attempts (if you still have this method)
      if (typeof user.incrementLoginAttempts === 'function') {
        await user.incrementLoginAttempts();
        console.log('📈 Login attempts incremented');
      }
      
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    console.log('✅ Password verified successfully');

    // Reset login attempts on successful login (if you still have this method)
    if (typeof user.resetLoginAttempts === 'function') {
      await user.resetLoginAttempts();
      console.log('🔄 Login attempts reset');
    }

    // Generate verification code for 2FA
    const verificationCode = generateVerificationCode();
    console.log('🔢 Generated verification code:', verificationCode);
    
    // Store verification code and set expiry (5 minutes)
    user.emailVerificationCode = verificationCode;
    user.emailVerificationExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    await user.save();
    console.log('💾 Verification code saved to database');
    console.log('⏰ Code expires at:', user.emailVerificationExpires.toISOString());
    
    // Create a temporary token containing user info
    const tempToken = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        role: user.role,
        require2FA: true,
        exp: Math.floor(Date.now() / 1000) + (5 * 60) // 5 minutes expiry
      }, 
      process.env.JWT_SECRET
    );
    console.log('🎫 Temporary token generated');
    
    // Initialize verification tracking
    let verificationSent = false;
    let verificationMethod = null;
    let verificationErrors = [];
    
    console.log('\n=== OTP SENDING PROCESS ===');
    
    // Try to send verification code via WhatsApp first if phone exists
    if (user.telephone1) {
      console.log('📱 Attempting WhatsApp verification...');
      console.log('- Phone number:', user.telephone1);
      console.log('- Verification code:', verificationCode);
      
      try {
        await whatsappService.sendVerificationCode(user.telephone1, verificationCode);
        verificationSent = true;
        verificationMethod = 'whatsapp';
        console.log('✅ WhatsApp verification sent successfully');
      } catch (error) {
        console.error('❌ WhatsApp verification failed:');
        console.error('- Error message:', error.message);
        console.error('- Error stack:', error.stack);
        verificationErrors.push(`WhatsApp: ${error.message}`);
        // Fall back to email
      }
    } else {
      console.log('📱 No phone number available, skipping WhatsApp');
    }
    
    // Fall back to email if WhatsApp failed or no phone exists
    if (!verificationSent) {
      console.log('📧 Attempting email verification...');
      console.log('- Email address:', user.email);
      console.log('- Verification code:', verificationCode);
      
      try {
        const emailResult = await sendEmail({
          to: user.email,
          subject: 'Your verification code - Zuri Health',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Login Verification</h2>
              <p>Hello ${user.surname} ${user.otherNames},</p>
              <p>Your verification code is:</p>
              <div style="background: #f5f5f5; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; margin: 20px 0; font-weight: bold;">
                ${verificationCode}
              </div>
              <p>This code will expire in 5 minutes.</p>
              <p>If you did not request this code, please ignore this message and consider changing your password.</p>
              <p>Best regards,<br>Zuri Health Team</p>
            </div>
          `
        });
        
        verificationSent = true;
        verificationMethod = 'email';
        console.log('✅ Email verification sent successfully');
        console.log('- Email result:', emailResult);
      } catch (error) {
        console.error('❌ Email verification failed:');
        console.error('- Error message:', error.message);
        console.error('- Error stack:', error.stack);
        verificationErrors.push(`Email: ${error.message}`);
      }
    }
    
    console.log('\n=== VERIFICATION SUMMARY ===');
    console.log('Verification sent:', verificationSent);
    console.log('Verification method:', verificationMethod);
    console.log('Errors encountered:', verificationErrors);
    
    if (!verificationSent) {
      console.log('❌ All verification methods failed');
      return res.status(500).json({
        message: 'Failed to send verification code. Please try again later.',
        debug: process.env.NODE_ENV === 'development' ? {
          errors: verificationErrors,
          userPhone: user.telephone1,
          userEmail: user.email
        } : undefined
      });
    }
    
    console.log('✅ Staff login process completed successfully');
    console.log('=== END STAFF LOGIN ===\n');
    
    // Send response with temporary token and verification method
    return res.status(200).json({
      message: `Verification code sent via ${verificationMethod}. Please enter the code to complete login.`,
      tempToken: tempToken,
      verificationMethod: verificationMethod,
      requiresVerification: true,
      debug: process.env.NODE_ENV === 'development' ? {
        verificationCode: verificationCode, // Only in development
        userPhone: user.telephone1,
        codeExpires: user.emailVerificationExpires
      } : undefined
    });
    
  } catch (error) {
    console.error('💥 Staff login error:', error);
    console.error('- Error message:', error.message);
    console.error('- Error stack:', error.stack);
    next(error);
  }
};

exports.verifyAdminLogin = async (req, res, next) => {
  try {
    const { tempToken, code } = req.body;
    
    // Verify the temporary token
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
      if (!decoded.require2FA || decoded.role !== 'ADMIN') {
        return res.status(400).json({
          message: 'Invalid token'
        });
      }
    } catch (err) {
      return res.status(400).json({
        message: 'Invalid or expired token. Please login again.'
      });
    }
    
    // Find the user
    const user = await User.findOne({
      where: {
        id: decoded.id,
        email: decoded.email,
        role: 'ADMIN',
        emailVerificationCode: code,
        emailVerificationExpires: {
          [Op.gt]: new Date()
        }
      }
    });
    
    if (!user) {
      return res.status(401).json({
        message: 'Invalid or expired verification code'
      });
    }
    
    // Clear verification code
    user.emailVerificationCode = null;
    user.emailVerificationExpires = null;
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    // Generate final authentication token
    const token = user.generateAuthToken();
    
    // Format the response to match the admin login response
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        permissions: User.rolePermissions[user.role] || []
      }
    });
    
  } catch (error) {
    console.error('Admin verification error:', error);
    next(error);
  }
};

// Verification controller for staff login
exports.verifyStaffLogin = async (req, res, next) => {
  try {
    const { tempToken, code } = req.body;
    
    // Verify the temporary token
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
      if (!decoded.require2FA || decoded.role === 'ADMIN' || decoded.role === 'PATIENT') {
        return res.status(400).json({
          message: 'Invalid token'
        });
      }
    } catch (err) {
      return res.status(400).json({
        message: 'Invalid or expired token. Please login again.'
      });
    }
    
    // Find the user with department information
    const user = await User.findOne({
      where: {
        id: decoded.id,
        email: decoded.email,
        emailVerificationCode: code,
        emailVerificationExpires: {
          [Op.gt]: new Date()
        },
        role: {
          [Op.notIn]: ['PATIENT', 'ADMIN']  // Ensure it's a staff user
        }
      },
      include: [
        {
          model: Department,
          as: 'assignedDepartment',
          attributes: ['id', 'name']
        },
        {
          model: Department,
          as: 'primaryDepartment',
          attributes: ['id', 'name']
        }
      ]
    });
    
    if (!user) {
      return res.status(401).json({
        message: 'Invalid or expired verification code'
      });
    }
    
    // Clear verification code
    user.emailVerificationCode = null;
    user.emailVerificationExpires = null;
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    // Generate final authentication token
    const token = user.generateAuthToken();
    
    // Format the response to match the staff login response
    res.json({
      token,
      user: {
        id: user.id,
        fullName: `${user.surname} ${user.otherNames}`,
        email: user.email,
        role: user.role,
        department: user.assignedDepartment ? {
          id: user.assignedDepartment.id,
          name: user.assignedDepartment.name
        } : null,
        primaryDepartment: user.primaryDepartment ? {
          id: user.primaryDepartment.id,
          name: user.primaryDepartment.name
        } : null,
        permissions: User.rolePermissions[user.role] || [],
        employeeId: user.employeeId,
        designation: user.designation,
        specialization: user.specialization,
        lastLogin: user.lastLogin
      }
    });
    
  } catch (error) {
    console.error('Staff verification error:', error);
    next(error);
  }
};

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

    const user = await User.findOne({
      where: {
        email,
        emailVerificationCode: code,
        emailVerificationExpires: {
          [Op.gt]: new Date()
        }
      }
    });
    
    if (!user) {
      console.log('User not found or code invalid/expired');
      return res.status(400).json({
        message: 'Invalid or expired verification code'
      });
    }

    user.isEmailVerified = null;
    user.emailVerificationCode = null;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    res.json({
      message: 'Email verified successfully',
      user: {
        id: user.id,
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


const generateUniqueRegistrationId = async (name, attempt = 0) => {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  const cleanName = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
  const suffix = attempt > 0 ? `-${attempt}` : '';
  const registrationId = `ZURI-${cleanName}-${day}${month}${year}${suffix}`;

  // Check if ID exists
  const existingUser = await User.findOne({ where: { registrationId } });
  if (existingUser) {
    return generateUniqueRegistrationId(name, attempt + 1);
  }
  
  return registrationId;
};



exports.registerPatient = async (req, res, next) => {
  try {
    const {
      surname,
      otherNames,
      email,
      password,
      dateOfBirth,
      sex,
      telephone1,
      telephone2,
      postalAddress,
      postalCode,
      occupation,
      idType,
      idNumber,
      nationality,
      town,
      residence,
      nextOfKin,
      paymentScheme,
      isEmergency,
      registrationNotes,
      isCCPEnrolled,
      ccpEnrollmentDate
    } = req.body;

    // Basic validation for required fields - removed occupation and nextOfKin
    const requiredFields = [
      'surname',
      'otherNames',
      'dateOfBirth',
      'sex',
      'telephone1',
      'idType',
      'nationality',
      'town',
      'residence',
      'paymentScheme'
    ];

    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Validate next of kin only if it's provided with some data
    if (nextOfKin && Object.keys(nextOfKin).length > 0) {
      // If any next of kin data is provided, ensure all required fields are present
      if (!nextOfKin.name || !nextOfKin.relationship || !nextOfKin.contact) {
        return res.status(400).json({
          message: 'If next of kin information is provided, name, relationship and contact number are all required'
        });
      }
    }

    // Check for existing telephone number
    const existingPhone = await Patient.findOne({
      where: { telephone1 }
    });

    if (existingPhone) {
      return res.status(400).json({
        message: 'Phone number already registered'
      });
    }

    // Check for existing email only if email is provided
    let hashedPassword = null;
    let verificationCode = null;
    let verificationToken = null;

    if (email) {
      const existingUser = await Patient.findOne({
        where: { email: email.toLowerCase() }
      });

      if (existingUser) {
        return res.status(400).json({
          message: 'Email already registered'
        });
      }

      // Validate password only if email is provided
      if (password) {
        const salt = await bcrypt.genSalt(10);
        hashedPassword = await bcrypt.hash(password, salt);
        verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        verificationToken = crypto.randomBytes(32).toString('hex');
      }
    }

    // Generate patient number (keeping existing logic)
    const lastPatient = await Patient.findOne({
      where: {
        patientNumber: {
          [Op.like]: 'ZH%'
        }
      },
      order: [['patientNumber', 'DESC']]
    });

    let nextNumber = 1;
    if (lastPatient && lastPatient.patientNumber) {
      const lastNumber = parseInt(lastPatient.patientNumber.substring(2));
      nextNumber = lastNumber + 1;
    }
    const patientNumber = `ZH${nextNumber.toString().padStart(6, '0')}`;

    // Determine the CCP enrollment date with smart logic:
    // 1. If a specific date is provided, use it
    // 2. If isCCPEnrolled is true but no date is provided, use current date
    // 3. Otherwise null
    let finalCCPEnrollmentDate = null;
    
    if (ccpEnrollmentDate) {
      // If a date was explicitly provided, use it (for historical data)
      finalCCPEnrollmentDate = new Date(ccpEnrollmentDate);
    } else if (isCCPEnrolled) {
      // If no date provided but patient is enrolled, use current date
      finalCCPEnrollmentDate = new Date();
    }

    // Create patient with updated model fields
    const patient = await Patient.create({
      surname,
      otherNames,
      email: email?.toLowerCase(),
      password: hashedPassword,
      dateOfBirth,
      sex: sex.toUpperCase(),
      telephone1,
      telephone2,
      postalAddress,
      postalCode,
      occupation, // Now optional
      idType,
      idNumber,
      nationality,
      town,
      residence,
      nextOfKin, // Now optional
      patientNumber,
      isEmergency: isEmergency || false,
      isRevisit: false,
      status: 'WAITING',
      registrationNotes,
      paymentScheme, // Member number is now optional within this object
      isCCPEnrolled: isCCPEnrolled || false,
      ccpEnrollmentDate: finalCCPEnrollmentDate,
      emailVerificationCode: verificationCode,
      emailVerificationToken: verificationToken ? 
        crypto.createHash('sha256').update(verificationToken).digest('hex') 
        : null,
      emailVerificationExpires: verificationToken ? 
        new Date(Date.now() + 24 * 60 * 60 * 1000) 
        : null,
      isActive: true
    });

    // Send verification email only if email and password are provided
    if (email && verificationToken) {
      try {
        const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}`;
        await sendEmail({
          to: patient.email,
          subject: 'Verify your email - Zuri Health',
          html: generateVerificationEmail(
            `${patient.surname} ${patient.otherNames}`,
            verificationUrl,
            verificationCode
          )
        });
      } catch (emailError) {
        console.error('Email error:', emailError);
        // Continue without throwing error
      }
    }

    // Return success response
    res.status(201).json({
      message: email ? 
        'Registration successful. Please check your email for verification instructions.' : 
        'Registration successful',
      patientNumber: patient.patientNumber,
      registrationDate: patient.createdAt,
      patientId: patient.id,
      patientInfo: {
        name: `${patient.surname} ${patient.otherNames}`,
        sex: patient.sex,
        dateOfBirth: patient.dateOfBirth,
        nationality: patient.nationality,
        contact: patient.telephone1
      }
    });

  } catch (error) {
    console.error('Patient registration error:', error);
    next(error);
  }
};

const generatePatientNumber = async () => {
  const prefix = 'ZH';
  const padLength = 6;

  // Find the last patient number
  const lastPatient = await User.findOne({
    where: {
      patientNumber: {
        [Op.like]: `${prefix}%`
      },
      role: 'PATIENT'
    },
    order: [['patientNumber', 'DESC']]
  });

  let nextNumber = 1;
  if (lastPatient && lastPatient.patientNumber) {
    // Extract the number part and increment
    const lastNumber = parseInt(lastPatient.patientNumber.substring(2));
    nextNumber = lastNumber + 1;
  }

  // Pad with zeros
  return `${prefix}${nextNumber.toString().padStart(padLength, '0')}`;
};



exports.register = async (req, res, next) => {
  try {
    const {
      surname,
      otherNames,
      email,
      password,
      role,
      departmentId,
      primaryDepartmentId,
      employeeId,
      licenseNumber,
      specialization,
      qualification,
      telephone1,
      telephone2,
      gender,
      dateOfBirth,
      postalAddress,
      postalCode,
      town,
      areaOfResidence,
      idType,
      idNumber,
      nationality,
      designation,
      expertise,
      dutySchedule,
      workSchedule
    } = req.body;

    // Validate required fields
    const requiredFields = [
      'surname',
      'otherNames',
      'email',
      'password',
      'role',
      'employeeId',
      'telephone1',
      'gender',
      'dateOfBirth',
      'town',
      'areaOfResidence',
      'idType',
      'nationality'
    ];

    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Validate role
    const validRoles = [
      'DOCTOR',
      'NURSE',
      'LAB_TECHNICIAN',
      'PHARMACIST',
      'RADIOLOGIST',
      'PHYSIOTHERAPIST',
      'CARDIOLOGIST',
      'NEUROLOGIST',
      'PEDIATRICIAN',
      'PSYCHIATRIST',
      'SURGEON',
      'ANESTHESIOLOGIST',
      'EMERGENCY_PHYSICIAN',
      'WARD_MANAGER',
      'BILLING_STAFF',
      'RECEPTIONIST'
    ];

    if (!validRoles.includes(role.toUpperCase())) {
      return res.status(400).json({
        message: 'Invalid role specified'
      });
    }

    // Check for medical roles that require license
    const medicalRoles = [
      'DOCTOR', 'NURSE', 'LAB_TECHNICIAN', 'PHARMACIST',
      'RADIOLOGIST', 'PHYSIOTHERAPIST', 'CARDIOLOGIST',
      'NEUROLOGIST', 'PEDIATRICIAN', 'PSYCHIATRIST',
      'SURGEON', 'ANESTHESIOLOGIST', 'EMERGENCY_PHYSICIAN'
    ];

    if (medicalRoles.includes(role.toUpperCase()) && !licenseNumber) {
      return res.status(400).json({
        message: 'License number is required for medical professionals'
      });
    }

    // Check for existing email or employeeId
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { email: email.toLowerCase() },
          { employeeId }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        message: existingUser.email === email.toLowerCase() ? 
          'Email already registered' : 
          'Employee ID already registered'
      });
    }

    // Create staff user, but don't set verification fields
    const user = await User.create({
      surname,
      otherNames,
      email: email.toLowerCase(),
      password: password,
      role: role.toUpperCase(),
      departmentId,
      primaryDepartmentId,
      employeeId,
      licenseNumber,
      specialization: specialization ? Array.isArray(specialization) ? specialization : [specialization] : [],
      qualification: qualification || [],
      telephone1,
      telephone2,
      gender: gender.toUpperCase(),
      dateOfBirth,
      postalAddress,
      postalCode,
      town,
      areaOfResidence,
      idType,
      idNumber,
      nationality,
      designation,
      expertise: expertise || {},
      dutySchedule: dutySchedule || {},
      workSchedule: workSchedule || {},
      joiningDate: new Date(),
      isEmailVerified: true, // Set this to true to skip verification
      isActive: true,
      status: 'active'
    });

    // Log registration success and return response immediately
    console.log(`Staff registration successful for ${email}`);
    
    res.status(201).json({
      message: 'Staff registration successful',
      userId: user.id,
      employeeId: user.employeeId
    });

    // Generate reset token for initial password setup
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Update user with reset token
    user.resetPasswordToken = hashedResetToken;
    user.resetPasswordExpires = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours
    await user.save();

    // Create reset URL with setup flag - use the correct route
    const resetUrl = `${process.env.BACKEND_URL}/api/v1/auth/reset-password-form?token=${resetToken}&setup=true`;

    // Fetch department name if department ID is provided
    let departmentName = 'Not assigned';
    let primaryDepartmentName = 'Not assigned';
    
    try {
      if (user.departmentId) {
        const department = await Department.findByPk(user.departmentId);
        if (department) {
          departmentName = department.name;
        }
      }
      
      if (user.primaryDepartmentId) {
        const primaryDepartment = await Department.findByPk(user.primaryDepartmentId);
        if (primaryDepartment) {
          primaryDepartmentName = primaryDepartment.name;
        }
      }
    } catch (deptError) {
      console.error('Error fetching department info:', deptError);
      // Continue with the default values if there's an error
    }

    try {
      // Only send the welcome email with password setup link
      await sendEmail({
        to: user.email,
        subject: 'Welcome to Zuri Health - Set Your Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to Zuri Health!</h2>
            <p>Dear ${user.surname} ${user.otherNames},</p>
            <p>Your staff account has been successfully created with the following details:</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Email:</strong> ${user.email}</p>
              <p><strong>Employee ID:</strong> ${user.employeeId}</p>
              <p><strong>Role:</strong> ${user.role}</p>
              <p><strong>Department:</strong> ${departmentName}</p>
              ${primaryDepartmentName !== 'Not assigned' ? `<p><strong>Primary Department:</strong> ${primaryDepartmentName}</p>` : ''}
            </div>
            
            <p>To set up your password and access the system, please click the button below:</p>
            <p>To access the platform, go to https://hms.zuri.health/</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Set Your Password</a>
            </div>
            
            <p>This link will expire in 72 hours for security reasons.</p>
            
            <p>You can access the Zuri Health Management System at: <a href="${process.env.FRONTEND_URL}">${process.env.FRONTEND_URL}</a></p>
            
            <p>If you have any questions or need assistance, please contact your system administrator.</p>
            <p>Best regards,<br>Zuri Health Team</p>
          </div>
        `
      });
      console.log(`Welcome email with password setup link sent to ${email}`);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Email failure doesn't affect registration success
    }

  } catch (error) {
    console.error('Staff registration error:', error);
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    const user = await User.findOne({
      where: {
        email: email.toLowerCase(),
        role
      }
    });

    if (!user) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive || user.status !== 'active') {
      return res.status(401).json({
        message: 'Account is not active. Please contact administrator.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    // For non-ADMIN roles, continue with direct login
    if (role !== 'ADMIN') {
      // Generate role-specific token
      const token = user.generateAuthToken();

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      return res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          permissions: User.rolePermissions[user.role] || []
        }
      });
    }

    // For ADMIN users, implement 2FA
    // Generate verification code for 2FA
    const verificationCode = generateVerificationCode();
    
    // Store verification code and set expiry (5 minutes)
    user.emailVerificationCode = verificationCode;
    user.emailVerificationExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    await user.save();
    
    // Create a temporary token containing user info
    const tempToken = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        role: user.role,
        require2FA: true,
        exp: Math.floor(Date.now() / 1000) + (5 * 60) // 5 minutes expiry
      }, 
      process.env.JWT_SECRET
    );
    
    // Try to send verification code via WhatsApp first if phone exists
    let verificationSent = false;
    let verificationMethod = null;
    
    if (user.telephone1) {
      try {
        await whatsappService.sendVerificationCode(user.telephone1, verificationCode);
        verificationSent = true;
        verificationMethod = 'whatsapp';
      } catch (error) {
        console.error('WhatsApp verification failed:', error);
        // Fall back to email
      }
    }
    
    // Fall back to email if WhatsApp failed or no phone exists
    if (!verificationSent) {
      try {
        await sendEmail({
          to: user.email,
          subject: 'Your verification code - Zuri Health',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Login Verification</h2>
              <p>Hello ${user.surname} ${user.otherNames},</p>
              <p>Your verification code is:</p>
              <div style="background: #f5f5f5; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; margin: 20px 0; font-weight: bold;">
                ${verificationCode}
              </div>
              <p>This code will expire in 5 minutes.</p>
              <p>If you did not request this code, please ignore this message and consider changing your password.</p>
              <p>Best regards,<br>Zuri Health Team</p>
            </div>
          `
        });
        verificationSent = true;
        verificationMethod = 'email';
      } catch (error) {
        console.error('Email verification failed:', error);
      }
    }
    
    if (!verificationSent) {
      return res.status(500).json({
        message: 'Failed to send verification code. Please try again later.'
      });
    }
    
    // Send response with temporary token and verification method
    return res.status(200).json({
      message: `Verification code sent via ${verificationMethod}. Please enter the code to complete login.`,
      tempToken: tempToken,
      verificationMethod: verificationMethod,
      requiresVerification: true
    });
    
  } catch (error) {
    console.error('Login error:', error);
    next(error);
  }
};

exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      where: {
        emailVerificationToken: hashedToken,
        emailVerificationExpires: {
          [Op.gt]: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired verification token'
      });
    }

    user.isEmailVerified = null;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
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

    const user = await User.findOne({ 
      where: { email: email.toLowerCase() }
    });

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

    // Generate new verification token and code
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationCode = generateVerificationCode();

    user.emailVerificationToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');
    user.emailVerificationCode = verificationCode;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    // Generate verification URL
    const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}`;

    // Send verification email
    await sendEmail({
      to: user.email,
      subject: 'Email Verification',
      html: generateVerificationEmail(user.name, verificationUrl, verificationCode)
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

    const user = await User.findOne({ 
      where: { email: email.toLowerCase() }
    });
    
    // Security best practice: same response whether user exists or not
    if (!user) {
      console.log('No user found with email:', email);
      return res.status(200).json({
        message: 'If this email exists, you will receive a password reset link'
      });
    }

    console.log('User found:', { userId: user.id, email: user.email });

    // Generate reset token (more secure than just a code)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Update user with reset token
    user.resetPasswordToken = hashedResetToken;
    user.resetPasswordExpires = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours
    await user.save();

    // Create reset URL - use new form-based URL
    const resetUrl = `${process.env.BACKEND_URL}/api/v1/auth/reset-password-form?token=${resetToken}`;

    // Create email with reset link
    const resetEmail = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>Hello ${user.surname} ${user.otherNames},</p>
        <p>You requested to reset your password for your Zuri Health account.</p>
        
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>User Details:</strong></p>
          <p>Name: ${user.surname} ${user.otherNames}</p>
          <p>Email: ${user.email}</p>
          <p>Role: ${user.role}</p>
          ${user.employeeId ? `<p>Employee ID: ${user.employeeId}</p>` : ''}
        </div>
        
        <p>Please click the button below to reset your password:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Reset Your Password</a>
        </div>
        
        <p>If you did not request this password reset, please ignore this email or contact support if you have concerns.</p>
        
        <p>This link will expire in 1 hour for security reasons.</p>
        
        <p>Best regards,<br>Zuri Health Team</p>
      </div>
    `;

    await sendEmail({
      to: user.email,
      subject: 'Password Reset - Zuri Health',
      html: resetEmail
    });

    console.log('Reset link email sent successfully to:', email);

    res.status(200).json({
      message: 'If this email exists, you will receive a password reset link'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { code, password } = req.body;

    // For token-based reset, hash the token to compare
    const hashedCode = crypto
      .createHash('sha256')
      .update(code)
      .digest('hex');

    const user = await User.findOne({
      where: {
        resetPasswordToken: hashedCode,
        resetPasswordExpires: {
          [Op.gt]: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired reset token'
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
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    // Send password change confirmation email
    await sendEmail({
      to: user.email,
      subject: 'Password Changed Successfully - Zuri Health',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Changed Successfully</h2>
          <p>Hello ${user.surname} ${user.otherNames},</p>
          <p>Your password for Zuri Health has been changed successfully.</p>
          <p>If you did not make this change, please contact our support team immediately.</p>
          <div style="margin: 30px 0; padding: 10px; background-color: #f5f5f5; border-left: 4px solid #4CAF50;">
            <p style="margin-top: 0;"><strong>Account Details:</strong></p>
            <p>Email: ${user.email}</p>
            <p>Role: ${user.role}</p>
            ${user.employeeId ? `<p>Employee ID: ${user.employeeId}</p>` : ''}
          </div>
          <p>You can now login with your new password.</p>
          <p>Best regards,<br>Zuri Health Team</p>
        </div>
      `
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

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    user.twoFactorSecret = secret.base32;
    user.twoFactorEnabled = true;
    await user.save();

    // Send email notification
    await sendEmail({
      to: user.email,
      subject: '2FA Enabled',
      html: generate2FAEmail(user.name)
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

    const user = await User.findByPk(decoded.id);
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
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;