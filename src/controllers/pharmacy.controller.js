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
        // Calculate unit price based on markup
        const markupPercentage = parseFloat(med.markupPercentage || 15);
        const markedPrice = parseFloat(med.markedPrice);
        const unitPrice = markedPrice * (1 + markupPercentage / 100);
        
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
                "expiryDate" = ?,
                "updatedAt" = NOW()
            WHERE id = ?
            RETURNING id
          `, {
            replacements: [
              med.batchNumber,
              med.category,
              med.type,
              med.strength,
              parseInt(med.quantity),
              unitPrice,
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
              supplier_id, "unitPrice", "expiryDate", "imageUrl", "prescriptionRequired", 
              "isActive", location, notes, "createdAt", "updatedAt"
            ) VALUES (
              uuid_generate_v4(), ?, ?, ?, ?::medication_category, ?::medication_type, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true, ?, ?, NOW(), NOW()
            ) RETURNING id
          `, {
            replacements: [
              med.name,
              med.genericName || null,
              med.batchNumber,
              med.category,
              med.type,
              med.strength,
              med.manufacturer || null,
              parseInt(med.quantity),
              med.minStockLevel || 10,
              med.maxStockLevel || 1000,
              supplierId, // Supplier ID added back in
              unitPrice,
              new Date(med.expiryDate),
              med.imageUrl || null,
              med.prescriptionRequired !== undefined ? med.prescriptionRequired : true,
              med.location || null,
              med.notes || null
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
              parseInt(med.quantity),
              med.batchNumber,
              unitPrice,
              unitPrice * parseInt(med.quantity),
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
      
      if (medication.currentStock < quantity) {
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
        quantity,
        batchNumber: medication.batchNumber,
        unitPrice: medication.unitPrice,
        totalPrice: medication.unitPrice * quantity,
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
        storageLocation
      } = req.body;
  
      const medication = await Medication.findByPk(id, { transaction });
        
      if (!medication) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Medication not found'
        });
      }
  
      // Validate stock adjustment
      let newStock = medication.currentStock;
      if (type === 'ADJUSTED') {
        // For adjustment, quantity is the new total stock value
        newStock = parseInt(quantity);
      } else {
        // For other types, add or subtract the quantity
        const change = (type === 'RECEIVED' || type === 'RETURNED') ? 
          parseInt(quantity) : -parseInt(quantity);
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
      
      // Calculate new unit price if marked price and markup are provided
      let unitPrice = medication.unitPrice;
      if (markedPrice !== undefined && markupPercentage !== undefined) {
        const newMarkedPrice = parseFloat(markedPrice);
        const newMarkupPercentage = parseFloat(markupPercentage);
        unitPrice = newMarkedPrice * (1 + newMarkupPercentage / 100);
      }

      // Update medication
      const updateData = {
        currentStock: newStock,
        batchNumber: batchNumber || medication.batchNumber,
        expiryDate: expiryDate || medication.expiryDate
      };
      
      if (markedPrice !== undefined) {
        updateData.markedPrice = parseFloat(markedPrice);
      }
      
      if (markupPercentage !== undefined) {
        updateData.markupPercentage = parseFloat(markupPercentage);
      }
      
      if (unitPrice !== medication.unitPrice) {
        updateData.unitPrice = unitPrice;
      }
      
      if (storageLocation) {
        updateData.storageLocation = storageLocation;
      }
      
      await medication.update(updateData, { transaction });
  
      // Record movement
      const movementQuantity = (type === 'ADJUSTED') ? 
        newStock - medication.currentStock : parseInt(quantity);
      
      await StockMovement.create({
        medicationId: id,
        type,
        quantity: movementQuantity,
        batchNumber: batchNumber || medication.batchNumber,
        unitPrice,
        totalPrice: unitPrice * Math.abs(movementQuantity),
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
        supplierId,  // Added back supplierId parameter
        storageLocation, 
        lowStock, 
        expiringSoon,
        page = 1, 
        limit = 10 
      } = req.query;
      
      // Build WHERE clause parts
      let whereClause = `WHERE "isActive" = true`;
      
      if (search) {
        whereClause += ` AND (
          name ILIKE '%${search}%' OR 
          "genericName" ILIKE '%${search}%' OR 
          "batchNumber" ILIKE '%${search}%'
        )`;
      }
      
      if (category) whereClause += ` AND category = '${category}'`;
      if (type) whereClause += ` AND type = '${type}'`;
      if (supplierId) whereClause += ` AND supplier_id = '${supplierId}'`; // Use supplier_id column
      if (storageLocation) whereClause += ` AND "storageLocation" = '${storageLocation}'`;
      
      if (lowStock === 'true') {
        whereClause += ` AND "currentStock" <= "minStockLevel"`;
      }
      
      if (expiringSoon === 'true') {
        const threeMonthsFromNow = new Date();
        threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
        whereClause += ` AND "expiryDate" <= '${threeMonthsFromNow.toISOString()}'`;
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
        success: true,
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
      // Validate required fields
      const requiredFields = ['name', 'batchNumber', 'category', 'type', 'strength', 'expiryDate'];
      const missingFields = requiredFields.filter(field => !req.body[field]);
      
      if (missingFields.length > 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Missing required fields: ${missingFields.join(', ')}`
        });
      }
      
      // Calculate unit price from marked price and markup
      const markedPrice = parseFloat(req.body.markedPrice || 0);
      const markupPercentage = parseFloat(req.body.markupPercentage || 15);
      const unitPrice = markedPrice * (1 + markupPercentage / 100);
      
      // Process and validate the medication data
      const medicationData = {
        name: req.body.name.trim(),
        genericName: req.body.genericName?.trim(),
        batchNumber: req.body.batchNumber.trim(),
        category: req.body.category?.toUpperCase(),
        type: req.body.type?.toUpperCase(),
        strength: req.body.strength.trim(),
        manufacturer: req.body.manufacturer?.trim() || '',
        currentStock: parseInt(req.body.currentStock || 0),
        minStockLevel: parseInt(req.body.minStockLevel || 10),
        maxStockLevel: parseInt(req.body.maxStockLevel || 1000),
        supplierId: req.body.supplierId,
        markedPrice,
        markupPercentage,
        unitPrice,
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
          quantity: medicationData.currentStock,
          batchNumber: medicationData.batchNumber,
          unitPrice: medicationData.unitPrice,
          totalPrice: medicationData.currentStock * medicationData.unitPrice,
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
      
      // If marked price or markup percentage is being updated, recalculate unit price
      if (updateData.markedPrice !== undefined || updateData.markupPercentage !== undefined) {
        const markedPrice = parseFloat(updateData.markedPrice !== undefined ? 
          updateData.markedPrice : medication.markedPrice);
        
        const markupPercentage = parseFloat(updateData.markupPercentage !== undefined ? 
          updateData.markupPercentage : medication.markupPercentage);
        
        updateData.unitPrice = markedPrice * (1 + markupPercentage / 100);
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

// Dispensing Management
async dispenseMedication(req, res, next) {
try {
const {
  prescriptionId,
  medicationId,
  patientId,
  quantity,
  dosage,
  frequency,
  duration,
  labResultId
} = req.body;

// Start transaction
const transaction = await sequelize.transaction();

try {
  // Check medication availability
  const medication = await Medication.findByPk(medicationId, { transaction });
  
  if (!medication || medication.currentStock < quantity) {
    await transaction.rollback();
    return res.status(400).json({
      success: false,
      message: 'Insufficient stock'
    });
  }

  // Validate prescription if required
  if (medication.prescriptionRequired && !prescriptionId) {
    await transaction.rollback();
    return res.status(400).json({
      success: false,
      message: 'Prescription required for this medication'
    });
  }

  // Check lab results if linked
  if (labResultId) {
    const labTest = await LabTest.findByPk(labResultId, { transaction });
    if (!labTest || labTest.status !== 'VERIFIED') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Valid lab test results required'
      });
    }
  }

  // Create dispense record
  const dispense = await MedicationDispense.create({
    prescriptionId,
    medicationId,
    patientId,
    dispensedBy: req.user.id,
    quantity,
    dosage,
    frequency,
    duration,
    unitPrice: medication.unitPrice,
    totalPrice: medication.unitPrice * quantity,
    labResultId,
    status: 'DISPENSED',
    dispensedAt: new Date()
  }, { transaction });

  // Update inventory
  await medication.update({
    currentStock: medication.currentStock - quantity
  }, { transaction });

  // Create stock movement record
  await StockMovement.create({
    medicationId,
    type: 'DISPENSED',
    quantity: -quantity,
    unitPrice: medication.unitPrice,
    totalPrice: medication.unitPrice * quantity,
    performedBy: req.user.id,
    sourceType: 'PRESCRIPTION',
    sourceId: prescriptionId,
    fromLocation: medication.storageLocation
  }, { transaction });

  // Check if new stock level is below minimum
  if (medication.currentStock - quantity <= medication.minStockLevel) {
    await this.sendLowStockAlert(medication);
  }

  await transaction.commit();

  // Generate dispense report
  const report = await generateDispenseReport(dispense);

  res.status(200).json({
    success: true,
    message: 'Medication dispensed successfully',
    dispense,
    reportUrl: report.url
  });
} catch (error) {
  await transaction.rollback();
  throw error;
}
} catch (error) {
next(error);
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

  await prescription.addMedication(medication, {
    through: {
      quantity: med.quantity,
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

async getPendingPrescriptions(req, res, next) {
try {
const prescriptions = await Prescription.findAll({
  where: {
    status: 'active',
    validUntil: {
      [Op.gte]: new Date()
    }
  },
  include: [
    {
      model: User,
      as: 'PATIENT',
      attributes: ['id', 'surname', 'otherNames']
    },
    {
      model: User,
      as: 'DOCTOR',
      attributes: ['id', 'surname', 'otherNames']
    },
    {
      model: Medication,
      through: {
        attributes: ['quantity', 'specialInstructions']
      }
    }
  ],
  order: [['createdAt', 'DESC']]
});

res.json({
  success: true,
  prescriptions
});
} catch (error) {
next(error);
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

  if (medication.currentStock < dispense.quantity) {
    throw new Error(`Insufficient stock for ${medication.name}`);
  }

  // Create dispense record
  const dispenseRecord = await MedicationDispense.create({
    prescriptionId,
    medicationId: medication.id,
    patientId: prescription.patientId,
    dispensedBy: req.user.id,
    quantity: dispense.quantity,
    dosage: dispense.dosage,
    frequency: dispense.frequency,
    duration: dispense.duration,
    unitPrice: medication.unitPrice,
    totalPrice: medication.unitPrice * dispense.quantity,
    status: 'DISPENSED',
    dispensedAt: new Date()
  }, { transaction });

  // Update inventory
  await medication.update({
    currentStock: medication.currentStock - dispense.quantity
  }, { transaction });

  // Create stock movement record
  await StockMovement.create({
    medicationId: medication.id,
    type: 'DISPENSED',
    quantity: -dispense.quantity,
    batchNumber: medication.batchNumber,
    unitPrice: medication.unitPrice,
    totalPrice: medication.unitPrice * dispense.quantity,
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
      attributes: ['name', 'type', 'strength']
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

res.json({
  success: true,
  count,
  pages: Math.ceil(count / limit),
  currentPage: parseInt(page),
  dispenses
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
      attributes: ['name', 'type', 'strength']
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

res.json({
  success: true,
  dispense
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

const validationResults = {
  hasStock: medication.currentStock >= quantity,
  needsPrescription: medication.prescriptionRequired,
  hasPrescription: Boolean(prescriptionId),
  isExpired: medication.expiryDate < new Date(),
  price: medication.unitPrice * quantity
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
      attributes: ['name', 'category', 'currentStock']
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
      attributes: ['name', 'category', 'type']
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
      attributes: ['name', 'category']
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

res.json({
  success: true,
  summary,
  dispenses
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
      attributes: ['name', 'category']
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
    
    res.json({
      success: true,
      dispenses
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