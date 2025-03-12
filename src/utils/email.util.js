const nodemailer = require('nodemailer');

console.log('Email configuration check - Username:', process.env.EMAIL_USERNAME);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD
  }
});

const sendEmail = async (options) => {
  const mailOptions = {
    from: `Zuri Health <${process.env.EMAIL_FROM}>`,
    to: options.to,
    subject: options.subject,
    html: options.html
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully to:', options.to);
    return info;
  } catch (error) {
    console.error('Failed to send email to:', options.to);
    console.error('Error details:', error.message);
    throw error;
  }
};

// // Add test function
// const testEmailSetup = async () => {
//   try {
//     console.log('Testing email configuration...');
//     await sendEmail({
//       to: 'isaacwambiri254@gmail.com',
//       subject: 'Test Email - Zuri Health Email Setup',
//       html: `
//         <div style="font-family: Arial, sans-serif; padding: 20px;">
//           <h2>Email Configuration Test</h2>
//           <p>This is a test email to verify that the email service is configured correctly.</p>
//           <p>Configuration details:</p>
//           <ul>
//             <li>Sender: ${process.env.EMAIL_FROM}</li>
//             <li>Time sent: ${new Date().toLocaleString()}</li>
//           </ul>
//           <p>If you received this email, the email service is working properly!</p>
//         </div>
//       `
//     });
//     console.log('Test email sent successfully!');
//   } catch (error) {
//     console.error('Test email failed:', error);
//   }
// };

// // Execute test
// testEmailSetup();

module.exports = sendEmail;