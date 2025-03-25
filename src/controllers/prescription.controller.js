const { Prescription, User, Medication, sequelize } = require('../models');
const BillingService = require('../services/billing.service');


exports.createPrescription = async (req, res, next) => {
  try {
    const { 
      patientId, 
      diagnosis, 
      notes, 
      validUntil, 
      maxRefills, 
      medications, 
      appointmentId 
    } = req.body;

    console.log('Starting prescription creation with data:', { medications });

    const prescription = await sequelize.transaction(async (t) => {
      // Create the prescription
      const newPrescription = await Prescription.create({
        patientId,
        doctorId: req.user.id,
        appointmentId,
        diagnosis,
        notes,
        validUntil,
        maxRefills,
        status: 'active'
      }, { transaction: t });

      // Add medications to prescription
      if (medications && medications.length > 0) {
        await Promise.all(medications.map(med => 
          newPrescription.addMedication(med.medicationId, {
            through: {
              quantity: med.quantity || 1,  // Use med.quantity if provided or default to 1
              specialInstructions: `Dosage: ${med.dosage}, Frequency: ${med.frequency}, Duration: ${med.duration}`
            },
            transaction: t
          })
        ));
      }

      return newPrescription;
    });

    // Fetch complete prescription with associations
    const completePrescription = await Prescription.findByPk(prescription.id, {
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
          attributes: ['id', 'name'], // Only include necessary attributes
          through: {
            attributes: ['quantity', 'specialInstructions']
          }
        }
      ]
    });

    res.status(201).json({
      success: true,
      prescription: completePrescription
    });
  } catch (error) {
    console.error('Error in createPrescription:', error);
    next(error);
  }
};


exports.getPrescription = async (req, res, next) => {
  try {
    const prescription = await Prescription.findByPk(req.params.id, {
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
            attributes: ['dosage', 'frequency', 'duration']
          }
        }
      ]
    });

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }

    res.json({
      success: true,
      prescription
    });
  } catch (error) {
    next(error);
  }
};

exports.getPatientPrescriptions = async (req, res, next) => {
  try {
    // Get the basic prescription data first
    const prescriptions = await Prescription.findAll({
      where: { patientId: req.params.patientId },
      include: [
        {
          model: User,
          as: 'DOCTOR',
          attributes: ['id', 'surname', 'otherNames']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Get the prescription IDs
    const prescriptionIds = prescriptions.map(p => p.id);
    
    if (prescriptionIds.length === 0) {
      return res.json({
        success: true,
        prescriptions: []
      });
    }
    
    // Updated SQL query to include unitPrice in the selection
    const rawMeds = await sequelize.query(`
      SELECT pm.*, m."id", m."name", m."strength", m."type", m."unitPrice"
      FROM "PrescriptionMedications" AS pm
      JOIN "Medications" AS m ON pm."MedicationId" = m."id"
      WHERE pm."prescriptionId" IN (:prescriptionIds)
    `, {
      replacements: { prescriptionIds },
      type: sequelize.QueryTypes.SELECT
    });
    
    // Updated grouping to include unitPrice in the medication object
    const medsLookup = rawMeds.reduce((acc, med) => {
      if (!acc[med.prescriptionId]) acc[med.prescriptionId] = [];
      acc[med.prescriptionId].push({
        id: med.id,
        medication: {
          id: med.id,
          name: med.name,
          strength: med.strength,
          type: med.type,
          unitPrice: med.unitPrice  // Added unitPrice field
        },
        quantity: med.quantity,
        specialInstructions: med.specialInstructions
      });
      return acc;
    }, {});
    
    // Add medications to prescriptions
    const fullPrescriptions = prescriptions.map(p => {
      const plainP = p.get({ plain: true });
      plainP.medications = medsLookup[p.id] || [];
      return plainP;
    });
    
    return res.json({
      success: true,
      prescriptions: fullPrescriptions
    });
  } catch (error) {
    console.error('Error fetching patient prescriptions:', error);
    return res.status(500).json({
      success: false,
      message: 'Database error occurred'
    });
  }
};


exports.updatePrescriptionMedication = async (req, res, next) => {
  try {
    const { prescriptionId, medicationId } = req.params;
    const { dosage, frequency, duration, quantity } = req.body;

    // Parse the existing special instructions
    const prescriptionMedication = await sequelize.models.PrescriptionMedication.findOne({
      where: {
        prescriptionId,
        medicationId
      }
    });

    if (!prescriptionMedication) {
      return res.status(404).json({
        success: false,
        message: 'Prescription medication not found'
      });
    }

    // Create new special instructions string with updated values
    const specialInstructions = `Dosage: ${dosage}, Frequency: ${frequency}, Duration: ${duration}`;

    // Update the prescription medication
    await prescriptionMedication.update({
      specialInstructions,
      quantity: quantity || prescriptionMedication.quantity
    });

    res.json({
      success: true,
      message: 'Prescription medication updated successfully',
      prescriptionMedication
    });
  } catch (error) {
    console.error('Error updating prescription medication:', error);
    next(error);
  }
};


exports.updatePrescriptionStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const prescription = await Prescription.findByPk(req.params.id);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }

    await prescription.update({ status });

    res.json({
      success: true,
      message: 'Prescription status updated'
    });
  } catch (error) {
    next(error);
  }
};

exports.refillPrescription = async (req, res, next) => {
  try {
    const prescription = await Prescription.findByPk(req.params.id);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }

    if (prescription.refillCount >= prescription.maxRefills) {
      return res.status(400).json({
        success: false,
        message: 'Maximum refills reached'
      });
    }

    await prescription.increment('refillCount');

    res.json({
      success: true,
      message: 'Prescription refilled successfully'
    });
  } catch (error) {
    next(error);
  }
};