const { 
  Medication,
  StockMovement, 
  MedicationDispense,
  LabTest,
  Prescription,
  User,
  Patient,
  sequelize
} = require('../models');

  const { Op } = require('sequelize');
  const { sendEmail } = require('../utils/email.util');
  const { generateDispenseReport } = require('../utils/pdf.util');
  const { validateMedicationInteractions } = require('../utils/pharmacy.util');
  
  class PharmacyController {
    // Inventory Management

    async searchMedications(req, res, next) {
      try {
        const { 
          search, 
          category, 
          batchNumber,
          page = 1, 
          limit = 10 
        } = req.query;
        
        const whereClause = { isActive: true };
        
        if (search) {
          whereClause[Op.or] = [
            { name: { [Op.iLike]: `%${search}%` } },
            { genericName: { [Op.iLike]: `%${search}%` } }
          ];
        }
        
        if (batchNumber) {
          whereClause.batchNumber = batchNumber;
        }
        
        if (category) {
          whereClause.category = category.toUpperCase();
        }
    
        const { count, rows: medications } = await Medication.findAndCountAll({
          where: whereClause,
          limit: parseInt(limit),
          offset: (parseInt(page) - 1) * parseInt(limit),
          order: [['name', 'ASC']],
          attributes: {
            include: [
              [
                sequelize.literal(`
                  CASE 
                    WHEN current_stock <= min_stock_level THEN true 
                    ELSE false 
                  END
                `),
                'isLowStock'
              ]
            ]
          }
        });
    
        res.json({
          success: true,
          count,
          pages: Math.ceil(count / limit),
          currentPage: parseInt(page),
          medications
        });
      } catch (error) {
        next(error);
      }
    }
    
    async getMedicationsByBatchNumber(req, res, next) {
      try {
        const { batchNumber } = req.params;
        
        const medication = await Medication.findOne({
          where: { 
            batchNumber,
            isActive: true 
          }
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
    
    async getExpiringMedications(req, res, next) {
      try {
        const daysThreshold = parseInt(req.query.days) || 90; // Default 90 days
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
    
        const medications = await Medication.findAll({
          where: {
            isActive: true,
            expiryDate: {
              [Op.lte]: thresholdDate
            },
            currentStock: {
              [Op.gt]: 0
            }
          },
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
    
    async addMedication(req, res, next) {
      let transaction;
      
      try {
        transaction = await sequelize.transaction();
    
        // Validate required fields
        const requiredFields = ['name', 'batchNumber', 'category', 'type', 'strength', 'unitPrice', 'expiryDate'];
        const missingFields = requiredFields.filter(field => !req.body[field]);
        
        if (missingFields.length > 0) {
          return res.status(400).json({
            success: false,
            message: `Missing required fields: ${missingFields.join(', ')}`
          });
        }
    
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
          unitPrice: parseFloat(req.body.unitPrice),
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
            medication_id: medication.id,  // Changed to snake_case
            type: 'RECEIVED',
            quantity: medicationData.currentStock,
            batch_number: medicationData.batchNumber,  // Changed to snake_case
            unit_price: medicationData.unitPrice,      // Changed to snake_case
            total_price: medicationData.currentStock * medicationData.unitPrice,  // Changed to snake_case
            performed_by: req.user?.id,    // Changed to snake_case
            source_type: 'INITIAL',        // Changed to snake_case
            reason: 'Initial stock entry'
          };
    
          // Log the stock movement data for debugging
          console.log('Creating stock movement with data:', stockMovementData);
    
          if (!stockMovementData.performed_by) {
            throw new Error('User ID is required for stock movement');
          }
    
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
    
        // Log the error details
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

    async getPharmacyStats(req, res, next) {
      try {
        const [
          totalDispensed, 
          pendingPrescriptions,
          totalMedications,
          criticalStock
        ] = await Promise.all([
          MedicationDispense.count({
            where: { status: 'DISPENSED' }
          }),
          Prescription.count({
            where: { status: 'pending' }
          }),
          Medication.count(),
          Medication.count({
            where: {
              currentStock: {
                [Op.lte]: sequelize.col('minStockLevel')
              }
            }
          })
        ]);
    
        const inventoryValue = await Medication.sum(
          sequelize.literal('currentStock * unitPrice')
        );
    
        res.json({
          success: true,
          stats: {
            totalDispensed,
            pendingPrescriptions,
            totalMedications,
            criticalStock,
            inventoryValue: inventoryValue || 0
          }
        });
      } catch (error) {
        next(error);
      }
    }
    
    async getPendingDispenses(req, res, next) {
      try {
        const pendingDispenses = await MedicationDispense.findAll({
          where: {
            status: 'PENDING'
          },
          include: [
            {
              model: Medication,
              attributes: ['id', 'name', 'strength', 'currentStock']
            },
            {
              model: User,
              as: 'PATIENT',
              attributes: ['id', 'name', 'email']
            },
            {
              model: Prescription,
              include: [{
                model: User,
                as: 'DOCTOR',
                attributes: ['id', 'name']
              }]
            }
          ],
          order: [['createdAt', 'DESC']]
        });
    
        res.json({
          success: true,
          dispenses: pendingDispenses
        });
      } catch (error) {
        next(error);
      }
    }
    
    async getInventoryMetrics(req, res, next) {
      try {
        const [
          totalItems, 
          lowStock,
          expiringItems
        ] = await Promise.all([
          Medication.count(),
          Medication.count({
            where: {
              currentStock: {
                [Op.lte]: sequelize.col('minStockLevel')
              }
            }
          }),
          Medication.count({
            where: {
              expiryDate: {
                [Op.lte]: new Date(Date.now() + (90 * 24 * 60 * 60 * 1000)) // 90 days
              }
            }
          })
        ]);
    
        const totalValue = await Medication.sum(
          sequelize.literal('currentStock * unitPrice')
        );
    
        const categoryDistribution = await Medication.findAll({
          attributes: [
            'category',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
          ],
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
            sourceId: prescriptionId
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
  
    // Stock Management
    async updateStock(req, res, next) {
      try {
        const { id } = req.params;
        const { 
          quantity, 
          type, 
          reason, 
          batchNumber,
          expiryDate 
        } = req.body;
  
        const medication = await Medication.findByPk(id);
        
        if (!medication) {
          return res.status(404).json({
            success: false,
            message: 'Medication not found'
          });
        }
  
        const newStock = medication.currentStock + quantity;
        
        // Validate stock levels
        if (newStock < 0) {
          return res.status(400).json({
            success: false,
            message: 'Invalid stock adjustment. Would result in negative stock.'
          });
        }
  
        // Update stock
        await medication.update({
          currentStock: newStock,
          batchNumber: batchNumber || medication.batchNumber,
          expiryDate: expiryDate || medication.expiryDate
        });
  
        // Record movement
        await StockMovement.create({
          medicationId: id,
          type,
          quantity,
          batchNumber,
          unitPrice: medication.unitPrice,
          totalPrice: quantity * medication.unitPrice,
          reason,
          performedBy: req.user.id,
          sourceType: 'ADJUSTMENT'
        });
  
        res.json({
          success: true,
          message: 'Stock updated successfully',
          medication
        });
      } catch (error) {
        next(error);
      }
    }
  
    // Integration with Lab System
    async getLabBasedPrescriptions(req, res, next) {
      try {
        const labTests = await LabTest.findAll({
          where: {
            status: 'VERIFIED',
            isCritical: true,
            createdAt: {
              [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          },
          include: [
            {
              model: User,
              as: 'PATIENT',
              attributes: ['id', 'name', 'email']
            },
            {
              model: User,
              as: 'referringDoctor',
              attributes: ['id', 'name', 'email']
            }
          ]
        });
  
        const prescriptionNeeded = labTests.map(test => ({
          testId: test.id,
          patientName: test.patient.name,
          doctorName: test.referringDoctor.name,
          testType: test.testType,
          results: test.results,
          criticalValues: test.criticalValues
        }));
  
        res.json({
          success: true,
          prescriptionNeeded
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
  

    async getInventory(req, res, next) {
      try {
        const { search, category, type, page = 1, limit = 10 } = req.query;
        
        const whereClause = { isActive: true };
        
        if (search) {
          whereClause[Op.or] = [
            { name: { [Op.iLike]: `%${search}%` } },
            { genericName: { [Op.iLike]: `%${search}%` } }
          ];
        }
        
        if (category) whereClause.category = category;
        if (type) whereClause.type = type;
  
        const { count, rows: medications } = await Medication.findAndCountAll({
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
          medications
        });
      } catch (error) {
        next(error);
      }
    }
  
    async getMedicationById(req, res, next) {
      try {
        const { id } = req.params;
        
        const medication = await Medication.findOne({
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
  
    async updateMedication(req, res, next) {
      try {
        const { id } = req.params;
        const updateData = req.body;
  
        const medication = await Medication.findByPk(id);
  
        if (!medication) {
          return res.status(404).json({
            success: false,
            message: 'Medication not found'
          });
        }
  
        await medication.update(updateData);
  
        res.json({
          success: true,
          message: 'Medication updated successfully',
          medication
        });
      } catch (error) {
        next(error);
      }
    }

    
  
    async getLowStockItems(req, res, next) {
      try {
        const medications = await Medication.findAll({
          where: {
            isActive: true,
            currentStock: {
              [Op.lte]: sequelize.col('minStockLevel')
            }
          }
        });
  
        res.json({
          success: true,
          medications
        });
      } catch (error) {
        next(error);
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
          }
        });
  
        res.json({
          success: true,
          medications
        });
      } catch (error) {
        next(error);
      }
    }
  
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
            report.totalDispensed += movement.quantity;
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
  
    // Enhanced Dispensing Management
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
            medication_id: medication.id,
            type: 'DISPENSED',
            quantity: -dispense.quantity,
            batch_number: medication.batchNumber,
            unit_price: medication.unitPrice,
            total_price: medication.unitPrice * dispense.quantity,
            performed_by: req.user.id,
            source_type: 'PRESCRIPTION',
            source_id: prescriptionId
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
  
    // Medication Category Management
    async addMedicationCategory(req, res, next) {
      try {
        const { name, description } = req.body;
  
        // Add validation for unique category name
        const existingCategory = await MedicationCategory.findOne({
          where: {
            name: { [Op.iLike]: name }
          }
        });
  
        if (existingCategory) {
          return res.status(400).json({
            success: false,
            message: 'Category already exists'
          });
        }
  
        const category = await MedicationCategory.create({
          name,
          description,
          createdBy: req.user.id
        });
  
        res.status(201).json({
          success: true,
          message: 'Category added successfully',
          category
        });
      } catch (error) {
        next(error);
      }
    }
  
    async getMedicationCategories(req, res, next) {
      try {
        const categories = await MedicationCategory.findAll({
          order: [['name', 'ASC']]
        });
  
        res.json({
          success: true,
          categories
        });
      } catch (error) {
        next(error);
      }
    }
  
    // Pharmacy Reports
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
  }


  
  module.exports = new PharmacyController();