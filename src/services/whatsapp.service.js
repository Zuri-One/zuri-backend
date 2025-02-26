// src/services/whatsapp.service.js
const { https } = require('follow-redirects');
const config = require('../config/env.config');

class WhatsAppService {
  /**
   * Send a verification code via WhatsApp using Infobip template
   * @param {string} phoneNumber - Recipient's phone number
   * @param {string} code - Verification code to send
   * @returns {Promise<object>} - Response from Infobip API
   */
  sendVerificationCode = async (phoneNumber, code) => {
    return new Promise((resolve, reject) => {
      try {
        // Ensure phone number is in international format (no + sign)
        const formattedPhoneNumber = phoneNumber.startsWith('+') 
          ? phoneNumber.substring(1) 
          : phoneNumber;

        const options = {
          'method': 'POST',
          'hostname': config.infobip.hostname,
          'path': '/whatsapp/1/message/template',
          'headers': {
            'Authorization': `App ${config.infobip.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          'maxRedirects': 20
        };

        const req = https.request(options, (res) => {
          const chunks = [];
          
          res.on("data", (chunk) => {
            chunks.push(chunk);
          });
          
          res.on("end", () => {
            const body = Buffer.concat(chunks);
            const response = JSON.parse(body.toString());
            
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(response);
            } else {
              reject(new Error(`Failed to send WhatsApp message: ${body.toString()}`));
            }
          });
          
          res.on("error", (error) => {
            reject(error);
          });
        });

        req.on('error', (error) => {
          reject(error);
        });

        const postData = JSON.stringify({
          "messages": [
            {
              "from": config.infobip.whatsappNumber,
              "to": formattedPhoneNumber,
              "content": {
                "templateName": "britam_age_auth_code",
                "templateData": {
                  "body": {
                    "placeholders": [
                      code
                    ]
                  },
                  "buttons": [
                    {
                      "type": "URL",
                      "parameter": code
                    }
                  ]
                },
                "language": "en_GB"
              },
              "notifyUrl": config.infobip.webhookUrl
            }
          ]
        });

        req.write(postData);
        req.end();
      } catch (error) {
        reject(new Error(`WhatsApp service error: ${error.message}`));
      }
    });
  }
}

module.exports = new WhatsAppService();