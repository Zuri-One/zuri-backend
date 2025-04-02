// controllers/billing.controller.js
const { Billing, Patient, User, Department } = require('../models');
const { 
  calculateDiscountedPrice, 
  getPackageDetails, 
  getItemDetails,
  INSURANCE_COVERAGE_LIMIT,
  TRIAGE_PACKAGES,
  LAB_PACKAGES,
  INDIVIDUAL_ITEMS 
} = require('../utils/billing.utils');
const PDFDocument = require('pdfkit');
const { Readable } = require('stream');
const { createUploadthing } = require('uploadthing/server');
const { Op } = require('sequelize');
const whatsAppService = require('../services/whatsapp.service');

// Initialize UploadThing
const uploadthing = createUploadthing();

// Add logging function for consistent log format
const log = (message, data = null) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    service: 'billing-controller',
    message
  };
  
  if (data) {
    logEntry.data = data;
  }
  
  console.log(JSON.stringify(logEntry));
};

// Helper function to generate PDF receipt
const generateReceipt = async (billing, patient) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];
      
      // Collect PDF data chunks
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });
      doc.on('error', (err) => reject(err));

      // Add header
      doc.fontSize(18).text('ZURI HEALTH', { align: 'center' });
      doc.fontSize(14).text('RECEIPT', { align: 'center' });
      doc.moveDown();

      // Add receipt info
      doc.fontSize(10);
      doc.text(`Receipt #: ${billing.id}`);
      doc.text(`Date: ${new Date(billing.paidAt || billing.updatedAt).toLocaleDateString()}`);
      doc.text(`Patient: ${patient.fullName || `${patient.surname} ${patient.otherNames}`}`);
      doc.text(`Payment Method: ${billing.paymentMethod}`);
      if (billing.paymentReference) {
        doc.text(`Reference: ${billing.paymentReference}`);
      }
      doc.moveDown();

      // Table header
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Item', 50, doc.y, { width: 240 });
      doc.text('Qty', 290, doc.y, { width: 40 });
      doc.text('Price', 330, doc.y, { width: 80 });
      doc.text('Total', 410, doc.y, { width: 100 });
      doc.moveDown();
      
      doc.font('Helvetica');
      
      // Items
      let y = doc.y;
      (billing.items || []).forEach(item => {
        doc.text(item.description, 50, y, { width: 240 });
        doc.text(item.quantity.toString(), 290, y, { width: 40 });
        doc.text(`KSh ${parseFloat(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 330, y, { width: 80 });
        doc.text(`KSh ${parseFloat(item.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 410, y, { width: 100 });
        y += 20;
      });

      doc.moveTo(50, y).lineTo(510, y).stroke();
      y += 10;

      // Total
      doc.font('Helvetica-Bold');
      doc.text('Total', 330, y, { width: 80 });
      doc.text(`KSh ${parseFloat(billing.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 410, y, { width: 100 });
      
      doc.moveDown(2);
      doc.font('Helvetica');
      doc.text('Thank you for choosing Zuri Health!', { align: 'center' });
      
      // Finalize PDF
      doc.end();
      
    } catch (error) {
      reject(error);
    }
  });
};

// Helper function to upload to UploadThing
const uploadReceipt = async (pdfBuffer, fileName) => {
  try {
    // Create a readable stream from the buffer
    const stream = Readable.from(pdfBuffer);
    
    // Upload to UploadThing
    const result = await uploadthing.uploadFiles({
      file: {
        name: fileName,
        size: pdfBuffer.length,
        type: 'application/pdf',
        stream: () => stream
      },
      middleware: {
        // Add any middleware context needed by UploadThing
      }
    });
    
    log('Receipt uploaded to UploadThing', {
      fileName,
      fileUrl: result.url
    });
    
    return result.url;
  } catch (error) {
    log('Error uploading receipt', {
      error: error.toString(),
      stack: error.stack
    });
    throw error;
  }
};

exports.addBillingItems = async (req, res, next) => {
  try {
    log('Received billing request', {
      patientId: req.body.patientId,
      type: req.body.type,
      departmentId: req.body.departmentId,
      itemCount: req.body.items?.length
    });
    
    const { patientId, type, items, departmentId, notes } = req.body;

    if (!items || !Array.isArray(items)) {
      log('Missing items array');
      return res.status(400).json({
        success: false,
        message: 'Items array is required'
      });
    }

    if (!departmentId) {
      log('Missing departmentId');
      return res.status(400).json({
        success: false,
        message: 'Department ID is required'
      });
    }

    // Check for valid UUID format for departmentId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(departmentId)) {
      log('Invalid departmentId format', { departmentId });
      return res.status(400).json({
        success: false,
        message: 'Invalid department ID format'
      });
    }

    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      log('Patient not found', { patientId });
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    const isInsurance = patient.paymentScheme.type === 'INSURANCE';
    log('Patient payment type', { 
      patientId, 
      paymentType: patient.paymentScheme.type,
      isInsurance
    });
    
    let totalAmount = 0;
    let billingItems = [];

    // Process all items
    for (const item of items) {
      if (!item.id || !item.type) {
        log('Invalid item', { item });
        continue;
      }

      if (item.type === 'PACKAGE') {
        const packageDetails = getPackageDetails(item.id, type);
        if (packageDetails) {
          const packagePrice = calculateDiscountedPrice(packageDetails.basePrice, !isInsurance);
          const packageTotal = packagePrice * (item.quantity || 1);
          
          log('Adding package to bill', {
            packageId: item.id,
            name: packageDetails.name,
            basePrice: packageDetails.basePrice,
            discountedPrice: packagePrice,
            quantity: item.quantity || 1,
            total: packageTotal
          });
          
          billingItems.push({
            description: packageDetails.name,
            amount: packagePrice,
            quantity: item.quantity || 1,
            total: packageTotal,
            type: 'PACKAGE',
            items: packageDetails.items,
            discount: !isInsurance ? 0.15 : 0
          });
          totalAmount += packageTotal;
        } else {
          log('Package not found', { packageId: item.id, type });
        }
      } else if (item.type === 'ITEM') {
        // Get item details from either predefined items or Medications table
        log('Processing item', { itemId: item.id, type, quantity: item.quantity });
        // Pass the billing type (e.g., 'PHARMACY') to help distinguish
        const itemDetails = await getItemDetails(item.id, type);
        
        if (itemDetails) {
          const itemPrice = calculateDiscountedPrice(itemDetails.basePrice, !isInsurance);
          const itemTotal = itemPrice * (item.quantity || 1);
          
          log('Adding item to bill', {
            itemId: item.id,
            name: itemDetails.name,
            basePrice: itemDetails.basePrice,
            discountedPrice: itemPrice,
            quantity: item.quantity || 1,
            total: itemTotal,
            isPharmacy: type === 'PHARMACY'
          });
          
          billingItems.push({
            description: itemDetails.name,
            amount: itemPrice,
            quantity: item.quantity || 1,
            total: itemTotal,
            type: type === 'PHARMACY' ? 'MEDICATION' : 'INDIVIDUAL',
            category: itemDetails.category,
            discount: !isInsurance ? 0.15 : 0,
            // Include additional medication details if available
            strength: itemDetails.strength,
            medicationType: itemDetails.type,
            itemId: item.id // Store the original medication ID for reference
          });
          
          totalAmount += itemTotal;
        } else {
          log('Item not found', { itemId: item.id, type });
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
      log('Creating new billing record', { 
        patientId, 
        itemCount: billingItems.length, 
        totalAmount 
      });
      
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
      const updatedTotal = parseFloat(billing.totalAmount) + totalAmount;
      
      log('Updating existing billing record', { 
        billingId: billing.id,
        currentItemCount: billing.items.length,
        newItemCount: billingItems.length,
        currentTotal: billing.totalAmount,
        additionalAmount: totalAmount,
        newTotal: updatedTotal
      });
      
      await billing.update({
        items: updatedItems,
        totalAmount: updatedTotal,
        subtotal: updatedTotal,
        notes: notes || billing.notes,
        updatedBy: req.user.id
      });
    }

    log('Billing items added successfully', { 
      billingId: billing.id, 
      totalItems: billing.items.length,
      totalAmount: billing.totalAmount
    });

    res.status(201).json({
      success: true,
      message: 'Billing items added successfully',
      data: billing
    });

  } catch (error) {
    log('Error adding billing items', { 
      error: error.toString(),
      stack: error.stack
    });
    next(error);
  }
};

exports.getCurrentBill = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    log('Getting current bill for patient', { patientId });

    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      log('Patient not found', { patientId });
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

    log('Found active bill', { 
      patientId, 
      billFound: !!activeBill, 
      itemCount: activeBill?.items?.length || 0 
    });

    // Recalculate the total amount from the items to ensure accuracy
    if (activeBill && activeBill.items && activeBill.items.length > 0) {
      const calculatedTotal = activeBill.items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
      
      log('Recalculated bill total', {
        storedTotal: parseFloat(activeBill.totalAmount),
        calculatedTotal,
        difference: calculatedTotal - parseFloat(activeBill.totalAmount)
      });
      
      // Update the bill if the calculated total doesn't match
      if (calculatedTotal !== parseFloat(activeBill.totalAmount)) {
        log('Updating bill total to match calculated total', {
          oldTotal: activeBill.totalAmount,
          newTotal: calculatedTotal.toFixed(2)
        });
        
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
      
      log('Insurance coverage calculated', insuranceCoverage);
    }

    log('Returning current bill', {
      totalAmount: activeBill?.totalAmount || 0,
      itemCount: activeBill?.items?.length || 0,
      paymentType: patient.paymentScheme.type
    });

    res.json({
      success: true,
      data: {
        currentBill: activeBill || { totalAmount: 0, items: [] },
        insuranceCoverage,
        paymentType: patient.paymentScheme.type
      }
    });

  } catch (error) {
    log('Error getting current bill', { 
      error: error.toString(),
      stack: error.stack,
      patientId: req.params.patientId
    });
    next(error);
  }
};

exports.finalizePayment = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { paymentMethod, paymentReference, sendReceipt = false } = req.body;
    
    log('Finalizing payment', { patientId, paymentMethod, sendReceipt });

    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      log('Patient not found', { patientId });
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    const billing = await Billing.findOne({
      where: {
        patientId,
        status: 'ACTIVE',
        paymentStatus: 'PENDING'
      }
    });

    if (!billing) {
      log('No pending bill found', { patientId });
      return res.status(404).json({
        success: false,
        message: 'No pending bill found'
      });
    }

    log('Updating bill status to PAID', { 
      billingId: billing.id, 
      totalAmount: billing.totalAmount 
    });

    // Update billing status
    await billing.update({
      paymentStatus: 'PAID',
      paymentMethod,
      paymentReference,
      paidAt: new Date(),
      updatedBy: req.user.id
    });

    // Generate and upload receipt if requested
    let receiptUrl = null;
    if (sendReceipt) {
      try {
        log('Generating receipt PDF', { billingId: billing.id });
        const pdfBuffer = await generateReceipt(billing, patient);
        
        // Generate a unique filename
        const fileName = `receipt-${billing.id}-${Date.now()}.pdf`;
        
        // Upload the PDF
        receiptUrl = await uploadReceipt(pdfBuffer, fileName);
        
        // Store the receipt URL with the billing record
        await billing.update({
          metadata: {
            ...billing.metadata,
            receiptUrl
          }
        });
        
        // Send receipt via WhatsApp if phone number exists
        if (patient.contactInfo && patient.contactInfo.telephone1) {
          try {
            log('Sending receipt via WhatsApp', { 
              phone: patient.contactInfo.telephone1,
              receiptUrl
            });
            
            await whatsAppService.sendDocumentLink(
              patient.contactInfo.telephone1,
              receiptUrl
            );
            
            log('WhatsApp receipt notification sent successfully');
          } catch (whatsappError) {
            log('Failed to send WhatsApp receipt notification', {
              error: whatsappError.toString()
            });
            // Don't throw the error, just log it
          }
        } else {
          log('Cannot send WhatsApp receipt - no phone number', {
            patientId
          });
        }
      } catch (receiptError) {
        log('Error generating/uploading receipt', {
          error: receiptError.toString(),
          stack: receiptError.stack
        });
        // Don't throw the error, just log it
      }
    }

    log('Payment processed successfully', {
      billingId: billing.id,
      totalAmount: billing.totalAmount,
      paymentMethod,
      reference: paymentReference,
      receiptSent: !!receiptUrl
    });

    res.json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        billing,
        receiptUrl
      }
    });

  } catch (error) {
    log('Error finalizing payment', { 
      error: error.toString(),
      stack: error.stack,
      patientId: req.params.patientId
    });
    next(error);
  }
};

exports.getAvailablePackages = async (req, res) => {
  const { type } = req.query;
  log('Getting available packages', { type });
  
  const packages = type === 'LAB' ? LAB_PACKAGES : TRIAGE_PACKAGES;
  
  res.json({
    success: true,
    data: packages
  });
};

exports.getAvailableItems = async (req, res) => {
  log('Getting available individual items');
  
  res.json({
    success: true,
    data: INDIVIDUAL_ITEMS
  });
};

exports.getBillingHistory = async (req, res, next) => {
  try {
    const { patientId, startDate, endDate, status, page = 1, limit = 10 } = req.query;
    
    log('Getting billing history', { patientId, startDate, endDate, status });
    
    const whereClause = {};
    
    if (patientId) {
      whereClause.patientId = patientId;
    }
    
    if (status) {
      whereClause.status = status;
    }
    
    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    const { count, rows: billings } = await Billing.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'surname', 'otherNames']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });
    
    log('Billing history retrieved', { 
      totalRecords: count, 
      returnedRecords: billings.length 
    });
    
    res.json({
      success: true,
      count,
      pages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: billings
    });
    
  } catch (error) {
    log('Error getting billing history', { 
      error: error.toString(),
      stack: error.stack
    });
    next(error);
  }
};

exports.getBillingDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    log('Getting billing details', { billingId: id });
    
    const billing = await Billing.findOne({
      where: { id },
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'surname', 'otherNames']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name']
        }
      ]
    });
    
    if (!billing) {
      log('Billing record not found', { billingId: id });
      return res.status(404).json({
        success: false,
        message: 'Billing record not found'
      });
    }
    
    log('Billing details retrieved', { 
      billingId: id,
      totalAmount: billing.totalAmount,
      status: billing.status,
      paymentStatus: billing.paymentStatus
    });
    
    res.json({
      success: true,
      data: billing
    });
    
  } catch (error) {
    log('Error getting billing details', { 
      error: error.toString(),
      stack: error.stack,
      billingId: req.params.id
    });
    next(error);
  }
};

exports.generateBillingReport = async (req, res, next) => {
  try {
    const { startDate, endDate, department, billType } = req.query;
    
    log('Generating billing report', { startDate, endDate, department, billType });
    
    const whereClause = {
      status: 'ACTIVE',
      paymentStatus: 'PAID',
      paidAt: {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      }
    };
    
    if (department) {
      whereClause.departmentId = department;
    }
    
    if (billType) {
      whereClause.billType = billType;
    }
    
    const billings = await Billing.findAll({
      where: whereClause,
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'surname', 'otherNames']
        },
        {
          model: Department,
          attributes: ['id', 'name']
        }
      ],
      order: [['paidAt', 'ASC']]
    });
    
    // Create summary
    const summary = {
      totalBillings: billings.length,
      totalRevenue: billings.reduce((sum, b) => sum + parseFloat(b.totalAmount), 0),
      byDepartment: {},
      byPaymentMethod: {},
      byBillType: {}
    };
    
    // Group by department
    billings.forEach(billing => {
      // By department
      const deptName = billing.Department?.name || 'Unknown';
      if (!summary.byDepartment[deptName]) {
        summary.byDepartment[deptName] = {
          count: 0,
          amount: 0
        };
      }
      summary.byDepartment[deptName].count++;
      summary.byDepartment[deptName].amount += parseFloat(billing.totalAmount);
      
      // By payment method
      const payMethod = billing.paymentMethod || 'Unknown';
      if (!summary.byPaymentMethod[payMethod]) {
        summary.byPaymentMethod[payMethod] = {
          count: 0,
          amount: 0
        };
      }
      summary.byPaymentMethod[payMethod].count++;
      summary.byPaymentMethod[payMethod].amount += parseFloat(billing.totalAmount);
      
      // By bill type
      const bType = billing.billType || 'Unknown';
      if (!summary.byBillType[bType]) {
        summary.byBillType[bType] = {
          count: 0,
          amount: 0
        };
      }
      summary.byBillType[bType].count++;
      summary.byBillType[bType].amount += parseFloat(billing.totalAmount);
    });
    
    log('Billing report generated', {
      recordCount: billings.length,
      totalRevenue: summary.totalRevenue
    });
    
    res.json({
      success: true,
      summary,
      billings
    });
    
  } catch (error) {
    log('Error generating billing report', {
      error: error.toString(),
      stack: error.stack,
      query: req.query
    });
    next(error);
  }
};

// Add a new endpoint to get or generate a receipt for an existing payment
exports.getReceipt = async (req, res, next) => {
  try {
    const { billingId } = req.params;
    const { regenerate = false, sendWhatsApp = false } = req.query;
    
    log('Getting receipt', { billingId, regenerate, sendWhatsApp });
    
    const billing = await Billing.findByPk(billingId);
    if (!billing) {
      log('Billing record not found', { billingId });
      return res.status(404).json({
        success: false,
        message: 'Billing record not found'
      });
    }
    
    // Check if this is a paid bill
    if (billing.paymentStatus !== 'PAID') {
      log('Cannot get receipt for unpaid bill', { billingId });
      return res.status(400).json({
        success: false,
        message: 'Cannot generate receipt for unpaid bill'
      });
    }
    
    // Get patient info
    const patient = await Patient.findByPk(billing.patientId);
    if (!patient) {
      log('Patient not found', { patientId: billing.patientId });
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }
    
    // Check if receipt already exists and we're not regenerating
    let receiptUrl = billing.metadata?.receiptUrl;
    if (!receiptUrl || regenerate === 'true') {
      // Generate new receipt
      try {
        log('Generating new receipt PDF', { billingId });
        const pdfBuffer = await generateReceipt(billing, patient);
        
        // Generate a unique filename
        const fileName = `receipt-${billing.id}-${Date.now()}.pdf`;
        
        // Upload the PDF
        receiptUrl = await uploadReceipt(pdfBuffer, fileName);
        
        // Store the receipt URL with the billing record
        await billing.update({
          metadata: {
            ...billing.metadata,
            receiptUrl
          }
        });
        
        log('New receipt generated and uploaded', { receiptUrl });
      } catch (receiptError) {
        log('Error generating/uploading receipt', {
          error: receiptError.toString(),
          stack: receiptError.stack
        });
        return res.status(500).json({
          success: false,
          message: 'Failed to generate receipt'
        });
      }
    }
    
    // Send via WhatsApp if requested
    if (sendWhatsApp === 'true' && patient.contactInfo && patient.contactInfo.telephone1) {
      try {
        log('Sending receipt via WhatsApp', { 
          phone: patient.contactInfo.telephone1,
          receiptUrl
        });
        
        await whatsAppService.sendDocumentLink(
          patient.contactInfo.telephone1,
          receiptUrl
        );
        
        log('WhatsApp receipt notification sent successfully');
      } catch (whatsappError) {
        log('Failed to send WhatsApp receipt notification', {
          error: whatsappError.toString()
        });
        // Don't throw the error, just log it
      }
    }
    
    res.json({
      success: true,
      data: {
        receiptUrl,
        billing
      }
    });
    
  } catch (error) {
    log('Error getting receipt', { 
      error: error.toString(),
      stack: error.stack,
      billingId: req.params.billingId
    });
    next(error);
  }
};