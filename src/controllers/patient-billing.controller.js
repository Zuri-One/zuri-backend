const { OmaeraMedication, PharmacyBill, Patient, User } = require('../models');
const { Op } = require('sequelize');

class PatientBillingController {
  
  async searchPatients(req, res, next) {
    try {
      const { search, limit = 20 } = req.query;
      
      if (!search || search.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Search term must be at least 2 characters'
        });
      }
      
      const searchTerm = search.trim();
      
      const patients = await Patient.findAll({
        where: {
          isActive: true,
          [Op.or]: [
            { patientNumber: { [Op.iLike]: `%${searchTerm}%` } },
            { telephone1: { [Op.iLike]: `%${searchTerm}%` } },
            { telephone2: { [Op.iLike]: `%${searchTerm}%` } },
            { email: { [Op.iLike]: `%${searchTerm}%` } },
            { idNumber: { [Op.iLike]: `%${searchTerm}%` } },
            { surname: { [Op.iLike]: `%${searchTerm}%` } },
            { otherNames: { [Op.iLike]: `%${searchTerm}%` } }
          ]
        },
        attributes: [
          'id', 'patientNumber', 'surname', 'otherNames', 
          'telephone1', 'telephone2', 'email', 'idNumber', 
          'sex', 'dateOfBirth', 'residence', 'town'
        ],
        limit: parseInt(limit),
        order: [['surname', 'ASC']]
      });
      
