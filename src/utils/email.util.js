// src/utils/email.util.js
const mailgun = require('mailgun-js');
const fs = require('fs');
const path = require('path');

// Initialize Mailgun with environment variables
const mg = mailgun({
 apiKey: process.env.MAILGUN_API_KEY,
 domain: process.env.MAILGUN_DOMAIN
});

// Log email configuration for debugging
console.log('Email Service: Mailgun');
console.log('Mailgun Configuration:');
console.log(`- Domain: ${process.env.MAILGUN_DOMAIN}`);
console.log(`- API Key: ${process.env.MAILGUN_API_KEY ? 'Set (hidden for security)' : 'NOT SET'}`);

// Create a log file for email activities
const logDirectory = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDirectory)) {
 fs.mkdirSync(logDirectory, { recursive: true });
}
const logFile = path.join(logDirectory, 'email.log');

// Helper function to log email activities
const logEmailActivity = (activity) => {
 const timestamp = new Date().toISOString();
 const logEntry = `[${timestamp}] ${activity}\n`;
 
 // Log to console
 console.log(activity);
 
 // Log to file
 fs.appendFile(logFile, logEntry, (err) => {
   if (err) console.error('Error writing to email log:', err);
 });
};

/**
* Send email using Mailgun
* @param {Object} options - Email options
* @param {string} options.to - Recipient email
* @param {string} options.subject - Email subject
* @param {string} options.html - Email HTML content
* @param {string} [options.from] - Sender email (optional, defaults to configured FROM)
* @param {Array} [options.attachments] - Email attachments (optional)
* @returns {Promise} - Mailgun send result
*/
const sendEmail = async (options) => {
 try {
   // Validate required parameters
   if (!options.to || !options.subject || !options.html) {
     throw new Error('Missing required email parameters: to, subject, or html');
   }

   // Prepare email data
   const data = {
     from: options.from || `Zuri Health <no-reply@${process.env.MAILGUN_DOMAIN}>`,
     to: options.to,
     subject: options.subject,
     html: options.html
   };

   // Add attachments if any
   if (options.attachments && options.attachments.length > 0) {
     data.attachment = options.attachments;
   }

   // Log attempt
   logEmailActivity(`Attempting to send email: To=${options.to}, Subject="${options.subject}"`);

   // Send email through Mailgun
   const result = await mg.messages().send(data);
   
   // Log success
   logEmailActivity(`Email sent successfully: To=${options.to}, ID=${result.id}`);
   
   return result;
 } catch (error) {
   // Log detailed error
   logEmailActivity(`ERROR sending email to ${options.to}: ${error.message}`);
   console.error('Mailgun API Error Details:', error);
   
   // Re-throw the error for the caller to handle
   throw error;
 }
};

// Test the email configuration on module load if TEST_EMAIL env is set
if (process.env.TEST_EMAIL) {
 (async () => {
   try {
     logEmailActivity('Running email configuration test...');
     await sendEmail({
       to: process.env.TEST_EMAIL,
       subject: 'Zuri Health - Email System Test',
       html: `
         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
           <h2>Email Configuration Test</h2>
           <p>This is a test email to confirm that the Mailgun email service is configured correctly.</p>
           <p><strong>Configuration:</strong></p>
           <ul>
             <li>Domain: ${process.env.MAILGUN_DOMAIN}</li>
             <li>Time: ${new Date().toLocaleString()}</li>
             <li>Environment: ${process.env.NODE_ENV || 'development'}</li>
           </ul>
           <p>If you received this email, the Mailgun integration is working properly!</p>
         </div>
       `
     });
     logEmailActivity('Test email sent successfully!');
   } catch (error) {
     logEmailActivity(`Test email FAILED: ${error.message}`);
   }
 })();
}

module.exports = sendEmail;