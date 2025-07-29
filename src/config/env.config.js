// src/config/env.config.js
require('dotenv').config();

const config = {
  // Environment
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 8000,
  
  // JWT Configuration
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
  jwtExpirationInterval: process.env.JWT_EXPIRATION_MINUTES || 60,
  
  // Database
  databaseUrl: process.env.DATABASE_URL,
  
  // Services
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER,
  
  // AWS S3
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  awsRegion: process.env.AWS_REGION,
  awsBucket: process.env.AWS_BUCKET,
  
  // Stripe
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  
  // Email Configuration
  emailConfig: {
    user: process.env.EMAIL_USER,
    appPassword: process.env.EMAIL_APP_PASSWORD,
    senderName: process.env.EMAIL_SENDER_NAME || 'Wellness App',
    templates: {
      path: '../templates/emails'
    }
  },

  twilioConfig: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER
  },

  infobip: {
    hostname: process.env.INFOBIP_HOSTNAME || '4m4w56.api.infobip.com',
    apiKey: process.env.INFOBIP_API_KEY || '47c875593c881feb1b6930a5f317d67e-db7e06a7-8c6d-43c9-a657-a62f610b234a',
    whatsappNumber: process.env.INFOBIP_WHATSAPP_NUMBER || '2349130005888',
    webhookUrl: process.env.INFOBIP_WEBHOOK_URL || 'https://66ea-197-232-74-40.ngrok-free.app/webhook/infobip'
  },
  
  // App Configuration
  appName: process.env.APP_NAME || 'Wellness App',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  
  // App specific
  maxFileSize: process.env.MAX_FILE_SIZE || '5mb',
  allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,application/pdf')
    .split(','),
};

// Validate required environment variables
const requiredEnvs = [
  'DATABASE_URL', 
  'JWT_SECRET',
  'EMAIL_USER',
  'EMAIL_APP_PASSWORD'
];

const missingEnvs = requiredEnvs.filter(env => !process.env[env]);

if (missingEnvs.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvs.join(', ')}\n` +
    `Please check your .env file`
  );
}

module.exports = config;