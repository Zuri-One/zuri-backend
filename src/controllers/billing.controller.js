// controllers/billing.controller.js
const { Billing, Patient } = require('../models');
const { 
  calculateDiscountedPrice, 
  getPackageDetails, 
  getItemDetails,
  INSURANCE_COVERAGE_LIMIT,
  TRIAGE_PACKAGES,
  LAB_PACKAGES,
  INDIVIDUAL_ITEMS 
} = require('../utils/billing.utils');


exports.addBillingItems = async (req, res, next) => {
  try {
    console.log('Received billing data:', JSON.stringify(req.body, null, 2));
    
    const { patientId, type, items, departmentId, notes } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'Items array is required'
      });
    }

    if (!departmentId) {
      return res.status(400).json({
        success: false,
        message: 'Department ID is required'
      });
    }

    // Check for valid UUID format for departmentId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(departmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid department ID format'
      });
    }

    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    
    }

    const isInsurance = patient.paymentScheme.type === 'INSURANCE';
    let totalAmount = 0;
    let billingItems = [];

    // Process all items
    for (const item of items) {
      if (!item.id || !item.type) {
        console.error('Invalid item:', item);
        continue;
      }

      if (item.type === 'PACKAGE') {
        const packageDetails = getPackageDetails(item.id, type);
        if (packageDetails) {
          const packagePrice = calculateDiscountedPrice(packageDetails.basePrice, !isInsurance);
          billingItems.push({
            description: packageDetails.name,
            amount: packagePrice,
            quantity: item.quantity || 1,
            total: packagePrice * (item.quantity || 1),
            type: 'PACKAGE',
            items: packageDetails.items,
            discount: !isInsurance ? 0.15 : 0
          });
          totalAmount += packagePrice * (item.quantity || 1);
        }
      } else if (item.type === 'ITEM') {
        const itemDetails = getItemDetails(item.id);
        if (itemDetails) {
          const itemPrice = calculateDiscountedPrice(itemDetails.basePrice, !isInsurance);
          const itemTotal = itemPrice * (item.quantity || 1);
          billingItems.push({
            description: itemDetails.name,
            amount: itemPrice,
            quantity: item.quantity || 1,
            total: itemTotal,
            type: 'INDIVIDUAL',
            category: itemDetails.category,
            discount: !isInsurance ? 0.15 : 0
          });
          totalAmount += itemTotal;
        }
      }
    }

    // Create or update billing record
    let billing = await Billing.findOne({
      where: {
        patientId,
        status: 'ACTIVE',
        paymentStatus: 'PENDING'
      }
    });

    if (!billing) {
      billing = await Billing.create({
        patientId,
        departmentId,
        billType: type,
        items: billingItems,
        subtotal: totalAmount,
        totalAmount,
        paymentMethod: isInsurance ? 'INSURANCE' : 'CASH',
        paymentStatus: 'PENDING',
        status: 'ACTIVE',
        createdBy: req.user.id,
        notes,
        metadata: {
          discountApplied: isInsurance ? 0 : 0.15,
          serviceType: type
        }
      });
    } else {
      const updatedItems = [...billing.items, ...billingItems];
      const updatedTotal = billing.totalAmount + totalAmount;
      
      await billing.update({
        items: updatedItems,
        totalAmount: updatedTotal,
        subtotal: updatedTotal,
        notes: notes || billing.notes,
        updatedBy: req.user.id
      });
    }

    res.status(201).json({
      success: true,
      message: 'Billing items added successfully',
      data: billing
    });

  } catch (error) {
    console.error('Error adding billing items:', error);
    next(error);
  }
};

exports.getCurrentBill = async (req, res, next) => {
  try {
    const { patientId } = req.params;

    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    const activeBill = await Billing.findOne({
      where: {
        patientId,
        status: 'ACTIVE',
        paymentStatus: 'PENDING'
      }
    });

    // Recalculate the total amount from the items to ensure accuracy
    if (activeBill && activeBill.items && activeBill.items.length > 0) {
      const calculatedTotal = activeBill.items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
      
      // Update the bill if the calculated total doesn't match
      if (calculatedTotal !== parseFloat(activeBill.totalAmount)) {
        await activeBill.update({
          subtotal: calculatedTotal.toFixed(2),
          totalAmount: calculatedTotal.toFixed(2)
        });
        
        // Refresh the activeBill object with updated values
        activeBill.subtotal = calculatedTotal.toFixed(2);
        activeBill.totalAmount = calculatedTotal.toFixed(2);
      }
    }

    // Get insurance coverage info if applicable
    let insuranceCoverage = null;
    if (patient.paymentScheme.type !== 'CASH') {
      // For now, using hardcoded coverage limit
      const totalBilled = activeBill ? parseFloat(activeBill.totalAmount) : 0;
      insuranceCoverage = {
        limit: INSURANCE_COVERAGE_LIMIT,
        used: totalBilled,
        remaining: INSURANCE_COVERAGE_LIMIT - totalBilled
      };
    }

    res.json({
      success: true,
      data: {
        currentBill: activeBill || { totalAmount: 0, items: [] },
        insuranceCoverage,
        paymentType: patient.paymentScheme.type
      }
    });

  } catch (error) {
    next(error);
  }
};

exports.finalizePayment = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { paymentMethod, paymentReference } = req.body;

    const billing = await Billing.findOne({
      where: {
        patientId,
        status: 'ACTIVE',
        paymentStatus: 'PENDING'
      }
    });

    if (!billing) {
      return res.status(404).json({
        success: false,
        message: 'No pending bill found'
      });
    }

    await billing.update({
      paymentStatus: 'PAID',
      paymentMethod,
      paymentReference,
      paidAt: new Date(),
      updatedBy: req.user.id
    });

    res.json({
      success: true,
      message: 'Payment processed successfully',
      data: billing
    });

  } catch (error) {
    next(error);
  }
};

exports.getAvailablePackages = async (req, res) => {
  const { type } = req.query;
  const packages = type === 'LAB' ? LAB_PACKAGES : TRIAGE_PACKAGES;
  
  res.json({
    success: true,
    data: packages
  });
};

exports.getAvailableItems = async (req, res) => {
  res.json({
    success: true,
    data: INDIVIDUAL_ITEMS
  });
};