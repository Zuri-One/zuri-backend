// controllers/paystack.controller.js
const axios = require('axios');
const crypto = require('crypto');
const { Billing, Patient } = require('../models');

// Initialize a Paystack transaction
exports.initializePaystack = async (req, res, next) => {
  try {
    const { amount, email, metadata } = req.body;

    if (!amount || !email) {
      return res.status(400).json({
        success: false,
        message: 'Amount and email are required'
      });
    }

    // Make request to Paystack API
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        amount: Math.round(amount * 100), // Convert to cents (smallest currency unit)
        email,
        currency: 'KES', // Specify Kenyan Shilling
        metadata: {
          ...metadata,
          customFields: [
            {
              display_name: 'Patient ID',
              variable_name: 'patient_id',
              value: metadata.patientId || ''
            },
            {
              display_name: 'Bill ID',
              variable_name: 'bill_id',
              value: metadata.billId || ''
            }
          ]
        },
        callback_url: `${process.env.FRONTEND_URL}/reception/payment-callback`
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.status(200).json({
      success: true,
      data: response.data.data
    });
  } catch (error) {
    console.error('Error initializing Paystack transaction:', error);
    next(error);
  }
};

// Verify a Paystack transaction
exports.verifyPaystack = async (req, res, next) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: 'Transaction reference is required'
      });
    }

    // Make request to Paystack API
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const { status, data } = response.data;

    // If transaction is successful and we have metadata, update the billing
    if (status && data.status === 'success' && data.metadata) {
      const { patient_id, bill_id } = data.metadata.customFields || {};
      
      if (patient_id && bill_id) {
        // Find the billing record
        const billing = await Billing.findOne({
          where: {
            id: bill_id,
            patientId: patient_id,
            status: 'ACTIVE',
            paymentStatus: 'PENDING'
          }
        });

        if (billing) {
          // Update billing record
          await billing.update({
            paymentStatus: 'PAID',
            paymentMethod: 'PAYSTACK',
            paymentReference: reference,
            paidAt: new Date(),
            updatedBy: req.user.id
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error verifying Paystack transaction:', error);
    next(error);
  }
};

// Handle Paystack webhook
exports.paystackWebhook = async (req, res) => {
  // Validate event
  const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(400).send('Invalid signature');
  }

  // Process the event
  const event = req.body;

  // If it's a successful charge, update the billing
  if (event.event === 'charge.success') {
    const { reference, metadata } = event.data;
    
    try {
      // Extract patient and bill IDs from metadata
      const customFields = metadata?.customFields || [];
      const patientId = customFields.find(field => field.variable_name === 'patient_id')?.value;
      const billId = customFields.find(field => field.variable_name === 'bill_id')?.value;

      if (patientId && billId) {
        // Find the billing record
        const billing = await Billing.findOne({
          where: {
            id: billId,
            patientId,
            status: 'ACTIVE',
            paymentStatus: 'PENDING'
          }
        });

        if (billing) {
          // Update billing record
          await billing.update({
            paymentStatus: 'PAID',
            paymentMethod: 'PAYSTACK',
            paymentReference: reference,
            paidAt: new Date(),
            // For webhook, we don't have a user ID, so use system
            updatedBy: 'SYSTEM'
          });

          console.log(`Billing ${billId} updated via webhook`);
        }
      }
    } catch (error) {
      console.error('Error processing webhook:', error);
    }
  }

  // Respond to Paystack
  res.status(200).send('Webhook received');
};