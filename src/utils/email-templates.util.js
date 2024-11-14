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