const axios = require('axios');
const { Billing } = require('../models');

exports.verifyPaystackPayment = async (reference) => {
  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Paystack verification error:', error);
    throw new Error('Failed to verify payment with Paystack');
  }
};

exports.createBillingRecord = async (billingData) => {
  try {
    const billing = await Billing.create(billingData);
    return billing;
  } catch (error) {
    console.error('Error creating billing record:', error);
    throw new Error('Failed to create billing record');
  }
};