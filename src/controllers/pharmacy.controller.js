const {
  Medication,
  StockMovement,
  MedicationDispense,
  Supplier,
  InventoryReceipt,
  User,
  Patient,
  Prescription,
  sequelize
 } = require('../models');
 
 const { Op } = require('sequelize');
 const { sendEmail } = require('../utils/email.util');
 const { generateDispenseReport } = require('../utils/pdf.util');
 const { validateMedicationInteractions } = require('../utils/pharmacy.util');
 const { 
  calculateDiscountedPrice, 
  getPackageDetails, 
  getItemDetails,
  INSURANCE_COVERAGE_LIMIT,
  TRIAGE_PACKAGES,
  LAB_PACKAGES,
  INDIVIDUAL_ITEMS 
 } = require('../utils/billing.utils');
 
 class PharmacyController {
  // Supplier Management
  async getSuppliers(req, res, next) {
    try {
      const { search, page = 1, limit = 10 } = req.query;
 
      const whereClause = { isActive: true };
 
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { supplierId: { [Op.iLike]: `%${search}%` } },
          { contactPerson: { [Op.iLike]: `%${search}%` } }
        ];
      }
 
      const { count, rows: suppliers } = await Supplier.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        order: [['name', 'ASC']]
      });
 
      res.json({
        success: true,
        count,
        pages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        suppliers
      });
    } catch (error) {
      next(error);
    }
  }
 
  async getSupplierById(req, res, next) {
    try {
      const { id } = req.params;
 
      const supplier = await Supplier.findOne({
        where: { id, isActive: true }
      });
 
      if (!supplier) {
        return res.status(404).json({
          success: false,
          message: 'Supplier not found'
        });
      }
 
      res.json({
        success: true,
        supplier
      });
    } catch (error) {
      next(error);
    }
  }
 
  async addSupplier(req, res, next) {
    try {
      const {
        name,
        supplierId,
        contactPerson,
        phoneNumber,
        email,
        address
      } = req.body;
 
      // Validate required fields
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Supplier name is required'
        });
      }
 
      // Check if supplier already exists
      if (supplierId) {
        const existingSupplier = await Supplier.findOne({
          where: { supplierId }
        });
 
        if (existingSupplier) {
          return res.status(400).json({
            success: false,
            message: 'Supplier ID already exists'
          });
        }
      }
 
      const supplier = await Supplier.create({
        name,
        supplierId,
        contactPerson,
        phoneNumber,
        email,
        address,
        isActive: true
      });
 
      res.status(201).json({
        success: true,
        message: 'Supplier added successfully',
        supplier
      });
    } catch (error) {
      next(error);
    }
  }
 
  async updateSupplier(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;
 
      const supplier = await Supplier.findByPk(id);
 
      if (!supplier) {
        return res.status(404).json({
          success: false,
          message: 'Supplier not found'
        });
      }
 
      await supplier.update(updateData);
 
      res.json({
        success: true,
        message: 'Supplier updated successfully',
        supplier
      });
    } catch (error) {
      next(error);
    }
  }
 
  // Inventory Receipt Management
  async addInventoryReceipt(req, res, next) {
    const transaction = await sequelize.transaction();
  
    try {
      const {
        supplierId,
        invoiceNumber,
        deliveryDate,
        deliveryMethod,
        notes,
        medications
      } = req.body;
  
      // Validate required fields
      if (!supplierId) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Supplier ID is required'
        });
      }
  
      if (!medications || !Array.isArray(medications) || medications.length === 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'At least one medication is required'
        });
      }
  
      // Check if supplier exists
      const supplier = await Supplier.findByPk(supplierId);
      if (!supplier) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Supplier not found'
        });
      }
  
      // Calculate total amount
      let totalAmount = 0;
      medications.forEach(med => {
        totalAmount += parseFloat(med.markedPrice) * parseInt(med.quantity);
      });
  
      // Create inventory receipt
      const inventoryReceipt = await InventoryReceipt.create({
        supplierId,
        invoiceNumber,
        deliveryDate: deliveryDate || new Date(),
        deliveryMethod,
        receivedBy: req.user.id,
        notes,
        totalAmount
      }, { transaction });
  
      console.log('Created inventory receipt:', inventoryReceipt.id);
  
      // Process each medication
      for (const med of medications) {
        // Calculate unit price based on markup and quantity
        const markupPercentage = parseFloat(med.markupPercentage || 15);
        const markedPrice = parseFloat(med.markedPrice);
        const quantity = parseInt(med.quantity);
        
        // Unit price is now marked price with markup divided by quantity
        const unitPrice = (markedPrice * (1 + markupPercentage / 100)) / quantity;
        
        // Calculate individual unit price
        const packSize = parseInt(med.packSize || 1);
        const individualUnitPrice = unitPrice / packSize;
  
        // Calculate total units (packSize × quantity)
        const totalUnits = packSize * quantity;
  
        let medicationId;
  
        if (med.id) {
          // Update existing medication in the uppercase Medications table
          const [updated] = await sequelize.query(`
            UPDATE "Medications"
            SET "batchNumber" = ?,
                category = ?::medication_category,
                type = ?::medication_type,
                strength = ?,
                "currentStock" = "currentStock" + ?,
                "unitPrice" = ?,
                "individualUnitPrice" = ?,
                "expiryDate" = ?,
                "updatedAt" = NOW()
            WHERE id = ?
            RETURNING id
          `, {
            replacements: [
              med.batchNumber,
              med.category,
              med.type,
              med.strength || null, // Strength is now optional
              totalUnits, // Store total units instead of pack quantity
              unitPrice,
              individualUnitPrice,
              new Date(med.expiryDate),
              med.id
            ],
            type: sequelize.QueryTypes.UPDATE,
            transaction
          });
  
          if (updated && updated.length > 0) {
            medicationId = updated[0].id;
            console.log('Updated medication:', medicationId);
          } else {
            console.log('Medication not found for update');
            await transaction.rollback();
            return res.status(404).json({
              success: false,
              message: `Medication with ID ${med.id} not found`
            });
          }
        } else {
          // Create new medication in the uppercase Medications table
          // Using only the columns that exist in that table based on the schema
          // and making sure to quote column names to preserve case sensitivity
          const [result] = await sequelize.query(`
            INSERT INTO "Medications" (
              id, name, "genericName", "batchNumber", category, type, strength, 
              manufacturer, "currentStock", "minStockLevel", "maxStockLevel", 
              supplier_id, "unitPrice", "individualUnitPrice", "expiryDate", "imageUrl", "prescriptionRequired", 
              "isActive", location, notes, "createdAt", "updatedAt", "packSize", "packUnit", "dispensingUnit", 
              "trackByPack", "unitPriceType", "markedPrice", "markupPercentage"
            ) VALUES (
              uuid_generate_v4(), ?, ?, ?, ?::medication_category, ?::medication_type, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true, ?, ?, NOW(), NOW(), ?, ?, ?, ?, ?, ?, ?
            ) RETURNING id
          `, {
            replacements: [
              med.name,
              med.genericName || null,
              med.batchNumber,
              med.category,
              med.type,
              med.strength || null, // Strength is now optional
              med.manufacturer || null,
              totalUnits, // Store total units instead of pack quantity
              med.minStockLevel || 10,
              med.maxStockLevel || 1000,
              supplierId,
              unitPrice,
              individualUnitPrice,
              new Date(med.expiryDate),
              med.imageUrl || null,
              med.prescriptionRequired !== undefined ? med.prescriptionRequired : true,
              med.location || null,
              med.notes || null,
              packSize,
              med.packUnit || 'tablet',
              med.dispensingUnit || med.packUnit || 'tablet',
              med.trackByPack || false,
              med.unitPriceType || 'PER_UNIT',
              markedPrice,
              markupPercentage
            ],
            transaction,
            type: sequelize.QueryTypes.INSERT
          });
  
          if (result && result.length > 0) {
            medicationId = result[0].id;
            console.log('Created new medication:', medicationId);
          } else {
            console.log('Failed to get ID from medication creation');
            await transaction.rollback();
            return res.status(500).json({
              success: false,
              message: 'Failed to create medication record'
            });
          }
        }
  
        // Create stock movement with the medication ID
        if (medicationId) {
          await sequelize.query(`
            INSERT INTO stock_movements (
              id, medication_id, type, quantity, batch_number, unit_price, 
              total_price, reason, performed_by, source_type, source_id, 
              to_location, created_at, updated_at
            ) VALUES (
              uuid_generate_v4(), ?, 'RECEIVED', ?, ?, ?, ?, ?, 
              ?, 'RECEIPT', ?, ?, NOW(), NOW()
            )
          `, {
            replacements: [
              medicationId,
              totalUnits, // Record total units in stock movement
              med.batchNumber,
              unitPrice,
              unitPrice * totalUnits, // Total price based on total units
              med.id ? 'Inventory receipt' : 'Initial stock entry',
              req.user.id,
              inventoryReceipt.id,
              med.storageLocation || 'PHARMACY'
            ],
            transaction,
            type: sequelize.QueryTypes.INSERT
          });
  
          console.log('Created stock movement for medication ID:', medicationId);
        } else {
          console.error('No medication ID available for stock movement');
          await transaction.rollback();
          return res.status(500).json({
            success: false,
            message: 'Unable to create medication record'
          });
        }
      }
  
      // Commit transaction
      await transaction.commit();
      console.log('Transaction committed successfully');
  
      res.status(201).json({
        success: true,
        message: 'Inventory receipt created successfully',
        inventoryReceipt
      });
  
    } catch (error) {
      if (transaction && transaction.finished !== 'rollback') {
        await transaction.rollback();
      }
      console.error('Error creating inventory receipt:', error);
  
      res.status(500).json({
        success: false,
        message: 'Error creating inventory receipt',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
 
  async getInventoryReceipts(req, res, next) {
    try {
      const {
        supplierId,
        startDate,
        endDate,
        page = 1,
        limit = 10
      } = req.query;
 
      const whereClause = {};
 
      if (supplierId) {
        whereClause.supplierId = supplierId;
      }
 
      if (startDate && endDate) {
        whereClause.deliveryDate = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }
 
      const { count, rows: receipts } = await InventoryReceipt.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Supplier,
            as: 'supplier',
            attributes: ['name', 'supplierId', 'contactPerson']
          },
          {
            model: User,
            as: 'receiver',
            attributes: ['id', 'name']
          }
        ],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        order: [['deliveryDate', 'DESC']]
      });
 
      res.json({
        success: true,
        count,
        pages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        receipts
      });
 
    } catch (error) {
      next(error);
    }
  }
 
  async getInventoryReceiptById(req, res, next) {
    try {
      const { id } = req.params;
 
      const receipt = await InventoryReceipt.findOne({
        where: { id },
        include: [
          {
            model: Supplier,
            as: 'supplier'
          },
          {
            model: User,
            as: 'receiver',
            attributes: ['id', 'name']
          },
          {
            model: StockMovement,
            as: 'stockMovements',
            include: [
              {
                model: Medication,
                as: 'medication'
              }
            ]
          }
        ]
      });
 
      if (!receipt) {
        return res.status(404).json({
          success: false,
          message: 'Inventory receipt not found'
        });
      }
 
      // Get medications associated with this receipt
      const medications = await Medication.findAll({
        where: { inventoryReceiptId: id }
      });
 
      res.json({
        success: true,
        receipt,
        medications
      });
 
    } catch (error) {
      next(error);
    }
  }
 
  // Stock Transfer
  async transferStock(req, res, next) {
    const transaction = await sequelize.transaction();
 
    try {
      const {
        medicationId,
        quantity,
        fromLocation,
        toLocation,
        notes
      } = req.body;
 
      if (!medicationId || !quantity || !fromLocation || !toLocation) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }
 
      if (fromLocation === toLocation) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Source and destination location cannot be the same'
        });
      }
 
      const medication = await Medication.findByPk(medicationId);
 
      if (!medication) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Medication not found'
        });
      }
 
      if (medication.storageLocation !== fromLocation) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Medication is not in the specified source location'
        });
      }
 
      // Calculate quantity in individual units based on packSize if tracking by pack
      const transferQuantity = medication.trackByPack 
        ? parseInt(quantity) * parseInt(medication.packSize) 
        : parseInt(quantity);
 
      if (medication.currentStock < transferQuantity) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Insufficient stock for transfer'
        });
      }
 
      // Create stock movement record for the transfer
      await StockMovement.create({
        medicationId,
        type: 'TRANSFER',
        quantity: transferQuantity,
        batchNumber: medication.batchNumber,
        unitPrice: medication.unitPrice,
        totalPrice: medication.unitPrice * transferQuantity,
        performedBy: req.user.id,
        sourceType: 'TRANSFER',
        fromLocation,
        toLocation,
        reason: notes || 'Stock transfer'
      }, { transaction });
 
      // Update medication location
      await medication.update({
        storageLocation: toLocation
      }, { transaction });
 
      await transaction.commit();
 
      res.json({
        success: true,
        message: 'Stock transferred successfully'
      });
 
    } catch (error) {
      await transaction.rollback();
      next(error);
    }
  }
 
  // Stock Adjustment
  async updateStock(req, res, next) {
    const transaction = await sequelize.transaction();
  
    try {
      const { id } = req.params;
      const {
        quantity,
        type,
        reason,
        batchNumber,
        expiryDate,
        markedPrice,
        markupPercentage,
        storageLocation,
        packSize,
        trackByPack
      } = req.body;
  
      const medication = await Medication.findByPk(id, { transaction });
  
      if (!medication) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Medication not found'
        });
      }
  
      // Calculate quantity in individual units
      const currentPackSize = parseInt(medication.packSize || 1);
      const newPackSize = packSize ? parseInt(packSize) : currentPackSize;
      const isTrackingByPack = trackByPack !== undefined ? trackByPack : medication.trackByPack;
      
      // Convert quantity to individual units based on tracking mode
      let quantityInUnits = parseInt(quantity);
      if (isTrackingByPack) {
        quantityInUnits = quantityInUnits * currentPackSize;
      }
      
      // Validate stock adjustment
      let newStock = medication.currentStock;
      if (type === 'ADJUSTED') {
        // For adjustment, quantity is the new total stock value in individual units
        newStock = isTrackingByPack ? parseInt(quantity) * newPackSize : parseInt(quantity);
      } else {
        // For other types, add or subtract the quantity
        const change = (type === 'RECEIVED' || type === 'RETURNED') ?
          quantityInUnits : -quantityInUnits;
        newStock += change;
      }
  
      // Validate stock levels
      if (newStock < 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Invalid stock adjustment. Would result in negative stock.'
        });
      }
  
      // Update medication
      const updateData = {
        currentStock: newStock,
        batchNumber: batchNumber || medication.batchNumber,
        expiryDate: expiryDate || medication.expiryDate
      };
  
      // Handle price and pack size updates
      const updatingMarkedPrice = markedPrice !== undefined;
      const updatingMarkupPercentage = markupPercentage !== undefined;
      const updatingPackSize = packSize !== undefined && packSize != medication.packSize;
      
      if (updatingMarkedPrice) {
        updateData.markedPrice = parseFloat(markedPrice);
      }
  
      if (updatingMarkupPercentage) {
        updateData.markupPercentage = parseFloat(markupPercentage);
      }
      
      if (updatingPackSize) {
        updateData.packSize = parseInt(packSize);
      }
      
      if (trackByPack !== undefined) {
        updateData.trackByPack = trackByPack;
      }
      
      // Recalculate unit price and individual unit price if any of these changed
      if (updatingMarkedPrice || updatingMarkupPercentage || newStock !== medication.currentStock || updatingPackSize) {
        // Get values for calculation
        const newMarkedPrice = updatingMarkedPrice ? 
          parseFloat(markedPrice) : medication.markedPrice || 0;
          
        const newMarkupPercentage = updatingMarkupPercentage ? 
          parseFloat(markupPercentage) : medication.markupPercentage || 15;
        
        // Calculate new unit price (now dividing by current stock)
        if (newStock > 0) {
          updateData.unitPrice = (newMarkedPrice * (1 + newMarkupPercentage / 100)) / newStock;
        } else {
          updateData.unitPrice = newMarkedPrice * (1 + newMarkupPercentage / 100);
        }
        
        // Calculate new individual unit price using new pack size
        updateData.individualUnitPrice = updateData.unitPrice / newPackSize;
      }
  
      if (storageLocation) {
        updateData.storageLocation = storageLocation;
      }
  
      await medication.update(updateData, { transaction });
  
      // Record movement
      const movementQuantity = (type === 'ADJUSTED') ?
        newStock - medication.currentStock : quantityInUnits;
  
      // Use newly calculated unit price for the movement if available
      const movementUnitPrice = updateData.unitPrice || medication.unitPrice;
      
      await StockMovement.create({
        medicationId: id,
        type,
        quantity: movementQuantity,
        batchNumber: batchNumber || medication.batchNumber,
        unitPrice: movementUnitPrice,
        totalPrice: movementUnitPrice * Math.abs(movementQuantity),
        reason,
        performedBy: req.user.id,
        sourceType: 'ADJUSTMENT',
        toLocation: storageLocation || medication.storageLocation
      }, { transaction });
  
      await transaction.commit();
  
      res.json({
        success: true,
        message: 'Stock updated successfully',
        medication
      });
    } catch (error) {
      await transaction.rollback();
      next(error);
    }
  }
 
  // Enhanced Inventory Listing
  async getInventory(req, res, next) {
    try {
      const {
        search,
        category,
        type,
        supplierId,
        storageLocation,
        lowStock,
        expiringSoon,
        page = 1,
        limit = 10
      } = req.query;
  
      // Build WHERE clause parts
      let whereClause = `WHERE m."isActive" = true`;
  
      if (search) {
        whereClause += ` AND (
          m.name ILIKE '%${search}%' OR 
          m."genericName" ILIKE '%${search}%' OR 
          m."batchNumber" ILIKE '%${search}%'
        )`;
      }
  
      if (category) whereClause += ` AND m.category = '${category}'`;
      if (type) whereClause += ` AND m.type = '${type}'`;
      if (supplierId) whereClause += ` AND m.supplier_id = '${supplierId}'`;
      if (storageLocation) whereClause += ` AND m."storageLocation" = '${storageLocation}'`;
  
      if (lowStock === 'true') {
        whereClause += ` AND m."currentStock" <= m."minStockLevel"`;
      }
  
      if (expiringSoon === 'true') {
        const threeMonthsFromNow = new Date();
        threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
        whereClause += ` AND m."expiryDate" <= '${threeMonthsFromNow.toISOString()}'`;
      }
  
      // Count total matching records
      const countResult = await sequelize.query(
        `SELECT COUNT(*) as count 
         FROM "Medications" m
         ${whereClause}`,
        { type: sequelize.QueryTypes.SELECT }
      );
  
      const count = parseInt(countResult[0].count);
  
      // Get paginated medications with all fields
      // Join with suppliers to get supplier information
      const medications = await sequelize.query(
        `SELECT m.*, 
                s.id as "supplier.id", 
                s.name as "supplier.name", 
                s.supplier_id as "supplier.supplierId",
                s.contact_person as "supplier.contactPerson",
                s.phone_number as "supplier.phoneNumber",
                s.email as "supplier.email",
                s.address as "supplier.address"
         FROM "Medications" m
         LEFT JOIN suppliers s ON m.supplier_id = s.id
         ${whereClause}
         ORDER BY m.name ASC
         LIMIT ${limit} OFFSET ${(parseInt(page) - 1) * parseInt(limit)}`,
        { type: sequelize.QueryTypes.SELECT }
      );
  
      res.json({
        success: true,
        count,
        pages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        medications
      });
    } catch (error) {
      console.error('Error in getInventory:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching inventory',
        count: 0,
        pages: 0,
        currentPage: parseInt(req.query.page || 1),
        medications: []
      });
    }
  }
 
  async getMedicationById(req, res, next) {
    try {
      const { id } = req.params;
 
      const medication = await Medication.findOne({
        where: { id, isActive: true },
        include: [
          {
            model: Supplier,
            as: 'supplier'
          },
          {
            model: InventoryReceipt,
            as: 'inventoryReceipt'
          },
          {
            model: StockMovement,
            as: 'stockMovements',
            limit: 10,
            order: [['createdAt', 'DESC']]
          }
        ]
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
 
  async addMedication(req, res, next) {
    const transaction = await sequelize.transaction();
  
    try {
      // Validate required fields - strength removed from requiredFields
      const requiredFields = ['name', 'batchNumber', 'category', 'type', 'expiryDate'];
      const missingFields = requiredFields.filter(field => !req.body[field]);
  
      if (missingFields.length > 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Missing required fields: ${missingFields.join(', ')}`
        });
      }
  
      // Get required values for calculation
      const markedPrice = parseFloat(req.body.markedPrice || 0);
      const markupPercentage = parseFloat(req.body.markupPercentage || 15);
      const packQuantity = parseInt(req.body.currentStock || 0);
      const packSize = parseInt(req.body.packSize || 1);
      const trackByPack = Boolean(req.body.trackByPack);
      
      // Calculate total units in stock
      const totalUnits = packQuantity * packSize;
      
      // Calculate unit price (price per pack)
      let unitPrice = 0;
      if (packQuantity > 0) {
        unitPrice = (markedPrice * (1 + markupPercentage / 100)) / packQuantity;
      } else {
        unitPrice = markedPrice * (1 + markupPercentage / 100);
      }
      
      // Calculate individual unit price (price per tablet/capsule)
      const individualUnitPrice = unitPrice / packSize;
  
      // Process and validate the medication data
      const medicationData = {
        name: req.body.name.trim(),
        genericName: req.body.genericName?.trim(),
        batchNumber: req.body.batchNumber.trim(),
        category: req.body.category?.toUpperCase(),
        type: req.body.type?.toUpperCase(),
        strength: req.body.strength?.trim() || null, // Now optional, defaults to null
        manufacturer: req.body.manufacturer?.trim() || '',
        currentStock: totalUnits, // Store as total individual units
        minStockLevel: parseInt(req.body.minStockLevel || 10),
        maxStockLevel: parseInt(req.body.maxStockLevel || 1000),
        supplierId: req.body.supplierId,
        markedPrice,
        markupPercentage,
        unitPrice,
        individualUnitPrice,
        packSize,
        packUnit: req.body.packUnit?.trim() || 'tablet',
        dispensingUnit: req.body.dispensingUnit?.trim() || req.body.packUnit?.trim() || 'tablet',
        trackByPack,
        unitPriceType: req.body.unitPriceType || 'PER_UNIT',
        storageLocation: req.body.storageLocation || 'PHARMACY',
        expiryDate: new Date(req.body.expiryDate),
        imageUrl: req.body.imageUrl?.trim(),
        prescriptionRequired: Boolean(req.body.prescriptionRequired),
        location: req.body.location?.trim(),
        notes: req.body.notes?.trim() || '',
        isActive: true
      };
  
      // Create the medication record
      const medication = await Medication.create(medicationData, {
        transaction,
        returning: true
      });
  
      // Create initial stock movement record if there's initial stock
      if (medicationData.currentStock > 0) {
        const stockMovementData = {
          medicationId: medication.id,
          type: 'RECEIVED',
          quantity: medicationData.currentStock, // Record as total individual units
          batchNumber: medicationData.batchNumber,
          unitPrice: medicationData.unitPrice,
          totalPrice: medicationData.unitPrice * packQuantity, // Total value is unit price × pack quantity
          performedBy: req.user.id,
          sourceType: 'INITIAL',
          toLocation: medicationData.storageLocation,
          reason: 'Initial stock entry'
        };
  
        await StockMovement.create(stockMovementData, {
          transaction,
          returning: true
        });
      }
  
      // Commit the transaction
      await transaction.commit();
  
      // Send success response
      return res.status(201).json({
        success: true,
        message: 'Medication added successfully',
       medication: medication.toJSON()
     });
   } catch (error) {
     // Rollback transaction on error
     if (transaction) await transaction.rollback();
 
     console.error('Error adding medication:', {
       name: error.name,
       message: error.message,
       stack: error.stack
     });
 
     // Send error response
     return res.status(error.name === 'SequelizeValidationError' ? 400 : 500).json({
       success: false,
       message: error.message || 'Error adding medication',
       error: {
         name: error.name,
         message: error.message,
         ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
       }
     });
   }
 }

 async updateMedication(req, res, next) {
   const transaction = await sequelize.transaction();
 
   try {
     const { id } = req.params;
     const updateData = req.body;
 
     // Find the medication
     const medication = await Medication.findByPk(id, { transaction });
 
     if (!medication) {
       await transaction.rollback();
       return res.status(404).json({
         success: false,
         message: 'Medication not found'
       });
     }
 
     // If marked price, markup percentage, currentStock, or packSize is being updated, recalculate prices
     if (updateData.markedPrice !== undefined || 
         updateData.markupPercentage !== undefined || 
         updateData.currentStock !== undefined ||
         updateData.packSize !== undefined) {
       
       // Get the values to use in calculation, using updated values where provided
       const markedPrice = parseFloat(updateData.markedPrice !== undefined ?
         updateData.markedPrice : medication.markedPrice || 0);
 
       const markupPercentage = parseFloat(updateData.markupPercentage !== undefined ?
         updateData.markupPercentage : medication.markupPercentage || 15);
 
       const packSize = parseInt(updateData.packSize !== undefined ?
         updateData.packSize : medication.packSize || 1);
         
       const trackByPack = updateData.trackByPack !== undefined ?
         updateData.trackByPack : medication.trackByPack;
       
       // Determine how currentStock is being updated
       let newCurrentStock;
       if (updateData.currentStock !== undefined) {
         if (trackByPack) {
           // If tracking by pack, convert pack quantity to total units
           newCurrentStock = parseInt(updateData.currentStock) * packSize;
         } else {
           // If tracking by unit, use direct value
           newCurrentStock = parseInt(updateData.currentStock);
         }
       } else {
         newCurrentStock = medication.currentStock;
       }
 
       // Calculate new unit price based on packs (for pricing purposes)
       // We need to estimate the number of packs this represents
       const estimatedPacks = newCurrentStock / packSize;
       
       if (estimatedPacks > 0) {
         updateData.unitPrice = (markedPrice * (1 + markupPercentage / 100)) / estimatedPacks;
       } else {
         updateData.unitPrice = markedPrice * (1 + markupPercentage / 100);
       }
       
       // Calculate new individual unit price
       updateData.individualUnitPrice = updateData.unitPrice / packSize;
       
       // Update the currentStock value in updateData
       updateData.currentStock = newCurrentStock;
     }
 
     // Track if stock quantity is being updated
     const isStockUpdated = updateData.currentStock !== undefined &&
       updateData.currentStock !== medication.currentStock;
 
     // Save original stock for stock movement record
     const originalStock = medication.currentStock;
 
     // Update the medication
     await medication.update(updateData, { transaction });
 
     // If stock was updated, create a stock movement record
     if (isStockUpdated) {
       const newStock = parseInt(updateData.currentStock);
       const change = newStock - originalStock;
 
       await StockMovement.create({
         medicationId: id,
         type: 'ADJUSTED',
         quantity: change,
         batchNumber: medication.batchNumber,
         unitPrice: medication.unitPrice,
         totalPrice: medication.unitPrice * Math.abs(change),
         performedBy: req.user.id,
         sourceType: 'UPDATE',
         toLocation: medication.storageLocation,
         reason: updateData.reason || 'Medication update'
       }, { transaction });
     }
 
     await transaction.commit();
 
     res.json({
       success: true,
       message: 'Medication updated successfully',
       medication
     });
   } catch (error) {
     await transaction.rollback();
     next(error);
   }
 }

 // Stock Movement History
 async getStockMovements(req, res, next) {
   try {
     const {
       medicationId,
       type,
       startDate,
       endDate,
       page = 1,
       limit = 10
     } = req.query;

     const whereClause = {};

     if (medicationId) {
       whereClause.medicationId = medicationId;
     }

     if (type) {
       whereClause.type = type;
     }

     if (startDate && endDate) {
       whereClause.createdAt = {
         [Op.between]: [new Date(startDate), new Date(endDate)]
       };
     }

     const { count, rows: movements } = await StockMovement.findAndCountAll({
       where: whereClause,
       include: [
         {
           model: Medication,
           as: 'medication',
           attributes: ['id', 'name', 'batchNumber', 'category', 'type']
         },
         {
           model: User,
           as: 'performer',
           attributes: ['id', 'name']
         }
       ],
       limit: parseInt(limit),
       offset: (parseInt(page) - 1) * parseInt(limit),
       order: [['createdAt', 'DESC']]
     });

     res.json({
       success: true,
       count,
       pages: Math.ceil(count / limit),
       currentPage: parseInt(page),
       movements
     });
   } catch (error) {
     next(error);
   }
 }

 // Extended Stats
 async getPharmacyStats(req, res, next) {
   try {
     // Use raw queries to avoid table name and enum issues
     const [totalDispensedResult, pendingPrescriptionsResult, lowStockItemsResult, expiringItemsResult] = await Promise.all([
       sequelize.query(
         `SELECT COUNT(*) as count FROM medication_dispenses WHERE status = 'DISPENSED'`,
         { type: sequelize.QueryTypes.SELECT }
       ).catch(() => [{ count: 0 }]),

       // Use 'active' as that's the correct enum value in your Prescription model
       sequelize.query(
         `SELECT COUNT(*) as count FROM "Prescriptions" WHERE status = 'active'`,
         { type: sequelize.QueryTypes.SELECT }
       ).catch(() => [{ count: 0 }]),

       sequelize.query(
         `SELECT COUNT(*) as count FROM medications WHERE current_stock <= min_stock_level`,
         { type: sequelize.QueryTypes.SELECT }
       ).catch(() => [{ count: 0 }]),

       sequelize.query(
         `SELECT COUNT(*) as count FROM medications 
          WHERE expiry_date <= CURRENT_DATE + INTERVAL '90 days' 
          AND current_stock > 0`,
         { type: sequelize.QueryTypes.SELECT }
       ).catch(() => [{ count: 0 }])
     ]);

     const totalDispensed = parseInt(totalDispensedResult[0]?.count || 0);
     const pendingPrescriptions = parseInt(pendingPrescriptionsResult[0]?.count || 0);
     const lowStockItems = parseInt(lowStockItemsResult[0]?.count || 0);
     const expiringItems = parseInt(expiringItemsResult[0]?.count || 0);

     // Get inventory value
     const inventoryValueResult = await sequelize.query(
       `SELECT SUM(current_stock * unit_price) as total_value FROM medications`,
       { type: sequelize.QueryTypes.SELECT }
     ).catch(() => [{ total_value: 0 }]);

     const totalValue = parseFloat(inventoryValueResult[0]?.total_value || 0);

     // Get storage location distribution
     const storageDistribution = await sequelize.query(
       `SELECT storage_location, 
               COUNT(*) as count,
               SUM(current_stock * unit_price) as value
        FROM medications
        WHERE is_active = true AND current_stock > 0
        GROUP BY storage_location`,
       { type: sequelize.QueryTypes.SELECT }
     ).catch(() => []);

     res.json({
       success: true,
       stats: {
         totalDispensed,
         pendingPrescriptions,
         lowStockItems,
         expiringItems,
         totalValue,
         storageDistribution
       }
     });
   } catch (error) {
     console.error('Error in getPharmacyStats:', error);
     res.json({
       success: true,
       stats: {
         totalDispensed: 0,
         pendingPrescriptions: 0,
         lowStockItems: 0,
         expiringItems: 0,
         totalValue: 0,
         storageDistribution: []
       }
     });
   }
 }
 async getLowStockItems(req, res, next) {
   try {
     // Use raw query to bypass model issues
     const medications = await sequelize.query(
       `SELECT m.*, 
               s.id as "supplier.id", 
               s.name as "supplier.name", 
               s.contact_person as "supplier.contactPerson", 
               s.phone_number as "supplier.phoneNumber"
        FROM medications m
        LEFT JOIN suppliers s ON m.supplier_id = s.id
        WHERE m.is_active = true AND m.current_stock <= m.min_stock_level`,
       { type: sequelize.QueryTypes.SELECT }
     );

     res.json({
       success: true,
       medications
     });
   } catch (error) {
     console.error('Error in getLowStockItems:', error);
     res.json({
       success: true,
       medications: []
     });
   }
 }

 async getExpiringItems(req, res, next) {
   try {
     const threeMonthsFromNow = new Date();
     threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

     const medications = await Medication.findAll({
       where: {
         isActive: true,
         expiryDate: {
           [Op.lte]: threeMonthsFromNow
         },
         currentStock: {
           [Op.gt]: 0
         }
       },
       include: [
         {
           model: Supplier,
           as: 'supplier',
           attributes: ['id', 'name', 'contactPerson', 'phoneNumber']
         }
       ],
       order: [['expiryDate', 'ASC']]
     });

     res.json({
       success: true,
       medications
     });
   } catch (error) {
     next(error);
   }
 }

 async dispensePrescription(req, res, next) {
   let transaction;

   try {
     transaction = await sequelize.transaction();
     console.log('Transaction started');

     const { prescriptionId, medicationDispenses, notes, paymentMethod } = req.body;
     console.log('Dispensing prescription:', { prescriptionId, medicationDispenses });

     // 1. Verify the prescription exists and is active using raw SQL
     const prescriptionQuery = await sequelize.query(
       `SELECT * FROM "Prescriptions" WHERE id = $1`,
       {
         bind: [prescriptionId],
         type: sequelize.QueryTypes.SELECT,
         transaction
       }
     );

     if (!prescriptionQuery.length) {
       await transaction.rollback();
       return res.status(404).json({
         success: false,
         message: 'Prescription not found'
       });
     }

     const prescription = prescriptionQuery[0];
     console.log('Found prescription:', prescription.id);

     if (prescription.status !== 'active') {
       await transaction.rollback();
       return res.status(400).json({
         success: false,
         message: 'Prescription is no longer active'
       });
     }

     const successfulDispenses = [];

     // 2. Process each medication dispense
     for (const dispense of medicationDispenses) {
       try {
         console.log('Processing medication:', dispense.medicationId);

         // 2a. Verify medication exists and has enough stock
         const medicationQuery = await sequelize.query(
           `SELECT * FROM "Medications" WHERE id = $1`,
           {
             bind: [dispense.medicationId],
             type: sequelize.QueryTypes.SELECT,
             transaction
           }
         );

         if (!medicationQuery.length) {
           throw new Error(`Medication ${dispense.medicationId} not found`);
         }

         const medication = medicationQuery[0];
         console.log('Found medication:', medication.name, 'Current stock:', medication.currentStock);

         // Calculate the quantity in individual units based on pack size
         const quantityInUnits = parseInt(dispense.quantity);
         
         if (parseInt(medication.currentStock) < quantityInUnits) {
           throw new Error(`Insufficient stock for ${medication.name}`);
         }

         // 2b. Insert into medication_dispenses table
         const dispenseResult = await sequelize.query(
           `INSERT INTO medication_dispenses (
           id, "prescriptionId", "medicationId", "patientId", "dispensedBy",
           quantity, dosage, frequency, duration, "unitPrice",
           "totalPrice", status, "dispensedAt", "createdAt", "updatedAt"
         ) VALUES (
           uuid_generate_v4(), $1, $2, $3, $4, 
           $5, $6, $7, $8, $9, 
           $10, 'DISPENSED', NOW(), NOW(), NOW()
         ) RETURNING *`,
           {
             bind: [
               prescriptionId,
               dispense.medicationId,
               prescription.patientId,
               req.user.id,
               quantityInUnits,
               dispense.dosage || 'As directed',
               dispense.frequency || 'As needed',
               dispense.duration || '7 days',
               parseFloat(medication.individualUnitPrice), // Use individual unit price
               parseFloat(medication.individualUnitPrice) * quantityInUnits
             ],
             type: sequelize.QueryTypes.INSERT,
             transaction
           }
         );

         console.log('Dispense record created');

         // 2c. Update medication stock
         const newStock = parseInt(medication.currentStock) - quantityInUnits;
         await sequelize.query(
           `UPDATE "Medications" 
          SET "currentStock" = $1, "updatedAt" = NOW() 
          WHERE id = $2`,
           {
             bind: [newStock, medication.id],
             type: sequelize.QueryTypes.UPDATE,
             transaction
           }
         );

         console.log('Medication stock updated to:', newStock);

         // 2d. Record stock movement
         await sequelize.query(
           `INSERT INTO stock_movements (
           id, medication_id, type, quantity, batch_number,
           unit_price, total_price, performed_by, source_type,
           source_id, from_location, created_at, updated_at
         ) VALUES (
           uuid_generate_v4(), $1, 'DISPENSED', $2, $3,
           $4, $5, $6, 'PRESCRIPTION',
           $7, $8, NOW(), NOW()
         )`,
           {
             bind: [
               medication.id,
               -quantityInUnits, // Negative because it's dispensed
               medication.batchNumber,
               parseFloat(medication.individualUnitPrice),
               parseFloat(medication.individualUnitPrice) * quantityInUnits,
               req.user.id,
               prescriptionId,
               medication.storageLocation || 'PHARMACY'
             ],
             type: sequelize.QueryTypes.INSERT,
             transaction
           }
         );

         console.log('Stock movement recorded');

         // Add to successful dispenses
         successfulDispenses.push({
           medicationId: medication.id,
           medicationName: medication.name,
           quantity: dispense.quantity,
           unitPrice: medication.individualUnitPrice,
           totalPrice: parseFloat(medication.individualUnitPrice) * quantityInUnits
         });

       } catch (dispenseError) {
         console.error('Error processing medication:', dispenseError);
         await transaction.rollback();
         return res.status(400).json({
           success: false,
           message: dispenseError.message
         });
       }
     }

     // 3. Update prescription status to completed
     await sequelize.query(
       `UPDATE "Prescriptions" 
      SET status = 'completed', "updatedAt" = NOW() 
      WHERE id = $1`,
       {
         bind: [prescriptionId],
         type: sequelize.QueryTypes.UPDATE,
         transaction
       }
     );

     console.log('Prescription status updated to completed');

     // 4. Commit transaction
     await transaction.commit();
     console.log('Transaction committed successfully');

     // 5. Return success response
     return res.status(200).json({
       success: true,
       message: 'Medications dispensed successfully',
       dispenses: successfulDispenses
     });

   } catch (error) {
     console.error('Error in dispensePrescription:', error);

     // Handle transaction rollback if it exists and hasn't been rolled back
     if (transaction) {
       try {
         await transaction.rollback();
         console.log('Transaction rolled back due to error');
       } catch (rollbackError) {
         console.error('Error rolling back transaction:', rollbackError);
       }
     }

     // Return error response
     return res.status(500).json({
       success: false,
       message: 'Database error occurred',
       error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
     });
   }
 }

 async manualDispensePrescription(req, res) {
   let transaction;
 
   try {
     const { prescriptionId, medicationDispenses, patientId } = req.body;
     console.log('Starting dispense for prescription:', prescriptionId);
 
     // Start transaction
     transaction = await sequelize.transaction();
 
     let prescriptionPatientId = patientId;
     let prescriptionStatus = null;
 
     // Check if prescription exists only if prescriptionId is provided
     if (prescriptionId) {
       const prescriptionResult = await sequelize.query(
         'SELECT * FROM "Prescriptions" WHERE id = $1',
         {
           bind: [prescriptionId],
           type: sequelize.QueryTypes.SELECT,
           transaction
         }
       );
 
       if (!prescriptionResult.length) {
         await transaction.rollback();
         return res.status(404).json({
           success: false,
           message: 'Prescription not found'
         });
       }
 
       const prescription = prescriptionResult[0];
       prescriptionPatientId = prescription.patientId;
       prescriptionStatus = prescription.status;
 
       if (prescription.status !== 'active') {
         await transaction.rollback();
         return res.status(400).json({
           success: false,
           message: 'Prescription is no longer active'
         });
       }
     }
 
     const results = [];
 
     // Process each medication
     for (const dispense of medicationDispenses) {
       // Check medication in Medications table
       const medicationResult = await sequelize.query(
         'SELECT * FROM "Medications" WHERE id = $1',
         {
           bind: [dispense.medicationId],
           type: sequelize.QueryTypes.SELECT,
           transaction
         }
       );
 
       if (!medicationResult.length) {
         await transaction.rollback();
         return res.status(404).json({
           success: false,
           message: `Medication ${dispense.medicationId} not found`
         });
       }
 
       const medication = medicationResult[0];
       
       // Calculate quantity in individual units
       const packSize = parseInt(medication.packSize || 1);
       const trackByPack = medication.trackByPack || false;
       
       // Calculate quantity in individual units
       const quantityInUnits = trackByPack ? 
         parseInt(dispense.quantity) * packSize : 
         parseInt(dispense.quantity);
 
       if (parseInt(medication.currentStock) < quantityInUnits) {
         await transaction.rollback();
         return res.status(400).json({
           success: false,
           message: `Insufficient stock for ${medication.name}`
         });
       }
 
       // Extract numeric duration
       const durationDays = parseInt(dispense.duration?.match(/\d+/)?.[0] || '7');
 
       // Create notes for instructions
       const notes = `Duration: ${dispense.duration || '7 days'}. ${dispense.instructions || ''}`;
 
       // Insert dispense record
       await sequelize.query(
         `INSERT INTO medication_dispenses (
         id, prescription_id, medication_id, patient_id, dispensed_by,
         quantity, dosage, frequency, duration, unit_price,
         total_price, status, dispensed_at, created_at, updated_at, notes
       ) VALUES (
         uuid_generate_v4(), $1, $2, $3, $4,
         $5, $6, $7, $8, $9,
         $10, 'DISPENSED', NOW(), NOW(), NOW(), $11
       )`,
         {
           bind: [
             prescriptionId,
             dispense.medicationId,
             prescriptionPatientId || patientId, // Use prescriptionPatientId or fallback to patientId
             req.user.id,
             quantityInUnits,
             dispense.dosage || 'As directed',
             dispense.frequency || 'As needed',
             durationDays,
             parseFloat(medication.individualUnitPrice), // Use individual unit price
             parseFloat(medication.individualUnitPrice) * quantityInUnits,
             notes
           ],
           type: sequelize.QueryTypes.INSERT,
           transaction
         }
       );
 
       // Update stock in Medications table
       const newStock = parseInt(medication.currentStock) - quantityInUnits;
       await sequelize.query(
         'UPDATE "Medications" SET "currentStock" = $1, "updatedAt" = NOW() WHERE id = $2',
         {
           bind: [newStock, medication.id],
           type: sequelize.QueryTypes.UPDATE,
           transaction
         }
       );
 
       // Record stock movement
       await sequelize.query(
         `INSERT INTO stock_movements (
         id, medication_id, type, quantity, batch_number,
         unit_price, total_price, performed_by, source_type,
         source_id, from_location, created_at, updated_at
       ) VALUES (
         uuid_generate_v4(), $1, $2, $3, $4,
         $5, $6, $7, $8,
         $9, $10, NOW(), NOW()
       )`,
         {
           bind: [
             medication.id,
             'DISPENSED',
             -quantityInUnits, // Negative because we're dispensing
             medication.batchNumber || '',
             parseFloat(medication.individualUnitPrice),
             parseFloat(medication.individualUnitPrice) * quantityInUnits,
             req.user.id,
             prescriptionId ? 'PRESCRIPTION' : 'WALKIN',
             prescriptionId,
             medication.storageLocation || 'PHARMACY'
           ],
           type: sequelize.QueryTypes.INSERT,
           transaction
         }
       );
 
       results.push({
         medication: medication.name,
         quantity: dispense.quantity,
         quantityInUnits,
         unitPrice: medication.individualUnitPrice,
         totalPrice: parseFloat(medication.individualUnitPrice) * quantityInUnits
       });
     }
 
     // Update prescription status only if prescriptionId exists
     if (prescriptionId) {
       await sequelize.query(
         'UPDATE "Prescriptions" SET status = $1, "updatedAt" = NOW() WHERE id = $2',
         {
           bind: ['completed', prescriptionId],
           type: sequelize.QueryTypes.UPDATE,
           transaction
         }
       );
     }
 
     // Commit transaction
     await transaction.commit();
 
     return res.status(200).json({
       success: true,
       message: 'Medications dispensed successfully',
       results
     });
 
   } catch (error) {
     console.error('Error in dispense:', error);
 
     if (transaction) {
       try {
         await transaction.rollback();
       } catch (rollbackError) {
         console.error('Error rolling back transaction:', rollbackError);
       }
     }
 
     return res.status(500).json({
       success: false,
       message: 'Database error occurred',
       error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
     });
   }
 }

 // Prescription Management
 async createPrescription(req, res, next) {
   const transaction = await sequelize.transaction();
   try {
     const {
       patientId,
       medications,
       diagnosis,
       notes,
       validUntil
     } = req.body;

     // Validate patient exists
     const patient = await Patient.findByPk(patientId);
     if (!patient) {
       throw new Error('Patient not found');
     }

     // Create prescription
     const prescription = await Prescription.create({
       patientId,
       doctorId: req.user.id,
       diagnosis,
       notes,
       validUntil: validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
       status: 'active'
     }, { transaction });

     // Add medications to prescription
     for (const med of medications) {
       const medication = await Medication.findByPk(med.medicationId);
       if (!medication) {
         throw new Error(`Medication ${med.medicationId} not found`);
       }

       // Convert quantity to individual units if trackByPack is true
       const quantityInUnits = medication.trackByPack ? 
         parseInt(med.quantity) * parseInt(medication.packSize) : 
         parseInt(med.quantity);

       await prescription.addMedication(medication, {
         through: {
           quantity: quantityInUnits, // Store as individual units
           specialInstructions: med.instructions
         },
         transaction
       });
     }

     await transaction.commit();

     res.status(201).json({
       success: true,
       message: 'Prescription created successfully',
       prescription
     });
   } catch (error) {
     await transaction.rollback();
     next(error);
   }
 }

 async getDispensedPrescriptionDetails(req, res) {
   try {
     const { id } = req.params;

     // Fetch the prescription details with all camelCase column names properly quoted
     const prescription = await sequelize.query(
       `SELECT p.*, 
             u."surname" AS "doctorSurname", 
             u."otherNames" AS "doctorOtherNames"
      FROM "Prescriptions" AS p
      LEFT JOIN "Users" AS u ON p."doctorId" = u."id"
      WHERE p."id" = $1`,
       {
         bind: [id],
         type: sequelize.QueryTypes.SELECT
       }
     );

     if (!prescription.length) {
       return res.status(404).json({
         success: false,
         message: 'Prescription not found'
       });
     }

     // Fetch the dispensed medications with proper quoting
     const dispensedMedications = await sequelize.query(
       `SELECT md.*, 
             m."name" AS "medicationName",
             m."genericName",
             m."strength",
             m."type",
             m."category",
             m."packSize",
             m."trackByPack"
      FROM medication_dispenses AS md
      LEFT JOIN "Medications" AS m ON md.medication_id = m."id"
      WHERE md.prescription_id = $1`,
       {
         bind: [id],
         type: sequelize.QueryTypes.SELECT
       }
     );

     // Calculate display quantity (convert from individual units to packs if needed)
     const formattedMedications = dispensedMedications.map(med => {
       let displayQuantity = med.quantity;
       let displayUnit = med.dispensingUnit || 'unit';
       
       if (med.trackByPack && med.packSize > 1) {
         // If medication tracks by pack, convert individual units back to pack quantity for display
         displayQuantity = Math.ceil(med.quantity / med.packSize);
         displayUnit = 'pack(s)';
       }
       
       return {
         ...med,
         displayQuantity,
         displayUnit
       };
     });

     return res.status(200).json({
       success: true,
       prescription: prescription[0],
       dispensedMedications: formattedMedications
     });

   } catch (error) {
     console.error('Error fetching dispensed prescription details:', error);
     return res.status(500).json({
       success: false,
       message: 'Database error occurred',
       error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
     });
   }
 }


 async getPendingPrescriptions(req, res) {
   try {
     // Fetch pending prescriptions (status = 'active')
     const pendingPrescriptions = await sequelize.query(
       `SELECT p.*, 
               pt."surname" AS "patientSurname",
               pt."otherNames" AS "patientOtherNames",
               u_doctor."surname" AS "doctorSurname",
               u_doctor."otherNames" AS "doctorOtherNames"
        FROM "Prescriptions" AS p
        LEFT JOIN "Patients" AS pt ON p."patientId" = pt."id"
        LEFT JOIN "Users" AS u_doctor ON p."doctorId" = u_doctor."id"
        WHERE p."status" = 'active'
        ORDER BY p."createdAt" DESC`,
       {
         type: sequelize.QueryTypes.SELECT
       }
     );
     
     // For each prescription, fetch the associated medications
     const result = await Promise.all(pendingPrescriptions.map(async (prescription) => {
       // Fetch medications for this prescription
       const medications = await sequelize.query(
         `SELECT m."id", 
                 m."name", 
                 m."strength", 
                 m."type",
                 m."packSize",
                 m."trackByPack",
                 pm."quantity", 
                 pm."specialInstructions"
          FROM "PrescriptionMedications" AS pm
          LEFT JOIN "Medications" AS m ON pm."MedicationId" = m."id"
          WHERE pm."prescriptionId" = $1`,
         {
           bind: [prescription.id],
           type: sequelize.QueryTypes.SELECT
         }
       );
       
       // Format medications to display quantities properly (in packs or units)
       const formattedMedications = medications.map(med => {
         let displayQuantity = med.quantity;
         let displayUnit = 'unit(s)';
         
         // If medication tracks by pack, convert individual units to packs for display
         if (med.trackByPack && med.packSize > 1) {
          displayQuantity = Math.ceil(med.quantity / med.packSize);
          displayUnit = 'pack(s)';
        }
        
        return {
          ...med,
          displayQuantity,
          displayUnit,
          quantityInUnits: med.quantity // Keep the original units count for reference
        };
      });
    
    return {
      ...prescription,
      medications: formattedMedications
    };
  }));
  
  return res.status(200).json({
    success: true,
    count: result.length,
    prescriptions: result
  });
  
} catch (error) {
  console.error('Error fetching pending prescriptions:', error);
  return res.status(500).json({
    success: false,
    message: 'Database error occurred',
    error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
  });
}
}

async dispensePrescription(req, res, next) {
const transaction = await sequelize.transaction();
try {
  const { prescriptionId, medicationDispenses } = req.body;

  const prescription = await Prescription.findByPk(prescriptionId, {
    include: [
      {
        model: User,
        as: 'PATIENT'
      }
    ]
  });

  if (!prescription) {
    throw new Error('Prescription not found');
  }

  if (prescription.status !== 'active') {
    throw new Error('Prescription is no longer active');
  }

  const dispenseRecords = [];

  for (const dispense of medicationDispenses) {
    const medication = await Medication.findByPk(dispense.medicationId, { transaction });

    if (!medication) {
      throw new Error(`Medication ${dispense.medicationId} not found`);
    }

    // Calculate quantity in individual units
    const quantityInUnits = medication.trackByPack ? 
      parseInt(dispense.quantity) * parseInt(medication.packSize) : 
      parseInt(dispense.quantity);

    if (medication.currentStock < quantityInUnits) {
      throw new Error(`Insufficient stock for ${medication.name}`);
    }

    // Create dispense record
    const dispenseRecord = await MedicationDispense.create({
      prescriptionId,
      medicationId: medication.id,
      patientId: prescription.patientId,
      dispensedBy: req.user.id,
      quantity: quantityInUnits, // Store as individual units
      dosage: dispense.dosage,
      frequency: dispense.frequency,
      duration: dispense.duration,
      unitPrice: medication.individualUnitPrice, // Use individual unit price
      totalPrice: medication.individualUnitPrice * quantityInUnits,
      status: 'DISPENSED',
      dispensedAt: new Date()
    }, { transaction });

    // Update inventory
    await medication.update({
      currentStock: medication.currentStock - quantityInUnits
    }, { transaction });

    // Create stock movement record
    await StockMovement.create({
      medicationId: medication.id,
      type: 'DISPENSED',
      quantity: -quantityInUnits, // Negative to indicate reduction
      batchNumber: medication.batchNumber,
      unitPrice: medication.individualUnitPrice,
      totalPrice: medication.individualUnitPrice * quantityInUnits,
      performedBy: req.user.id,
      sourceType: 'PRESCRIPTION',
      sourceId: prescriptionId,
      fromLocation: medication.storageLocation
    }, { transaction });

    dispenseRecords.push(dispenseRecord);
  }

  // Update prescription status if all medications dispensed
  await prescription.update({
    status: 'completed'
  }, { transaction });

  await transaction.commit();

  res.json({
    success: true,
    message: 'Medications dispensed successfully',
    dispenses: dispenseRecords
  });
} catch (error) {
  await transaction.rollback();
  next(error);
}
}

// Dispense History
async getDispenseHistory(req, res, next) {
try {
  const { startDate, endDate, status, page = 1, limit = 10 } = req.query;

  const whereClause = {};

  if (startDate && endDate) {
    whereClause.dispensedAt = {
      [Op.between]: [new Date(startDate), new Date(endDate)]
    };
  }

  if (status) whereClause.status = status;

  const { count, rows: dispenses } = await MedicationDispense.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: Medication,
        attributes: ['name', 'type', 'strength', 'packSize', 'trackByPack']
      },
      {
        model: User,
        as: 'PATIENT',
        attributes: ['id', 'name', 'email']
      },
      {
        model: User,
        as: 'dispenser',
        attributes: ['id', 'name']
      }
    ],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    order: [['dispensedAt', 'DESC']]
  });

  // Format dispenses to show pack-based quantities where appropriate
  const formattedDispenses = dispenses.map(dispense => {
    const dispenseData = dispense.toJSON();
    
    let displayQuantity = dispenseData.quantity;
    let displayUnit = dispenseData.Medication.dispensingUnit || 'unit';
    
    if (dispenseData.Medication.trackByPack && dispenseData.Medication.packSize > 1) {
      displayQuantity = Math.ceil(dispenseData.quantity / dispenseData.Medication.packSize);
      displayUnit = 'pack(s)';
    }
    
    return {
      ...dispenseData,
      displayQuantity,
      displayUnit
    };
  });

  res.json({
    success: true,
    count,
    pages: Math.ceil(count / limit),
    currentPage: parseInt(page),
    dispenses: formattedDispenses
  });
} catch (error) {
  next(error);
}
}

async getDispenseById(req, res, next) {
try {
  const { id } = req.params;

  const dispense = await MedicationDispense.findOne({
    where: { id },
    include: [
      {
        model: Medication,
        attributes: ['name', 'type', 'strength', 'packSize', 'trackByPack']
      },
      {
        model: User,
        as: 'PATIENT',
        attributes: ['id', 'name', 'email']
      },
      {
        model: User,
        as: 'dispenser',
        attributes: ['id', 'name']
      },
      {
        model: Prescription,
        include: [{
          model: User,
          as: 'DOCTOR',
          attributes: ['id', 'name']
        }]
      }
    ]
  });

  if (!dispense) {
    return res.status(404).json({
      success: false,
      message: 'Dispense record not found'
    });
  }

  // Format display quantity
  const dispenseData = dispense.toJSON();
  let displayQuantity = dispenseData.quantity;
  let displayUnit = 'unit(s)';
  
  if (dispenseData.Medication.trackByPack && dispenseData.Medication.packSize > 1) {
    displayQuantity = Math.ceil(dispenseData.quantity / dispenseData.Medication.packSize);
    displayUnit = 'pack(s)';
  }

  res.json({
    success: true,
    dispense: {
      ...dispenseData,
      displayQuantity,
      displayUnit
    }
  });
} catch (error) {
  next(error);
}
}

// Validation
async validateDispense(req, res, next) {
try {
  const {
    medicationId,
    quantity,
    prescriptionId
  } = req.body;

  const medication = await Medication.findByPk(medicationId);

  if (!medication) {
    return res.status(404).json({
      success: false,
      message: 'Medication not found'
    });
  }

  // Calculate quantity in individual units
  const quantityInUnits = medication.trackByPack ? 
    parseInt(quantity) * parseInt(medication.packSize) : 
    parseInt(quantity);

  const validationResults = {
    hasStock: medication.currentStock >= quantityInUnits,
    needsPrescription: medication.prescriptionRequired,
    hasPrescription: Boolean(prescriptionId),
    isExpired: medication.expiryDate < new Date(),
    price: medication.individualUnitPrice * quantityInUnits // Use individual unit price
  };

  res.json({
    success: true,
    validation: validationResults
  });
} catch (error) {
  next(error);
}
}

// Alerts and Notifications
async sendLowStockAlert(medication) {
try {
  // Find pharmacy staff
  const pharmacists = await User.findAll({
    where: {
      role: 'pharmacist',
      isActive: true
    }
  });

  // Send email alerts
  const emailPromises = pharmacists.map(pharmacist =>
    sendEmail({
      to: pharmacist.email,
      subject: 'Low Stock Alert',
      html: generateLowStockEmail({
        pharmacistName: pharmacist.name,
        medicationName: medication.name,
        currentStock: medication.currentStock,
        minStockLevel: medication.minStockLevel
      })
    })
  );

  await Promise.all(emailPromises);
} catch (error) {
  console.error('Error sending low stock alert:', error);
}
}

// Reports and Analytics
async getInventoryReport(req, res, next) {
try {
  const { startDate, endDate } = req.query;

  const movements = await StockMovement.findAll({
    where: {
      createdAt: {
        [Op.between]: [startDate, endDate]
      }
    },
    include: [
      {
        model: Medication,
        attributes: ['name', 'category', 'currentStock', 'packSize', 'trackByPack']
      }
    ]
  });

  const report = {
    totalDispensed: 0,
    totalReceived: 0,
    lowStockItems: [],
    expiringItems: [],
    movementSummary: {}
  };

  // Calculate statistics
  movements.forEach(movement => {
    if (movement.type === 'DISPENSED') {
      report.totalDispensed += Math.abs(movement.quantity);
    } else if (movement.type === 'RECEIVED') {
      report.totalReceived += movement.quantity;
    }
  });

  res.json({
    success: true,
    report
  });
} catch (error) {
  next(error);
}
}

async getDispensingReport(req, res, next) {
try {
  const { startDate, endDate } = req.query;

  const dispenses = await MedicationDispense.findAll({
    where: {
      dispensedAt: {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      }
    },
    include: [
      {
        model: Medication,
        attributes: ['name', 'category', 'type', 'packSize', 'trackByPack']
      }
    ]
  });

  // Generate report statistics
  const report = {
    totalDispenses: dispenses.length,
    totalValue: dispenses.reduce((sum, d) => sum + parseFloat(d.totalPrice), 0),
    byCategory: {},
    byMedication: {},
    byDay: {}
  };

  // Process dispenses for detailed statistics
  dispenses.forEach(dispense => {
    // By category
    const category = dispense.Medication.category;
    if (!report.byCategory[category]) {
      report.byCategory[category] = {
        count: 0,
        value: 0
      };
    }
    report.byCategory[category].count++;
    report.byCategory[category].value += parseFloat(dispense.totalPrice);

    // By medication
    const medName = dispense.Medication.name;
    if (!report.byMedication[medName]) {
      report.byMedication[medName] = {
        count: 0,
        value: 0
      };
    }
    report.byMedication[medName].count++;
    report.byMedication[medName].value += parseFloat(dispense.totalPrice);

    // By day
    const day = dispense.dispensedAt.toISOString().split('T')[0];
    if (!report.byDay[day]) {
      report.byDay[day] = {
        count: 0,
        value: 0
      };
    }
    report.byDay[day].count++;
    report.byDay[day].value += parseFloat(dispense.totalPrice);
  });

  res.json({
    success: true,
    report
  });
} catch (error) {
  next(error);
}
}

async getDispensingSummary(req, res, next) {
try {
  const { startDate, endDate } = req.query;

  const dispenses = await MedicationDispense.findAll({
    where: {
      dispensedAt: {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      },
      status: 'DISPENSED'
    },
    include: [
      {
        model: Medication,
        attributes: ['name', 'category', 'packSize', 'trackByPack']
      },
      {
        model: User,
        as: 'PATIENT',
        attributes: ['id', 'surname', 'otherNames']
      }
    ]
  });

  // Generate summary statistics
  const summary = {
    totalDispenses: dispenses.length,
    totalRevenue: dispenses.reduce((sum, d) => sum + Number(d.totalPrice), 0),
    byCategory: {},
    byMedication: {},
    byDay: {}
  };

  // Process detailed statistics
  dispenses.forEach(dispense => {
    // By category
    const category = dispense.Medication.category;
    if (!summary.byCategory[category]) {
      summary.byCategory[category] = {
        count: 0,
        revenue: 0
      };
    }
    summary.byCategory[category].count++;
    summary.byCategory[category].revenue += Number(dispense.totalPrice);

    // By medication
    const medName = dispense.Medication.name;
    if (!summary.byMedication[medName]) {
      summary.byMedication[medName] = {
        count: 0,
        revenue: 0
      };
    }
    summary.byMedication[medName].count++;
    summary.byMedication[medName].revenue += Number(dispense.totalPrice);

    // By day
    const day = dispense.dispensedAt.toISOString().split('T')[0];
    if (!summary.byDay[day]) {
      summary.byDay[day] = {
        count: 0,
        revenue: 0
      };
    }
    summary.byDay[day].count++;
    summary.byDay[day].revenue += Number(dispense.totalPrice);
  });

  // Format dispenses to display quantity in appropriate units
  const formattedDispenses = dispenses.map(dispense => {
    const dispenseData = dispense.toJSON();
    
    let displayQuantity = dispenseData.quantity;
    let displayUnit = 'unit(s)';
    
    if (dispenseData.Medication.trackByPack && dispenseData.Medication.packSize > 1) {
      displayQuantity = Math.ceil(dispenseData.quantity / dispenseData.Medication.packSize);
      displayUnit = 'pack(s)';
    }
    
    return {
      ...dispenseData,
      displayQuantity,
      displayUnit
    };
  });

  res.json({
    success: true,
    summary,
    dispenses: formattedDispenses
  });
} catch (error) {
  next(error);
}
}

async getDailyDispensingSummary(req, res, next) {
try {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dispenses = await MedicationDispense.findAll({
    where: {
      dispensedAt: {
        [Op.gte]: today
      }
    },
    include: [
      {
        model: Medication,
        attributes: ['name', 'category', 'packSize', 'trackByPack']
      }
    ]
  });

  const summary = {
    totalDispenses: dispenses.length,
    totalValue: dispenses.reduce((sum, d) => sum + Number(d.totalPrice), 0),
    byCategory: {},
    byHour: {}
  };

  dispenses.forEach(dispense => {
    // Summarize by category
    const category = dispense.Medication.category;
    if (!summary.byCategory[category]) {
      summary.byCategory[category] = { count: 0, value: 0 };
    }
    summary.byCategory[category].count++;
    summary.byCategory[category].value += Number(dispense.totalPrice);

    // Summarize by hour
    const hour = new Date(dispense.dispensedAt).getHours();
    if (!summary.byHour[hour]) {
      summary.byHour[hour] = { count: 0, value: 0 };
    }
    summary.byHour[hour].count++;
    summary.byHour[hour].value += Number(dispense.totalPrice);
  });

  res.json({
    success: true,
    summary
  });
} catch (error) {
  next(error);
}
}

async getPendingDispenses(req, res, next) {
try {
  // Use raw query with the correct table name (medication_dispenses instead of MedicationDispenses)
  const dispenses = await sequelize.query(
    `SELECT md.*, 
          m.id as "Medication.id", 
          m.name as "Medication.name",
          m.strength as "Medication.strength",
          m.current_stock as "Medication.currentStock",
          m.pack_size as "Medication.packSize",
          m.track_by_pack as "Medication.trackByPack",
          u.id as "PATIENT.id",
          u.name as "PATIENT.name",
          u.email as "PATIENT.email",
          p.id as "Prescription.id",
          d.id as "Prescription.DOCTOR.id",
          d.name as "Prescription.DOCTOR.name"
   FROM medication_dispenses md
   LEFT JOIN medications m ON md.medication_id = m.id
   LEFT JOIN "Users" u ON md.patient_id = u.id
   LEFT JOIN "Prescriptions" p ON md.prescription_id = p.id
   LEFT JOIN "Users" d ON p.doctor_id = d.id
   WHERE md.status = 'PENDING'
   ORDER BY md.created_at DESC`,
    { type: sequelize.QueryTypes.SELECT }
  ).catch(error => {
    console.error('Error in getting pending dispenses:', error);
    return [];
  });

  // Format dispenses to display quantity in packs where appropriate
  const formattedDispenses = dispenses.map(dispense => {
    let displayQuantity = dispense.quantity;
    let displayUnit = 'unit(s)';
    
    if (dispense["Medication.trackByPack"] && dispense["Medication.packSize"] > 1) {
      displayQuantity = Math.ceil(dispense.quantity / dispense["Medication.packSize"]);
      displayUnit = 'pack(s)';
    }
    
    return {
      ...dispense,
      displayQuantity,
      displayUnit
    };
  });

  res.json({
    success: true,
    dispenses: formattedDispenses
  });
} catch (error) {
  console.error('Error in getPendingDispenses:', error);
  res.json({
    success: true,
    dispenses: []
  });
}
}


async getInventoryMetrics(req, res, next) {
try {
  const [
    totalItems,
    lowStock,
    expiringItems
  ] = await Promise.all([
    Medication.count({
      where: { isActive: true }
    }),
    Medication.count({
      where: {
        currentStock: {
          [Op.lte]: sequelize.col('minStockLevel')
        },
        isActive: true
      }
    }),
    Medication.count({
      where: {
        expiryDate: {
          [Op.lte]: new Date(Date.now() + (90 * 24 * 60 * 60 * 1000)) // 90 days
        },
        currentStock: {
          [Op.gt]: 0
        },
        isActive: true
      }
    })
  ]);

  const totalValue = await Medication.sum(
    sequelize.literal('current_stock * unit_price'),
    {
      where: { isActive: true }
    }
  );

  const categoryDistribution = await Medication.findAll({
    attributes: [
      'category',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    where: { isActive: true },
    group: ['category']
  });

  res.json({
    success: true,
    metrics: {
      totalItems,
      lowStock,
      expiringItems,
      totalValue: totalValue || 0,
      categoryDistribution
    }
  });
} catch (error) {
  next(error);
}
}
}

module.exports = new PharmacyController();