      res.json({
        success: true,
        count: patients.length,
        patients
      });
      
    } catch (error) {
      next(error);
    }
  }
  
  async searchMedications(req, res, next) {
    try {
      const {
        search,
        code,
        description,
        taxCode,
        minPrice,
        maxPrice,
        packSize,
        page = 1,
        limit = 20,
        sortBy = 'itemDescription',
        sortOrder = 'ASC'
      } = req.query;

      const whereClause = { isActive: true };

      // Text filters
      const orConditions = [];
      if (search && search.trim()) {
        orConditions.push(
          { itemCode: { [Op.iLike]: `%${search.trim()}%` } },
          { itemDescription: { [Op.iLike]: `%${search.trim()}%` } }
        );
      }
      if (code && code.trim()) {
        orConditions.push({ itemCode: { [Op.iLike]: `%${code.trim()}%` } });
      }
      if (description && description.trim()) {
        orConditions.push({ itemDescription: { [Op.iLike]: `%${description.trim()}%` } });
      }
      if (orConditions.length) {
        whereClause[Op.or] = orConditions;
      }

      // Numeric filters
      if (minPrice) {
        whereClause.currentPrice = { [Op.gte]: parseFloat(minPrice) };
      }
      if (maxPrice) {
        if (whereClause.currentPrice) {
          whereClause.currentPrice[Op.lte] = parseFloat(maxPrice);
        } else {
          whereClause.currentPrice = { [Op.lte]: parseFloat(maxPrice) };
        }
      }

      // Tax filter
      if (taxCode !== undefined) {
        const parsedTax = parseFloat(taxCode);
        if (!isNaN(parsedTax)) {
          whereClause.taxCode = parsedTax;
        }
      }

      // Pack size
      if (packSize && packSize.trim()) {
        whereClause.packSize = { [Op.iLike]: `%${packSize.trim()}%` };
      }

      // Sorting allowlist
      const allowedSort = new Set(['itemCode', 'currentPrice', 'createdAt', 'itemDescription']);
      const order = [[allowedSort.has(sortBy) ? sortBy : 'itemDescription', String(sortOrder).toUpperCase() === 'DESC' ? 'DESC' : 'ASC']];

      const { count, rows: medications } = await OmaeraMedication.findAndCountAll({
        where: whereClause,
        attributes: [
          'id', 'itemCode', 'itemDescription', 'packSize',
          'taxCode', 'currentPrice', 'originalPrice'
        ],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        order
      });

      const totalPages = Math.ceil(count / parseInt(limit));

      res.json({
        success: true,
        count: medications.length,
        total: count,
        pages: totalPages,
        currentPage: parseInt(page),
        medications
      });
    } catch (error) {
      next(error);
    }
  }
  
  async getMedicationById(req, res, next) {
    try {
      const { id } = req.params;
      
      const medication = await OmaeraMedication.findOne({
        where: { id, isActive: true }
      });
      
      if (!medication) {
        return res.status(404).json({
          success: false,
          message: 'Medication not found'
        });
      }
      
      res.json({
        success: true,
        medication
      });
      
    } catch (error) {
      next(error);
    }
  }
  
  async updateMedicationPrice(req, res, next) {
    try {
      const { id } = req.params;
      const { currentPrice, notes } = req.body;
      
      if (!currentPrice || currentPrice <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid current price is required'
        });
      }
      
      const medication = await OmaeraMedication.findOne({
        where: { id, isActive: true }
      });
      
      if (!medication) {
        return res.status(404).json({
          success: false,
          message: 'Medication not found'
        });
      }
      
      await medication.update({
        currentPrice: parseFloat(currentPrice),
        notes: notes || null,
        lastUpdatedBy: req.user.id
      });
      
      res.json({
        success: true,
        message: 'Medication price updated successfully'
      });
      
    } catch (error) {
      next(error);
    }
  }
  
  async createPharmacyBill(req, res, next) {
    try {
      const { patientId, items, notes } = req.body;

      if (!patientId || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Patient ID and items array are required'
        });
      }

      const patient = await Patient.findOne({
        where: { id: patientId, isActive: true }
      });

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      let subtotal = 0;
      let totalTax = 0;
      const billItems = [];

      for (const item of items) {
        // Accept either a medication-backed line OR a custom charge line
        // Medication-backed line:
        //   { medicationId?: uuid, itemCode?: string, quantity: number, unitPriceOverride?: number, notes?: string }
        // Custom line:
        //   { type: 'CUSTOM', description: string, quantity: number, unitPrice: number, taxRate?: number, itemCode?: string, notes?: string }
        const quantity = parseInt(item.quantity, 10);
        if (!quantity || quantity <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Each item must have a valid quantity (> 0)'
          });
        }

        // Custom item path
        if (item.type === 'CUSTOM' || (!item.medicationId && !item.itemCode)) {
          const description = (item.description || '').trim();
          const unitPrice = parseFloat(item.unitPrice);
          const taxRate = item.taxRate != null ? parseFloat(item.taxRate) : 0;

          if (!description || isNaN(unitPrice) || unitPrice <= 0) {
            return res.status(400).json({
              success: false,
              message: 'Custom items require description and positive unitPrice'
            });
          }

          const lineSubtotal = unitPrice * quantity;
          const lineTax = lineSubtotal * ((isNaN(taxRate) ? 0 : taxRate) / 100);
          const lineTotal = lineSubtotal + lineTax;

          billItems.push({
            type: 'CUSTOM',
            itemCode: item.itemCode || null,
            itemDescription: description,
            packSize: null,
            unitPrice,
            quantity,
            subtotal: lineSubtotal,
            taxRate: isNaN(taxRate) ? 0 : taxRate,
            taxAmount: lineTax,
            total: lineTotal,
            notes: item.notes || null
          });

          subtotal += lineSubtotal;
          totalTax += lineTax;
          continue;
        }

        // Medication-backed path (by medicationId or itemCode)
        let medication = null;
        if (item.medicationId) {
          medication = await OmaeraMedication.findOne({
            where: { id: item.medicationId, isActive: true }
          });
        } else if (item.itemCode) {
          medication = await OmaeraMedication.findOne({
            where: { itemCode: item.itemCode, isActive: true }
          });
        }

        if (!medication) {
          return res.status(404).json({
            success: false,
            message: `Medication not found for ${item.medicationId || item.itemCode}`
          });
        }

        // Allow a per-line override price
        const basePrice = item.unitPriceOverride != null
          ? parseFloat(item.unitPriceOverride)
          : parseFloat(medication.currentPrice);

        if (isNaN(basePrice) || basePrice <= 0) {
          return res.status(400).json({
            success: false,
            message: `Invalid unit price for ${medication.itemCode}`
          });
        }

        const taxRate = medication.taxCode != null ? parseFloat(medication.taxCode) : 0;
        const lineSubtotal = basePrice * quantity;
        const lineTax = lineSubtotal * ((isNaN(taxRate) ? 0 : taxRate) / 100);
        const lineTotal = lineSubtotal + lineTax;

        billItems.push({
          type: 'MEDICATION',
          medicationId: medication.id,
          itemCode: medication.itemCode,
          itemDescription: medication.itemDescription,
          packSize: medication.packSize,
          unitPrice: basePrice,
          quantity,
          subtotal: lineSubtotal,
          taxRate: isNaN(taxRate) ? 0 : taxRate,
          taxAmount: lineTax,
          total: lineTotal,
          notes: item.notes || null
        });

        subtotal += lineSubtotal;
        totalTax += lineTax;
      }

      const totalAmount = subtotal + totalTax;

      // Generate bill number PBYYYYMMDD#### (sequence resets daily)
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');

      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      const count = await PharmacyBill.count({
        where: {
          createdAt: {
            [Op.between]: [todayStart, todayEnd]
          }
        }
      });

      const sequence = String(count + 1).padStart(4, '0');
      const billNumber = `PB${year}${month}${day}${sequence}`;

      const bill = await PharmacyBill.create({
        billNumber,
        patientId,
        items: billItems,
        subtotal,
        totalTax,
        totalAmount,
        createdBy: req.user.id,
        notes: notes || null
      });

      res.status(201).json({
        success: true,
        message: 'Pharmacy bill created successfully',
        bill: {
          id: bill.id,
          billNumber: bill.billNumber,
          patientId,
          items: billItems,
          subtotal,
          totalTax,
          totalAmount,
          status: 'PENDING'
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  async getPharmacyBills(req, res, next) {
    try {
      const {
        patientId,
        status,
        startDate,
        endDate,
        page = 1,
        limit = 20
      } = req.query;

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

      const { count, rows: bills } = await PharmacyBill.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: ['surname', 'otherNames', 'patientNumber']
          },
          {
            model: User,
            as: 'creator',
            attributes: ['surname', 'otherNames']
          }
        ],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        order: [['createdAt', 'DESC']]
      });

      res.json({
        success: true,
        count: bills.length,
        total: count,
        bills
      });
    } catch (error) {
      next(error);
    }
  }

  async getPatientBills(req, res, next) {
    try {
      const { patientId } = req.params;
      const {
        status,
        startDate,
        endDate,
        page = 1,
        limit = 20
      } = req.query;

      if (!patientId) {
        return res.status(400).json({
          success: false,
          message: 'patientId is required'
        });
      }

      const whereClause = { patientId };

      if (status) {
        whereClause.status = status;
      }

      if (startDate && endDate) {
        whereClause.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }

      const { count, rows: bills } = await PharmacyBill.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: [
              'id',
              'patientNumber',
              'surname',
              'otherNames',
              'sex',
              'dateOfBirth',
              'telephone1',
              'telephone2',
              'email',
              'idType',
              'idNumber',
              'paymentScheme',
              'insuranceInfo'
            ]
          },
          {
            model: User,
            as: 'creator',
            attributes: ['surname', 'otherNames']
          }
        ],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        order: [['createdAt', 'DESC']]
      });

      // Enrich each bill's patient with payment details from the bill
      const enrichedBills = bills.map((bill) => {
        const b = bill.toJSON();
        if (b.patient) {
          b.patient = {
            ...b.patient,
            paymentScheme: b.patient.paymentScheme || null,
            insuranceInfo: b.patient.insuranceInfo || null,
            payment: {
              method: b.paymentMethod || null,
              reference: b.paymentReference || null,
              paidAt: b.paidAt || null
            }
          };
        }
        return b;
      });

      res.json({
        success: true,
        count: enrichedBills.length,
        total: count,
        bills: enrichedBills
      });
    } catch (error) {
      next(error);
    }
  }
  
  async updateBillStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, paymentMethod, paymentReference } = req.body;

      if (!['PENDING', 'PAID', 'ESCALATED', 'DEFAULT'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be PENDING, PAID, ESCALATED, or DEFAULT'
        });
      }

      const bill = await PharmacyBill.findByPk(id);

      if (!bill) {
        return res.status(404).json({
          success: false,
          message: 'Bill not found'
        });
      }

      const updateData = {
        status,
        updatedBy: req.user.id
      };

      if (status === 'PAID') {
        updateData.paidAt = new Date();
        if (paymentMethod) updateData.paymentMethod = paymentMethod;
        if (paymentReference) updateData.paymentReference = paymentReference;
      } else {
        // Clear payment fields when not PAID
        updateData.paidAt = null;
        updateData.paymentMethod = null;
        updateData.paymentReference = null;
      }

      await bill.update(updateData);

      res.json({
        success: true,
        message: 'Bill status updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
  
  async getBillDetails(req, res, next) {
    try {
      const { id } = req.params;

      const bill = await PharmacyBill.findOne({
        where: { id },
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: [
              'id',
              'patientNumber',
              'surname',
              'otherNames',
              'sex',
              'dateOfBirth',
              'telephone1',
              'telephone2',
              'email',
              'idType',
              'idNumber',
              'paymentScheme',
              'insuranceInfo'
            ]
          },
          {
            model: User,
            as: 'creator',
            attributes: ['surname', 'otherNames']
          }
        ]
      });

      if (!bill) {
        return res.status(404).json({
          success: false,
          message: 'Bill not found'
        });
      }

      // Enrich patient object with payment details and full scheme/insurance info
      const b = bill.toJSON();
      if (b.patient) {
        b.patient = {
          ...b.patient,
          paymentScheme: b.patient.paymentScheme || null,  // { type, provider, policyNumber, memberNumber }
          insuranceInfo: b.patient.insuranceInfo || null,  // { scheme, provider, membershipNumber, principalMember }
          payment: {
            method: b.paymentMethod || null,
            reference: b.paymentReference || null,
            paidAt: b.paidAt || null
          }
        };
      }

      return res.json({
        success: true,
        bill: b
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PatientBillingController();