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

  /**
 * Send a queue notification to healthcare providers via WhatsApp
 * @param {string} phoneNumber - Provider's phone number
 * @param {string} queueNumber - Patient's queue number
 * @param {string} patientNumber - Patient's identification number
 * @returns {Promise<object>} - Response from Infobip API
 */
sendQueueNotification = async (phoneNumber, queueNumber, patientNumber) => {
  // Use the helper method to send the template
  return this.sendWhatsAppTemplate(
    phoneNumber,
    "hms_queue_message",
    [queueNumber, patientNumber],
    null,
    "en"
  );
}



  /**
   * Send a document link via WhatsApp using the hms_documents_sender template
   * @param {string} phoneNumber - Recipient's phone number
   * @param {string} documentUrl - URL to the document/receipt/prescription
   * @returns {Promise<object>} - Response from Infobip API
   */
  sendDocumentLink = async (phoneNumber, documentUrl) => {
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
              reject(new Error(`Failed to send WhatsApp document link: ${body.toString()}`));
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
                "templateName": "hms_documents_sender",
                "templateData": {
                  "body": {
                    "placeholders": [
                      documentUrl
                    ]
                  }
                },
                "language": "en"
              },
              "notifyUrl": config.infobip.webhookUrl
            }
          ]
        });

        req.write(postData);
        req.end();
      } catch (error) {
        reject(new Error(`WhatsApp document service error: ${error.message}`));
      }
    });
  }

  /**
   * Send password reset OTP via WhatsApp
   * @param {string} phoneNumber - Recipient's phone number
   * @param {string} otp - Password reset OTP
   * @returns {Promise<object>} - Response from Infobip API
   */
  sendPasswordResetOTP = async (phoneNumber, otp) => {
    return this.sendWhatsAppTemplate(
      phoneNumber,
      "britam_age_auth_code",
      [otp],
      [{
        "type": "URL",
        "parameter": otp
      }],
      "en_GB"
    );
  }

  /**
   * Send password change confirmation via WhatsApp
   * @param {string} phoneNumber - Recipient's phone number
   * @param {string} userName - User's name
   * @returns {Promise<object>} - Response from Infobip API
   */
  sendPasswordChangeConfirmation = async (phoneNumber, userName) => {
    return this.sendWhatsAppTemplate(
      phoneNumber,
      "hms_documents_sender",
      [`Hello ${userName}, your Zuri Health password has been successfully changed. If you did not make this change, please contact support immediately.`],
      null,
      "en"
    );
  }

  /**
   * Helper method to extract common code for sending WhatsApp templates
   * @param {string} phoneNumber - Recipient's phone number
   * @param {string} templateName - Name of the template to use
   * @param {Array<string>} placeholders - Array of placeholder values
   * @param {Array<Object>} buttons - Optional array of button objects
   * @param {string} language - Language code for the template
   * @returns {Promise<object>} - Response from Infobip API
   */
  sendWhatsAppTemplate = async (phoneNumber, templateName, placeholders, buttons = null, language = 'en') => {
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
              reject(new Error(`Failed to send WhatsApp template: ${body.toString()}`));
            }
          });
          
          res.on("error", (error) => {
            reject(error);
          });
        });

        req.on('error', (error) => {
          reject(error);
        });

        // Prepare the template data
        const templateData = {
          "body": {
            "placeholders": placeholders
          }
        };

        // Add buttons if provided
        if (buttons && buttons.length > 0) {
          templateData.buttons = buttons;
        }

        const postData = JSON.stringify({
          "messages": [
            {
              "from": config.infobip.whatsappNumber,
              "to": formattedPhoneNumber,
              "content": {
                "templateName": templateName,
                "templateData": templateData,
                "language": language
              },
              "notifyUrl": config.infobip.webhookUrl
            }
          ]
        });

        req.write(postData);
        req.end();
      } catch (error) {
        reject(new Error(`WhatsApp template service error: ${error.message}`));
      }
    });
  }
}

module.exports = new WhatsAppService();