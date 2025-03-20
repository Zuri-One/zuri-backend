// controllers/medication.controller.js
const { Medication, Prescription, User, PrescriptionMedications } = require('../models');
const { Op } = require('sequelize');

exports.createMedication = async (req, res, next) => {
  try {
    const medication = await Medication.create(req.body);
    res.status(201).json({
      success: true,
      medication
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllMedications = async (req, res, next) => {
  try {
    const medications = await Medication.findAll({
      attributes: [
        'id', 'name', 'genericName', 'batchNumber', 'category', 'type', 'strength', 
        'manufacturer', 'currentStock', 'minStockLevel', 'maxStockLevel', 
        'supplier_id', 'unitPrice', 'expiryDate', 'imageUrl', 'prescriptionRequired', 
        'isActive', 'location', 'notes', 'createdAt', 'updatedAt'
      ],
      where: { isActive: true },
      order: [['name', 'ASC']]
    });
    
    res.json({
      success: true,
      medications
    });
  } catch (error) {
    console.error('Error fetching medications:', error.message);
    next(error);
  }
};

exports.getMedication = async (req, res, next) => {
  try {
    const medication = await Medication.findByPk(req.params.id);
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
};

exports.updateMedication = async (req, res, next) => {
  try {
    const medication = await Medication.findByPk(req.params.id);
    if (!medication) {
      return res.status(404).json({
        success: false,
        message: 'Medication not found'
      });
    }
    await medication.update(req.body);
    res.json({
      success: true,
      medication
    });
  } catch (error) {
    next(error);
  }
};

// Updated createPrescription to match the new medication model
exports.createPrescription = async (req, res, next) => {
  try {
    const { patientId, appointmentId, diagnosis, medications, notes, validUntil, maxRefills } = req.body;
    const doctorId = req.user.id;

    // Validate doctor and patient
    const [doctor, patient] = await Promise.all([
      User.findOne({ where: { id: doctorId, role: 'DOCTOR' }}),
      User.findOne({ where: { id: patientId, role: 'PATIENT' }})
    ]);

    if (!doctor || !patient) {
      return res.status(404).json({ 
        success: false,
        message: 'Doctor or patient not found' 
      });
    }

    // Create prescription
    const prescription = await Prescription.create({
      patientId,
      doctorId,
      appointmentId,
      diagnosis,
      notes,
      validUntil,
      maxRefills,
      status: 'active'
    });

    // Add medications to prescription
    for (const med of medications) {
      const medication = await Medication.findByPk(med.medicationId);
      if (!medication) {
        throw new Error(`Medication with ID ${med.medicationId} not found`);
      }

      await PrescriptionMedications.create({
        prescriptionId: prescription.id,
        medicationId: medication.id,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration,
        instructions: med.instructions
      });
    }

    // Fetch complete prescription with associations
    const completePrescription = await Prescription.findByPk(prescription.id, {
      include: [
        {
          model: Medication,
          through: {
            attributes: ['dosage', 'frequency', 'duration', 'instructions']
          }
        },
        {
          model: User,
          as: 'PATIENT',
          attributes: ['id', 'surname', 'otherNames', 'email']
        },
        {
          model: User,
          as: 'DOCTOR',
          attributes: ['id', 'surname', 'otherNames']
        }
      ]
    });

    res.status(201).json({
      success: true,
      prescription: completePrescription
    });
  } catch (error) {
    next(error);
  }
};

// Add medication search functionality
exports.searchMedications = async (req, res, next) => {
  try {
    const { query, category, type } = req.query;
    const where = { isActive: true };

    if (query) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${query}%` } },
        { genericName: { [Op.iLike]: `%${query}%` } }
      ];
    }

    if (category) {
      where.category = category;
    }

    if (type) {
      where.type = type;
    }

    const medications = await Medication.findAll({
      where,
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      medications
    });
  } catch (error) {
    next(error);
  }
};

// Add stock management
exports.updateStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quantity, action } = req.body;

    const medication = await Medication.findByPk(id);
    if (!medication) {
      return res.status(404).json({
        success: false,
        message: 'Medication not found'
      });
    }

    let newStock = medication.currentStock;
    if (action === 'add') {
      newStock += quantity;
    } else if (action === 'subtract') {
      newStock -= quantity;
    }

    if (newStock < 0) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock'
      });
    }

    await medication.update({ currentStock: newStock });

    res.json({
      success: true,
      medication
    });
  } catch (error) {
    next(error);
  }
};

// Add low stock alert
exports.getLowStockMedications = async (req, res, next) => {
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
};