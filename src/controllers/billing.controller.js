const { Billing, User, Department } = require('../models');
const axios = require('axios');

exports.createBill = async (req, res) => {
  try {
    const {
      patientId,
      totalAmount,
      subtotal,
      tax = 0,
      discount = 0,
      billType,
      paymentMethod,
      items,
      metadata,
      departmentId,
      reference,
      currency = 'KES',
    } = req.body;

    console.log('Creating bill with payload:', {
      patientId,
      departmentId,
      billType,
      items,
      subtotal,
      tax,
      discount,
      totalAmount,
      paymentMethod,
      reference,
      currency
    });

    const bill = await Billing.create({
      patientId,
      departmentId,
      billType,
      items,
      subtotal,
      tax,
      discount,
      totalAmount,
      paymentMethod,
      reference,
      currency,
      paymentStatus: 'PENDING',
      status: 'ACTIVE',
      metadata,
      createdBy: req.user.id
    });

    console.log('Bill created successfully:', bill.id);

    res.status(201).json({
      success: true,
      data: bill
    });
  } catch (error) {
    console.error('Error creating bill:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create bill'
    });
  }
};

exports.initializePayment = async (req, res) => {
  try {
      const { billId, email, metadata } = req.body;
      console.log('Full request body:', req.body); // Add this log

      const bill = await Billing.findOne({
          where: { id: billId },
          include: [{
              model: User,
              as: 'patient',
              attributes: ['id', 'name', 'email', 'contactNumber']
          }]
      });

      if (!bill) {
          console.log('Bill not found:', billId);
          return res.status(404).json({
              success: false,
              message: 'Bill not found'
          });
      }

      const isMpesa = bill.paymentMethod.toLowerCase() === 'mpesa';
      const phoneNumber = metadata?.phone || bill.patient?.contactNumber;
      
      // Format phone number properly
      const formattedPhone = phoneNumber?.replace(/^0/, '254')?.replace(/[^0-9]/g, '');
      
      console.log('Payment method:', bill.paymentMethod);
      console.log('Phone number:', formattedPhone);

      // For mobile money, we need specific configuration
      const mobileMoneyConfig = isMpesa ? {
          channels: ['mobile_money'],
          mobile_money: {
              phone: formattedPhone,
              provider: 'mpesa'
          }
      } : {};

      const paymentPayload = {
          email: email || bill.patient.email,
          amount: Math.round(bill.totalAmount * 100),
          currency: bill.currency,
          reference: `PAY-${Date.now()}-${billId}`,
          callback_url: `${process.env.NEXT_PUBLIC_BASE_URL}/verify-payment`,
          ...mobileMoneyConfig,
          metadata: {
              custom_fields: [
                  {
                      display_name: "Payment Method",
                      variable_name: "payment_method",
                      value: bill.paymentMethod
                  },
                  {
                      display_name: "Phone Number",
                      variable_name: "phone_number",
                      value: formattedPhone
                  }
              ],
              billId: bill.id,
              billType: bill.billType,
              patientId: bill.patientId,
              phone: formattedPhone,
              payment_method: bill.paymentMethod
          }
      };

      console.log('Final Paystack payload:', JSON.stringify(paymentPayload, null, 2));

      const response = await axios.post(
          'https://api.paystack.co/transaction/initialize',
          paymentPayload,
          {
              headers: {
                  Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                  'Content-Type': 'application/json'
              }
          }
      );

      console.log('Raw Paystack response:', response.data);

      await bill.update({
          lastPaymentAttempt: new Date(),
          paymentReference: response.data.data.reference
      });

      res.json({
          success: true,
          data: {
              ...response.data.data,
              paymentMethod: bill.paymentMethod
          }
      });
  } catch (error) {
      console.error('Payment initialization error:', error.response?.data || error);
      res.status(500).json({
          success: false,
          message: error.response?.data?.message || 'Failed to initialize payment'
      });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { reference } = req.params;

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      }
    );

    console.log('Paystack verification response:', response.data);

    const { status, data } = response.data;
    
    // Find the bill regardless of payment status
    const bill = await Billing.findOne({
      where: { paymentReference: reference }
    });

    if (!bill) {
      return res.json({
        success: false,
        message: 'Bill not found',
        paymentStatus: data.status
      });
    }

    switch (data.status) {
      case 'success':
        await bill.update({
          paymentStatus: 'PAID',
          paidAt: new Date(),
          paymentTransactions: [
            ...(bill.paymentTransactions || []),
            {
              reference,
              amount: data.amount / 100,
              status: 'success',
              channel: data.channel,
              processor: 'paystack',
              metadata: data,
              timestamp: new Date()
            }
          ]
        });
        return res.json({
          success: true,
          message: 'Payment verified successfully',
          status: data.status
        });

      case 'pending':
        return res.json({
          success: false,
          message: 'Payment is pending',
          status: data.status
        });

      case 'failed':
        await bill.update({
          paymentStatus: 'FAILED',
          paymentTransactions: [
            ...(bill.paymentTransactions || []),
            {
              reference,
              amount: data.amount / 100,
              status: 'failed',
              channel: data.channel,
              processor: 'paystack',
              metadata: data,
              timestamp: new Date()
            }
          ]
        });
        return res.json({
          success: false,
          message: data.gateway_response || 'Payment failed',
          status: data.status
        });

      case 'abandoned':
        // Don't throw error for abandoned transactions
        return res.json({
          success: false,
          message: data.gateway_response || 'Payment was abandoned',
          status: data.status
        });

      default:
        return res.json({
          success: false,
          message: data.gateway_response || 'Payment status unknown',
          status: data.status
        });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Payment verification failed',
      error: error.response?.data?.message || error.message
    });
  }
};

exports.getBills = async (req, res) => {
  try {
    const bills = await Billing.findAll({
      include: [
        {
          model: User,
          as: 'patient',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Department,
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: bills
    });
  } catch (error) {
    console.error('Error fetching bills:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bills'
    });
  }
};

exports.getBill = async (req, res) => {
  try {
    const { id } = req.params;

    const bill = await Billing.findOne({
      where: { id },
      include: [
        {
          model: User,
          as: 'patient',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Department,
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found'
      });
    }

    res.json({
      success: true,
      data: bill
    });
  } catch (error) {
    console.error('Error fetching bill:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bill'
    });
  }
};

exports.updateBill = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const bill = await Billing.findByPk(id);
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found'
      });
    }

    updateData.updatedBy = req.user.id;
    await bill.update(updateData);

    res.json({
      success: true,
      data: bill
    });
  } catch (error) {
    console.error('Error updating bill:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update bill'
    });
  }
};

exports.cancelBill = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const bill = await Billing.findByPk(id);
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found'
      });
    }

    await bill.update({
      status: 'CANCELLED',
      notes: reason,
      updatedBy: req.user.id
    });

    res.json({
      success: true,
      message: 'Bill cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling bill:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel bill'
    });
  }
};