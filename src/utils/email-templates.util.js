exports.generateVerificationEmail = (name, verificationUrl, verificationCode) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
          <style>
              .container {
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                  font-family: Arial, sans-serif;
              }
              .button {
                  background-color: #4CAF50;
                  border: none;
                  color: white;
                  padding: 15px 32px;
                  text-align: center;
                  text-decoration: none;
                  display: inline-block;
                  font-size: 16px;
                  margin: 4px 2px;
                  cursor: pointer;
                  border-radius: 4px;
              }
              .code-container {
                  margin: 20px 0;
                  padding: 20px;
                  background-color: #f5f5f5;
                  border-radius: 4px;
                  text-align: center;
              }
              .verification-code {
                  font-size: 32px;
                  font-weight: bold;
                  color: #333;
                  letter-spacing: 5px;
              }
              .divider {
                  margin: 30px 0;
                  text-align: center;
                  position: relative;
              }
              .divider::before {
                  content: "";
                  position: absolute;
                  top: 50%;
                  left: 0;
                  right: 0;
                  border-top: 1px solid #ddd;
              }
              .divider span {
                  background-color: white;
                  padding: 0 10px;
                  color: #666;
                  position: relative;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <h2>Welcome to Zuri Health!</h2>
              <p>Hello ${name},</p>
              <p>Thank you for registering. You can verify your email using either method below:</p>
              
              <div class="code-container">
                  <p><strong>Method 1: Enter this verification code</strong></p>
                  <div class="verification-code">${verificationCode}</div>
              </div>
  
              <div class="divider">
                  <span>OR</span>
              </div>
  
              <p><strong>Method 2: Click the verification button</strong></p>
              <a href="${verificationUrl}" class="button">Verify Email</a>
              
              <p style="margin-top: 20px;">If the button doesn't work, you can also click this link:</p>
              <p><a href="${verificationUrl}">${verificationUrl}</a></p>
              
              <p>Both the link and code will expire in 24 hours.</p>
              
              <div class="footer">
                  <p>If you didn't create an account with Zuri Health, please ignore this email.</p>
              </div>
          </div>
      </body>
      </html>
    `;
  };
  
  exports.generateResetPasswordEmail = (name, resetUrl) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
          <style>
              .container {
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                  font-family: Arial, sans-serif;
              }
              .button {
                  background-color: #4CAF50;
                  border: none;
                  color: white;
                  padding: 15px 32px;
                  text-align: center;
                  text-decoration: none;
                  display: inline-block;
                  font-size: 16px;
                  margin: 4px 2px;
                  cursor: pointer;
                  border-radius: 4px;
              }
              .footer {
                  margin-top: 20px;
                  font-size: 12px;
                  color: #666;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <h2>Password Reset Request</h2>
              <p>Hello ${name},</p>
              <p>You requested to reset your password. Please click the button below to reset it:</p>
              <a href="${resetUrl}" class="button">Reset Password</a>
              <p>If the button doesn't work, you can also click the link below:</p>
              <p><a href="${resetUrl}">${resetUrl}</a></p>
              <p>This link will expire in 1 hour.</p>
              <div class="footer">
                  <p>If you didn't request a password reset, please ignore this email or contact support if you're concerned.</p>
              </div>
          </div>
      </body>
      </html>
    `;
  };

  exports.generatePasswordResetEmail = (name, resetCode) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            font-family: Arial, sans-serif;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .code-container {
            background-color: #f5f5f5;
            padding: 20px;
            text-align: center;
            border-radius: 8px;
            margin: 20px 0;
          }
          .reset-code {
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 5px;
            color: #333;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Code</h1>
          </div>
          
          <p>Hello ${name},</p>
          <p>We received a request to reset your password. Use the following code to complete your password reset:</p>
          
          <div class="code-container">
            <div class="reset-code">${resetCode}</div>
          </div>
          
          <p>This code will expire in 30 minutes for security reasons.</p>
          
          <p><strong>Important:</strong> If you didn't request this password reset, please ignore this email or contact support if you're concerned about your account's security.</p>
          
          <div class="footer">
            <p>This is an automated message, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };
  
  exports.generatePasswordChangeConfirmationEmail = (name) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            font-family: Arial, sans-serif;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .success-icon {
            font-size: 48px;
            text-align: center;
            margin: 20px 0;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Changed Successfully</h1>
          </div>
          
          <div class="success-icon">✅</div>
          
          <p>Hello ${name},</p>
          <p>Your password has been successfully changed.</p>
          
          <p>If you did not make this change, please contact our support team immediately.</p>
          
          <div class="footer">
            <p>This is a security notification. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };
  
  exports.generate2FAEmail = (name, code) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
          <style>
              .container {
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                  font-family: Arial, sans-serif;
              }
              .code {
                  font-size: 32px;
                  font-weight: bold;
                  color: #333;
                  letter-spacing: 5px;
                  text-align: center;
                  margin: 20px 0;
              }
              .footer {
                  margin-top: 20px;
                  font-size: 12px;
                  color: #666;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <h2>Two-Factor Authentication Code</h2>
              <p>Hello ${name},</p>
              <p>Your verification code is:</p>
              <div class="code">${code}</div>
              <p>This code will expire in 5 minutes.</p>
              <div class="footer">
                  <p>If you didn't request this code, please contact support immediately.</p>
              </div>
          </div>
      </body>
      </html>
    `;
  };

  // src/utils/email-templates.util.js

const generateAppointmentEmail = (type, data) => {
  switch (type) {
    case 'confirmation':
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Appointment Confirmation</h2>
          <p>Dear ${data.name},</p>
          <p>Your appointment has been successfully booked with ${data.doctor}.</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Date:</strong> ${data.date}</p>
            <p><strong>Time:</strong> ${data.time}</p>
            <p><strong>Type:</strong> ${data.type === 'video' ? 'Video Consultation' : 'In-Person Visit'}</p>
          </div>
          ${data.type === 'video' ? `
            <p>You will receive a video consultation link before your appointment.</p>
          ` : `
            <p>Please arrive 15 minutes before your appointment time.</p>
          `}
          <p>Thank you for choosing Zuri Health.</p>
        </div>
      `;

    case 'request':
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Appointment Request</h2>
          <p>Dear Dr. ${data.name},</p>
          <p>You have a new appointment request from ${data.patient}.</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Date:</strong> ${data.date}</p>
            <p><strong>Time:</strong> ${data.time}</p>
            <p><strong>Type:</strong> ${data.type === 'video' ? 'Video Consultation' : 'In-Person Visit'}</p>
          </div>
          <p>Please review and confirm the appointment.</p>
        </div>
      `;

    default:
      throw new Error('Invalid email template type');
  }
};

const generateAppointmentCancellationEmail = (data) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Appointment Cancelled</h2>
      <p>Dear ${data.name},</p>
      <p>Your appointment scheduled for ${data.date} at ${data.time} has been cancelled.</p>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Cancelled by:</strong> ${data.cancelledBy}</p>
        <p><strong>Reason:</strong> ${data.reason}</p>
      </div>
      <p>Please book another appointment if you would like to reschedule.</p>
    </div>
  `;
};

