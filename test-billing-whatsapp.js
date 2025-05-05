// test-notification.js
const WhatsAppService = require('./src/services/whatsapp.service');

async function testWhatsAppNotification() {
  try {
    console.log('Starting WhatsApp notification test...');
    
    // Hardcoded test data
    const phoneNumber = '+254757913538'; // Your phone number with country code
    const queueNumber = '105';  // Example queue number
    const patientNumber = 'PT-20250505-001'; // Example patient number
    
    console.log(`Sending notification to ${phoneNumber} for queue ${queueNumber} and patient ${patientNumber}`);
    
    // Send the notification
    const response = await WhatsAppService.sendQueueNotification(
      phoneNumber,
      queueNumber,
      patientNumber
    );
    
    console.log('WhatsApp notification sent successfully!');
    console.log('Response:', JSON.stringify(response, null, 2));
    
    return response;
  } catch (error) {
    console.error('Error sending WhatsApp notification:');
    console.error(error.message);
    console.error(error.stack);
    throw error;
  }
}

// Execute the test
testWhatsAppNotification()
  .then(() => {
    console.log('Test completed successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
  });