// test-whatsapp-direct.js
const whatsAppService = require('./src/services/whatsapp.service');

async function testWhatsApp() {
  try {
    console.log('Testing WhatsApp service directly...');
    const result = await whatsAppService.sendDocumentLink(
      '+254757913538',  // Your number
      'https://example.com/test-document.pdf'  // A test URL
    );
    console.log('WhatsApp message sent successfully:', result);
  } catch (error) {
    console.error('WhatsApp service error:', error);
  }
}

testWhatsApp();