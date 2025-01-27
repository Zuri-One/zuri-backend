const { 
    MedicationInventory, 
    Medication,
    StockMovement, 
    MedicationDispense,
    LabTest,
    Prescription,
    User, 
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
    
        const { count, rows: medications } = await MedicationInventory.findAndCountAll({
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
        
        const medication = await MedicationInventory.findOne({
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
    
        const medications = await MedicationInventory.findAll({
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
    
        try {
          // Create medication directly specifying all fields
          const medication = await Medication.create({
            name: req.body.name,
            genericName: req.body.genericName,
            batchNumber: req.body.batchNumber,
            category: req.body.category.toUpperCase(),
            type: req.body.type.toUpperCase(),
            strength: req.body.strength,
            manufacturer: req.body.manufacturer || '',
            currentStock: parseInt(req.body.currentStock || 0),
            minStockLevel: parseInt(req.body.minStockLevel || 10),
            maxStockLevel: parseInt(req.body.maxStockLevel || 1000),
            unitPrice: parseFloat(req.body.unitPrice),
            expiryDate: new Date(req.body.expiryDate),
            imageUrl: req.body.imageUrl,
            prescriptionRequired: Boolean(req.body.prescriptionRequired),
            location: req.body.location,
            notes: req.body.notes || ''
          }, {
            transaction,
            returning: true // Make sure we get all fields back
          });
    
          // Create initial stock movement if there's initial stock
          if (parseInt(req.body.currentStock) > 0) {
            await StockMovement.create({
              medicationId: medication.id,
              type: 'RECEIVED',
              quantity: parseInt(req.body.currentStock),
              batchNumber: req.body.batchNumber,
              unitPrice: parseFloat(req.body.unitPrice),
              totalPrice: parseInt(req.body.currentStock) * parseFloat(req.body.unitPrice),
              performedBy: req.user?.id || null,
              sourceType: 'INITIAL'
            }, { transaction });
          }
    
          await transaction.commit();
    
          return res.status(201).json({
            success: true,
            message: 'Medication added successfully',
            medication
          });
    
        } catch (error) {
          if (transaction) await transaction.rollback();
          
          if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({
              success: false,
              message: 'A medication with this batch number already exists'
            });
          }
          
          throw error;
        }
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: 'Error adding medication',
          error: error.message
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
          MedicationInventory.count(),
          MedicationInventory.count({
            where: {
              currentStock: {
                [Op.lte]: sequelize.col('minStockLevel')
              }
            }
          })
        ]);
    
        const inventoryValue = await MedicationInventory.sum(
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
              model: MedicationInventory,
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
          MedicationInventory.count(),
          MedicationInventory.count({
            where: {
              currentStock: {
                [Op.lte]: sequelize.col('minStockLevel')
              }
            }
          }),
          MedicationInventory.count({
            where: {
              expiryDate: {
                [Op.lte]: new Date(Date.now() + (90 * 24 * 60 * 60 * 1000)) // 90 days
              }
            }
          })
        ]);
    
        const totalValue = await MedicationInventory.sum(
          sequelize.literal('currentStock * unitPrice')
        );
    
        const categoryDistribution = await MedicationInventory.findAll({
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
    
        const medication = await MedicationInventory.findByPk(medicationId);
        
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
              model: MedicationInventory,
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
          const category = dispense.MedicationInventory.category;
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
          const medication = await MedicationInventory.findByPk(medicationId, { transaction });
          
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
  
        const medication = await MedicationInventory.findByPk(id);
        
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
  
        const { count, rows: medications } = await MedicationInventory.findAndCountAll({
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
        
        const medication = await MedicationInventory.findOne({
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
  
        const medication = await MedicationInventory.findByPk(id);
  
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
        const medications = await MedicationInventory.findAll({
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
  
        const medications = await MedicationInventory.findAll({
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
              model: MedicationInventory,
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
              model: MedicationInventory,
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
              model: MedicationInventory,
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
          const category = dispense.MedicationInventory.category;
          if (!report.byCategory[category]) {
            report.byCategory[category] = {
              count: 0,
              value: 0
            };
          }
          report.byCategory[category].count++;
          report.byCategory[category].value += parseFloat(dispense.totalPrice);
  
          // By medication
          const medName = dispense.MedicationInventory.name;
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
              model: MedicationInventory,
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
  }


  
  module.exports = new PharmacyController();