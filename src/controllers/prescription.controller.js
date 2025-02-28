const { Prescription, User, Medication, sequelize } = require('../models');

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
              quantity: 1,  // or med.quantity if you send it
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
          through: {
            attributes: ['quantity', 'specialInstructions']  // Changed to match actual columns
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
    const prescriptions = await Prescription.findAll({
      where: { patientId: req.params.patientId },
      include: [
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