const generateAppointmentUpdateEmail = (type, data) => {
  switch (type) {
    case 'confirmation':
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Appointment Confirmed</h2>
          <p>Dear ${data.name},</p>
          <p>Your appointment with ${data.doctor} has been confirmed.</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Date:</strong> ${data.date}</p>
            <p><strong>Time:</strong> ${data.time}</p>
            <p><strong>Type:</strong> ${data.type === 'video' ? 'Video Consultation' : 'In-Person Visit'}</p>
          </div>
          ${data.type === 'video' ? `
            <p>You will receive a video consultation link before your appointment.</p>
          ` : `
            <p>Please arrive 15 minutes before your appointment time.</p>
          `}
        </div>
      `;

    case 'reschedule':
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Appointment Rescheduled</h2>
          <p>Dear ${data.name},</p>
          <p>Your appointment has been rescheduled.</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Previous Date/Time:</strong> ${data.oldDate} at ${data.oldTime}</p>
            <p><strong>New Date/Time:</strong> ${data.newDate} at ${data.newTime}</p>
            <p><strong>Type:</strong> ${data.type === 'video' ? 'Video Consultation' : 'In-Person Visit'}</p>
          </div>
        </div>
      `;

    default:
      throw new Error('Invalid email template type');
  }
};

const generateVideoAppointmentEmail = (type, data) => {
  const templates = {
    confirmation: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8fafc; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
          <h1 style="color: #0f172a; margin-bottom: 16px;">Video Appointment Confirmed</h1>
          <p style="color: #475569; margin-bottom: 24px;">Dear ${data.name},</p>
          <p style="color: #475569; margin-bottom: 16px;">Your video appointment with Dr. ${data.doctor} has been confirmed.</p>
          
          <div style="background-color: white; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
            <h2 style="color: #0f172a; font-size: 18px; margin-bottom: 16px;">Appointment Details</h2>
            <p style="color: #475569; margin-bottom: 8px;"><strong>Date:</strong> ${data.date}</p>
            <p style="color: #475569; margin-bottom: 8px;"><strong>Time:</strong> ${data.time}</p>
            <p style="color: #475569; margin-bottom: 8px;"><strong>Platform:</strong> ${data.platform}</p>
          </div>

          <div style="background-color: #e0f2fe; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
            <h2 style="color: #0369a1; font-size: 18px; margin-bottom: 16px;">How to Join</h2>
            ${data.platform === 'zoom' ? `
              <p style="color: #0369a1; margin-bottom: 8px;"><strong>Zoom Meeting ID:</strong> ${data.meetingId}</p>
              <p style="color: #0369a1; margin-bottom: 16px;"><strong>Password:</strong> ${data.password}</p>
              <a href="${data.meetingLink}" style="display: inline-block; background-color: #0284c7; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-bottom: 16px;">Join Zoom Meeting</a>
            ` : `
              <p style="color: #0369a1; margin-bottom: 16px;">Your consultation will take place on our secure built-in video platform.</p>
              <p style="color: #0369a1; margin-bottom: 16px;">You can join the meeting directly through our platform when it's time.</p>
            `}
          </div>

          <div style="background-color: #fef3c7; padding: 16px; border-radius: 8px;">
            <h2 style="color: #92400e; font-size: 18px; margin-bottom: 16px;">Important Notes</h2>
            <ul style="color: #92400e; margin: 0; padding-left: 20px;">
              <li>Join 5 minutes before your appointment time</li>
              <li>Ensure you have a stable internet connection</li>
              <li>Test your camera and microphone beforehand</li>
              <li>Choose a quiet, well-lit location</li>
              ${data.platform === 'whereby' ? `
                <li>No downloads required - works directly in your browser</li>
              ` : ''}
            </ul>
          </div>
        </div>

        <div style="text-align: center; color: #64748b; font-size: 14px;">
          <p>Zuri Health Medical Center</p>
          <p>If you need to reschedule, please contact us at least 24 hours before your appointment.</p>
        </div>
      </div>
    `
  };

  return templates[type] || '';
};

module.exports = {
  generateVerificationEmail: exports.generateVerificationEmail,
  generateResetPasswordEmail: exports.generateResetPasswordEmail,
  generate2FAEmail: exports.generate2FAEmail,
  generatePasswordResetEmail: exports.generatePasswordResetEmail,
  generatePasswordChangeConfirmationEmail: exports.generatePasswordChangeConfirmationEmail,
  generateAppointmentEmail,
  generateAppointmentCancellationEmail,
  generateAppointmentUpdateEmail, 
  generateVideoAppointmentEmail
};