// test-whatsapp-document.js
const whatsAppService = require('./src/services/whatsapp.service');

// Test phone number
const phoneNumber = '+254778432618';

// Hardcoded document URL
const documentUrl = 'https://zurihealth.com/documents/sample-receipt-123.pdf';

async function testWhatsAppDocumentTemplate() {
  try {
    console.log(`Sending WhatsApp document link to ${phoneNumber}...`);
    
    const response = await whatsAppService.sendDocumentLink(phoneNumber, documentUrl);
    
    console.log('WhatsApp message sent successfully!');
    console.log('Response:', JSON.stringify(response, null, 2));
    
    return response;
  } catch (error) {
    console.error('Failed to send WhatsApp message:');
    console.error(error.message);
    
    // If there's a response body in the error
    if (error.message.includes('{')) {
      try {
        const errorJson = JSON.parse(error.message.substring(error.message.indexOf('{')));
        console.error('Error details:', JSON.stringify(errorJson, null, 2));
      } catch (e) {
        // Just log the original error if parsing fails
      }
    }
  }
}

// Execute the test
testWhatsAppDocumentTemplate();