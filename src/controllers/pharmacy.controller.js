// controllers/pharmacy.controller.js
const { 
    MedicationInventory, 
    StockMovement, 
    MedicationDispense,
    LabTest,
    Prescription,
    User 
  } = require('../models');
  const { Op } = require('sequelize');
  const { sendEmail } = require('../utils/email.util');
  const { generateDispenseReport } = require('../utils/pdf.util');
  const { validateMedicationInteractions } = require('../utils/pharmacy.util');
  
  class PharmacyController {
    // Inventory Management
    async addMedication(req, res, next) {
      try {
        const {
          name,
          genericName,
          category,
          type,
          strength,
          manufacturer,
          batchNumber,
          expiryDate,
          currentStock,
          minStockLevel,
          maxStockLevel,
          unitPrice,
          prescriptionRequired,
          ...otherDetails
        } = req.body;
  
        const medication = await MedicationInventory.create({
          name,
          genericName,
          category,
          type,
          strength,
          manufacturer,
          batchNumber,
          expiryDate,
          currentStock,
          minStockLevel,
          maxStockLevel,
          unitPrice,
          prescriptionRequired,
          ...otherDetails
        });
  
        // Create initial stock movement record
        await StockMovement.create({
          medicationId: medication.id,
          type: 'RECEIVED',
          quantity: currentStock,
          batchNumber,
          unitPrice,
          totalPrice: currentStock * unitPrice,
          performedBy: req.user.id,
          sourceType: 'PURCHASE'
        });
  
        // Check if stock level is below minimum
        if (currentStock <= minStockLevel) {
          await this.sendLowStockAlert(medication);
        }
  
        res.status(201).json({
          success: true,
          message: 'Medication added successfully',
          medication
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
              as: 'patient',
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
              as: 'patient',
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
              as: 'patient',
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
                as: 'doctor',
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