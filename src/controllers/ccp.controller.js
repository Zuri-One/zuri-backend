// controllers/ccp.controller.js
const { 
    Patient, 
    MedicalRecord, 
    Examination, 
    LabTest, 
    Prescription, 
    MedicationDispense, 
    Billing, 
    Triage, 
    User, 
    CCP, 
    Department,
    Medication,
    TestResult,
    sequelize 
  } = require('../models');
  const { Op } = require('sequelize');
  const moment = require('moment');
  
  const log = (message, data = null) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      service: 'ccp-controller',
      message
    };
    
    if (data) {
      logEntry.data = data;
    }
    
    console.log(JSON.stringify(logEntry));
  };
  
  class CCPController {
    // Get all CCP enrolled patients with basic info
    async getCCPPatientsList(req, res, next) {
      try {
        const { page = 1, limit = 50, search, status = 'active' } = req.query;
        
        log('Fetching CCP patients list', { page, limit, search, status });
        
        const whereClause = {
          isCCPEnrolled: true,
          isActive: status === 'active'
        };
        
        if (search) {
          whereClause[Op.or] = [
            { patientNumber: { [Op.iLike]: `%${search}%` } },
            { surname: { [Op.iLike]: `%${search}%` } },
            { otherNames: { [Op.iLike]: `%${search}%` } },
            { telephone1: { [Op.iLike]: `%${search}%` } }
          ];
        }
        
        const { count, rows: patients } = await Patient.findAndCountAll({
          where: whereClause,
          attributes: [
            'id', 'patientNumber', 'surname', 'otherNames', 'sex', 'dateOfBirth',
            'telephone1', 'email', 'residence', 'town', 'ccpEnrollmentDate',
            'status', 'createdAt'
          ],
          limit: parseInt(limit),
          offset: (parseInt(page) - 1) * parseInt(limit),
          order: [['ccpEnrollmentDate', 'DESC']]
        });
        
        // Get basic stats for each patient in a single query
        const patientIds = patients.map(p => p.id);
        
        const [
          latestVisits,
          activePrescriptions,
          recentLabTests
        ] = await Promise.all([
          // Latest medical records
          MedicalRecord.findAll({
            where: { patientId: { [Op.in]: patientIds } },
            attributes: ['patientId', 'createdAt', 'diagnosis'],
            order: [['createdAt', 'DESC']],
            limit: patientIds.length
          }),
          
          // Active prescriptions count
          sequelize.query(`
            SELECT "patientId", COUNT(*) as count
            FROM "Prescriptions" 
            WHERE "patientId" IN (:patientIds) 
            AND status = 'active'
            AND "validUntil" > NOW()
            GROUP BY "patientId"
          `, {
            replacements: { patientIds },
            type: sequelize.QueryTypes.SELECT
          }),
          
          // Recent lab tests
          LabTest.findAll({
            where: { 
              patientId: { [Op.in]: patientIds },
              createdAt: { [Op.gte]: moment().subtract(6, 'months').toDate() }
            },
            attributes: ['patientId', 'status', 'testType', 'createdAt'],
            order: [['createdAt', 'DESC']]
          })
        ]);
        
        // Create lookup maps for performance
        const latestVisitMap = {};
        latestVisits.forEach(visit => {
          if (!latestVisitMap[visit.patientId]) {
            latestVisitMap[visit.patientId] = visit;
          }
        });
        
        const prescriptionCountMap = {};
        activePrescriptions.forEach(p => {
          prescriptionCountMap[p.patientId] = parseInt(p.count);
        });
        
        const labTestMap = {};
        recentLabTests.forEach(test => {
          if (!labTestMap[test.patientId]) {
            labTestMap[test.patientId] = [];
          }
          labTestMap[test.patientId].push(test);
        });
        
        const formattedPatients = patients.map(patient => ({
          id: patient.id,
          patientNumber: patient.patientNumber,
          fullName: `${patient.surname} ${patient.otherNames}`,
          sex: patient.sex,
          age: moment().diff(moment(patient.dateOfBirth), 'years'),
          contact: patient.telephone1,
          email: patient.email,
          location: `${patient.residence}, ${patient.town}`,
          enrollmentDate: moment(patient.ccpEnrollmentDate).format('MMMM Do YYYY'),
          enrollmentDuration: moment().diff(moment(patient.ccpEnrollmentDate), 'months'),
          status: patient.status,
          lastVisit: latestVisitMap[patient.id] ? {
            date: moment(latestVisitMap[patient.id].createdAt).format('MMMM Do YYYY'),
            diagnosis: latestVisitMap[patient.id].diagnosis
          } : null,
          activePrescriptions: prescriptionCountMap[patient.id] || 0,
          recentLabTests: labTestMap[patient.id]?.length || 0,
          registrationDate: moment(patient.createdAt).format('MMMM Do YYYY')
        }));
        
        log('CCP patients list retrieved', { 
          totalCount: count, 
          returnedCount: formattedPatients.length 
        });
        
        res.json({
          success: true,
          count: formattedPatients.length,
          total: count,
          pages: Math.ceil(count / limit),
          currentPage: parseInt(page),
          patients: formattedPatients
        });
        
      } catch (error) {
        log('Error fetching CCP patients list', { error: error.message });
        next(error);
      }
    }
  
    // Get comprehensive CCP patient profile
    async getCCPPatientProfile(req, res, next) {
      try {
        const { patientId } = req.params;
        const startTime = Date.now();
        
        log('Fetching comprehensive CCP patient profile', { patientId });
        
        // Get patient basic info
        const patientStart = Date.now();
        const patient = await Patient.findOne({
          where: { id: patientId, isCCPEnrolled: true },
          attributes: { exclude: ['password', 'resetPasswordToken', 'emailVerificationToken'] }
        });
        log('Patient fetch completed', { duration: Date.now() - patientStart });
        
        if (!patient) {
          return res.status(404).json({
            success: false,
            message: 'CCP patient not found'
          });
        }
        
        // Parallel data fetching for performance
        const parallelStart = Date.now();
        log('Starting parallel data fetch');
        const [
          medicalRecords,
          examinations,
          labTests,
          prescriptions,
          billingRecords,
          triageAssessments,
          medicationDispenses
        ] = await Promise.all([
          // Medical records with doctor info
          MedicalRecord.findAll({
            where: { patientId },
            include: [
              {
                model: User,
                as: 'doctor',
                attributes: ['id', 'surname', 'otherNames', 'role']
              }
            ],
            order: [['createdAt', 'DESC']],
            limit: 10 // Latest 10 records
          }),
          
          // Examinations with examiner info
          Examination.findAll({
            where: { patientId },
            include: [
              {
                model: User,
                as: 'examiner',
                attributes: ['id', 'surname', 'otherNames', 'role']
              }
            ],
            order: [['examinationDateTime', 'DESC']],
            limit: 10
          }),
          
          // Lab tests with results
          LabTest.findAll({
            where: { patientId },
            include: [
              {
                model: User,
                as: 'requestedBy',
                attributes: ['id', 'surname', 'otherNames']
              }
            ],
            order: [['createdAt', 'DESC']],
            limit: 20
          }),
          
          // Prescriptions with medications
          sequelize.query(`
            SELECT p.*, 
                   u."surname" AS "doctorSurname", 
                   u."otherNames" AS "doctorOtherNames",
                   COUNT(pm."MedicationId") as "medicationCount"
            FROM "Prescriptions" p
            LEFT JOIN "Users" u ON p."doctorId" = u."id"
            LEFT JOIN "PrescriptionMedications" pm ON p."id" = pm."prescriptionId"
            WHERE p."patientId" = :patientId
            GROUP BY p."id", u."surname", u."otherNames"
            ORDER BY p."createdAt" DESC
            LIMIT 10
          `, {
            replacements: { patientId },
            type: sequelize.QueryTypes.SELECT
          }),
          
          // Billing records
          Billing.findAll({
            where: { patientId },
            order: [['createdAt', 'DESC']],
            limit: 10
          }),
          
          // Triage assessments
          Triage.findAll({
            where: { patientId },
            include: [
              {
                model: User,
                as: 'NURSE',
                attributes: ['id', 'surname', 'otherNames']
              }
            ],
            order: [['assessmentDateTime', 'DESC']],
            limit: 5
          }),
          
          // Recent medication dispenses
          sequelize.query(`
            SELECT md.*, 
                   m."name" as "medicationName",
                   m."strength",
                   m."type",
                   u."surname" as "dispenserSurname",
                   u."otherNames" as "dispenserOtherNames"
            FROM medication_dispenses md
            LEFT JOIN "Medications" m ON md.medication_id = m."id"
            LEFT JOIN "Users" u ON md.dispensed_by = u."id"
            WHERE md.patient_id = :patientId
            ORDER BY md.dispensed_at DESC
            LIMIT 15
          `, {
            replacements: { patientId },
            type: sequelize.QueryTypes.SELECT
          })
        ]);
        log('Parallel data fetch completed', { duration: Date.now() - parallelStart });
        
        // Get latest completed CCP followup and next scheduled followup
        const [latestFollowup, nextFollowup] = await Promise.all([
          CCP.findOne({
            where: { 
              patientId,
              isFollowupCompleted: true
            },
            order: [['actualFollowupDate', 'DESC']]
          }),
          CCP.findOne({
            where: { 
              patientId,
              nextFollowupDate: { [Op.ne]: null }
            },
            order: [['createdAt', 'DESC']]
          })
        ]);
        
        log('CCP followup queries result', { 
          latestFollowup: latestFollowup ? {
            id: latestFollowup.id,
            actualFollowupDate: latestFollowup.actualFollowupDate,
            isCompleted: latestFollowup.isFollowupCompleted
          } : null,
          nextFollowup: nextFollowup ? {
            id: nextFollowup.id,
            nextFollowupDate: nextFollowup.nextFollowupDate,
            isCompleted: nextFollowup.isFollowupCompleted
          } : null
        });
        
        // Calculate health metrics and trends
        const calculationsStart = Date.now();
        log('Starting calculations');
        const vitalTrends = this.calculateVitalTrends(examinations);
        const medicationCompliance = this.calculateMedicationCompliance(prescriptions, medicationDispenses);
        const careCoordination = this.analyzeCareCoordination(medicalRecords, examinations, labTests);
        const costAnalysis = this.calculateCostAnalysis(billingRecords);
        log('Calculations completed', { duration: Date.now() - calculationsStart });
        
        const profile = {
          personalInfo: {
            id: patient.id,
            patientNumber: patient.patientNumber,
            fullName: `${patient.surname} ${patient.otherNames}`,
            sex: patient.sex,
            dateOfBirth: patient.dateOfBirth,
            age: moment().diff(moment(patient.dateOfBirth), 'years'),
            nationality: patient.nationality,
            occupation: patient.occupation,
            nextOfKin:patient.nextOfKin,
            paymentScheme: patient.paymentScheme,
            lastVisit: latestFollowup ? 
              moment(latestFollowup.actualFollowupDate).format('MMMM Do YYYY') : 
              (medicalRecords.length > 0 ? 
                moment(medicalRecords[0].createdAt).format('MMMM Do YYYY') : 
                (billingRecords.length > 0 ? moment(billingRecords[0].createdAt).format('MMMM Do YYYY') : null)),
            lastFollowup: latestFollowup ? moment(latestFollowup.actualFollowupDate).format('MMMM Do YYYY') : null,
            
            contact: {
              telephone1: patient.telephone1,
              telephone2: patient.telephone2,
              email: patient.email,
              residence: patient.residence,
              town: patient.town
            }
          },
          
          ccpProgram: {
            enrollmentDate: patient.ccpEnrollmentDate,
            enrollmentDuration: moment().diff(moment(patient.ccpEnrollmentDate), 'months'),
            status: patient.status,
            isActive: patient.isActive
          },
          
          medicalHistory: {
            records: medicalRecords.map(record => ({
              id: record.id,
              date: moment(record.createdAt).format('MMMM Do YYYY'),
              doctor: `${record.doctor.surname} ${record.doctor.otherNames}`,
              complaints: record.complaints,
              diagnosis: record.diagnosis,
              notes: record.notes
            })),
            totalRecords: medicalRecords.length
          },
          
          examinations: {
            records: examinations.map(exam => ({
              id: exam.id,
              date: moment(exam.examinationDateTime).format('MMMM Do YYYY'),
              examiner: `${exam.examiner.surname} ${exam.examiner.otherNames}`,
              vitalSigns: exam.generalExamination,
              systemicExaminations: exam.systemicExaminations,
              procedures: exam.proceduresPerformed
            })),
            vitalTrends,
            totalExaminations: examinations.length
          },
          
          laboratory: {
            tests: labTests.map(test => ({
              id: test.id,
              testType: test.testType,
              status: test.status,
              requestDate: moment(test.createdAt).format('MMMM Do YYYY'),
              resultDate: test.resultDate ? moment(test.resultDate).format('MMMM Do YYYY') : null,
              results: test.results,
              isCritical: test.isCritical,
              requestedBy: `${test.requestedBy.surname} ${test.requestedBy.otherNames}`
            })),
            totalTests: labTests.length,
            pendingTests: labTests.filter(t => t.status === 'PENDING').length,
            completedTests: labTests.filter(t => t.status === 'COMPLETED').length
          },
          
          medications: {
            prescriptions: prescriptions.map(p => ({
              id: p.id,
              date: moment(p.createdAt).format('MMMM Do YYYY'),
              doctor: `${p.doctorSurname} ${p.doctorOtherNames}`,
              diagnosis: p.diagnosis,
              status: p.status,
              medicationCount: parseInt(p.medicationCount)
            })),
            dispenses: medicationDispenses.map(d => ({
              id: d.id,
              medicationName: d.medicationName,
              strength: d.strength,
              quantity: d.quantity,
              dispensedAt: moment(d.dispensed_at).format('MMMM Do YYYY'),
              dispenser: `${d.dispenserSurname} ${d.dispenserOtherNames}`,
              totalPrice: d.total_price
            })),
            compliance: medicationCompliance
          },
          
          triage: {
            assessments: triageAssessments.map(t => ({
              id: t.id,
              date: moment(t.assessmentDateTime).format('MMMM Do YYYY'),
              category: t.category,
              chiefComplaint: t.chiefComplaint,
              vitalSigns: t.vitalSigns,
              nurse: `${t.NURSE.surname} ${t.NURSE.otherNames}`
            })),
            totalAssessments: triageAssessments.length
          },
          
          billing: {
            records: billingRecords.map(b => ({
              id: b.id,
              date: moment(b.createdAt).format('MMMM Do YYYY'),
              totalAmount: b.totalAmount,
              paymentStatus: b.paymentStatus,
              paymentMethod: b.paymentMethod,
              items: b.items
            })),
            costAnalysis
          },
          
          careCoordination,
          
          summary: {
            totalVisits: medicalRecords.length + triageAssessments.length,
            totalPrescriptions: prescriptions.length,
            totalLabTests: labTests.length,
            totalBillingAmount: billingRecords.reduce((sum, b) => sum + parseFloat(b.totalAmount || 0), 0),
            lastVisit: latestFollowup ? 
              moment(latestFollowup.actualFollowupDate).format('MMMM Do YYYY') : 
              (medicalRecords.length > 0 ? 
                moment(medicalRecords[0].createdAt).format('MMMM Do YYYY') : 
                (billingRecords.length > 0 ? moment(billingRecords[0].createdAt).format('MMMM Do YYYY') : null)),
            nextFollowUp: nextFollowup ? moment(nextFollowup.nextFollowupDate).format('MMMM Do YYYY') : 
              this.calculateNextFollowUp(medicalRecords, prescriptions)
          }
        };
        
        log('CCP patient profile retrieved successfully', { 
          patientId, 
          totalDuration: Date.now() - startTime,
          recordCounts: {
            medicalRecords: medicalRecords.length,
            examinations: examinations.length,
            labTests: labTests.length,
            prescriptions: prescriptions.length,
            billingRecords: billingRecords.length,
            triageAssessments: triageAssessments.length,
            medicationDispenses: medicationDispenses.length
          }
        });
        
        res.json({
          success: true,
          profile
        });
        
      } catch (error) {
        log('Error fetching CCP patient profile', { patientId: req.params.patientId, error: error.message });
        next(error);
      }
    }
    
    // Create CCP followup record
async createCCPFollowup(req, res, next) {
  try {
    const { patientId } = req.params;
    const {
      nextFollowupDate,
      dueFollowupDate,
      followupFrequency,
      followupType = 'ROUTINE',
      followupMode = 'IN_PERSON',
      priority = 'NORMAL',
      followupFeedback,
      consultationFeedback,
      vitalSigns,
      symptomsAssessment,
      medicationCompliance,
      actionItems,
      referralsNeeded,
      labTestsOrdered,
      privateNotes,
      patientNotes,
      actualFollowupDate
    } = req.body;

    log('Creating CCP followup record', { patientId, requestData: req.body });

    // Verify patient is CCP enrolled
    const patient = await Patient.findOne({
      where: { id: patientId, isCCPEnrolled: true }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'CCP patient not found'
      });
    }

    // Determine followup month and year
    const followupDate = nextFollowupDate ? new Date(nextFollowupDate) : new Date();
    const followupMonth = followupDate.getMonth() + 1;
    const followupYear = followupDate.getFullYear();

    // Check if followup record already exists for this month/year
    const existingFollowup = await CCP.findOne({
      where: {
        patientId,
        followupMonth,
        followupYear
      }
    });

    if (existingFollowup) {
      return res.status(400).json({
        success: false,
        message: 'CCP followup record already exists for this month and year'
      });
    }

    // Handle followupDone field from request
    const { followupDone } = req.body;
    const isCompleted = followupDone === true;
    
    // Create new followup record
    const ccpFollowup = await CCP.create({
      patientId,
      nextFollowupDate,
      dueFollowupDate,
      followupFrequency,
      followupMonth,
      followupYear,
      followupType,
      followupMode,
      priority,
      followupFeedback,
      consultationFeedback,
      vitalSigns: vitalSigns || {},
      symptomsAssessment: symptomsAssessment || {},
      medicationCompliance,
      actionItems: actionItems || [],
      referralsNeeded: referralsNeeded || [],
      labTestsOrdered: labTestsOrdered || [],
      privateNotes,
      patientNotes,
      scheduledBy: req.user.id,
      isFollowupCompleted: isCompleted,
      actualFollowupDate: isCompleted ? (actualFollowupDate ? new Date(actualFollowupDate) : new Date()) : null,
      completedBy: isCompleted ? req.user.id : null,
      status: isCompleted ? 'COMPLETED' : 'SCHEDULED'
    });
    
    log('CCP followup created with data', { ccpFollowupId: ccpFollowup.id, savedData: ccpFollowup.dataValues });

    log('CCP followup record created successfully', { 
      ccpFollowupId: ccpFollowup.id, 
      patientId 
    });

    res.status(201).json({
      success: true,
      message: 'CCP followup record created successfully',
      followup: ccpFollowup
    });

  } catch (error) {
    log('Error creating CCP followup record', { 
      patientId: req.params.patientId, 
      error: error.message 
    });
    next(error);
  }
}

// Get CCP followup records for a patient
async getCCPFollowups(req, res, next) {
  try {
    const { patientId } = req.params;
    const { 
      year, 
      month, 
      status, 
      isCompleted, 
      limit = 20, 
      page = 1 
    } = req.query;

    log('Fetching CCP followups', { patientId, year, month, status });

    const whereClause = { patientId };

    if (year) whereClause.followupYear = parseInt(year);
    if (month) whereClause.followupMonth = parseInt(month);
    if (status) whereClause.status = status;
    if (isCompleted !== undefined) {
      whereClause.isFollowupCompleted = isCompleted === 'true';
    }

    const { count, rows: followups } = await CCP.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'patientNumber', 'surname', 'otherNames']
        },
        {
          model: User,
          as: 'scheduler',
          attributes: ['id', 'surname', 'otherNames', 'role']
        },
        {
          model: User,
          as: 'completedByUser',
          attributes: ['id', 'surname', 'otherNames', 'role']
        }
      ],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['nextFollowupDate', 'DESC']]
    });

    const formattedFollowups = followups.map(followup => ({
      id: followup.id,
      patient: {
        id: followup.patient.id,
        patientNumber: followup.patient.patientNumber,
        fullName: `${followup.patient.surname} ${followup.patient.otherNames}`
      },
      followupDetails: {
        nextFollowupDate: followup.nextFollowupDate ? 
          moment(followup.nextFollowupDate).format('MMMM Do YYYY') : null,
        dueFollowupDate: followup.dueFollowupDate ? 
          moment(followup.dueFollowupDate).format('MMMM Do YYYY') : null,
        actualFollowupDate: followup.actualFollowupDate ? 
          moment(followup.actualFollowupDate).format('MMMM Do YYYY') : null,
        frequency: followup.followupFrequency,
        type: followup.followupType,
        mode: followup.followupMode,
        priority: followup.priority,
        status: followup.status,
        isCompleted: followup.isFollowupCompleted,
        month: followup.followupMonth,
        year: followup.followupYear,
        daysUntilFollowup: followup.getDaysUntilFollowup(),
        isOverdue: followup.isOverdue()
      },
      feedback: {
        followupFeedback: followup.followupFeedback,
        consultationFeedback: followup.consultationFeedback,
        privateNotes: followup.privateNotes,
        patientNotes: followup.patientNotes
      },
      clinicalData: {
        vitalSigns: followup.vitalSigns,
        symptomsAssessment: followup.symptomsAssessment,
        medicationCompliance: followup.medicationCompliance,
        actionItems: followup.actionItems,
        referralsNeeded: followup.referralsNeeded,
        labTestsOrdered: followup.labTestsOrdered
      },
      staff: {
        scheduledBy: followup.scheduler ? 
          `${followup.scheduler.surname} ${followup.scheduler.otherNames}` : null,
        completedBy: followup.completedByUser ? 
          `${followup.completedByUser.surname} ${followup.completedByUser.otherNames}` : null
      },
      timing: {
        duration: followup.duration,
        createdAt: moment(followup.createdAt).format('MMMM Do YYYY, h:mm a'),
        updatedAt: moment(followup.updatedAt).format('MMMM Do YYYY, h:mm a')
      }
    }));

    res.json({
      success: true,
      count: formattedFollowups.length,
      total: count,
      pages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      followups: formattedFollowups
    });

  } catch (error) {
    log('Error fetching CCP followups', { 
      patientId: req.params.patientId, 
      error: error.message 
    });
    next(error);
  }
}

// Update CCP followup record
async updateCCPFollowup(req, res, next) {
  try {
    const { followupId } = req.params;
    const updateData = req.body;

    log('Updating CCP followup record', { followupId, updateData });

    const followup = await CCP.findByPk(followupId);

    if (!followup) {
      return res.status(404).json({
        success: false,
        message: 'CCP followup record not found'
      });
    }

    // If marking as completed, set completion details
    if (updateData.isFollowupCompleted && !followup.isFollowupCompleted) {
      updateData.actualFollowupDate = new Date();
      updateData.completedBy = req.user.id;
      updateData.status = 'COMPLETED';
    }

    // Update the followup record
    await followup.update(updateData);

    // Fetch updated record with associations
    const updatedFollowup = await CCP.findByPk(followupId, {
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'patientNumber', 'surname', 'otherNames']
        },
        {
          model: User,
          as: 'scheduler',
          attributes: ['id', 'surname', 'otherNames', 'role']
        },
        {
          model: User,
          as: 'completedByUser',
          attributes: ['id', 'surname', 'otherNames', 'role']
        }
      ]
    });

    log('CCP followup record updated successfully', { followupId, updatedData: updatedFollowup.dataValues });

    res.json({
      success: true,
      message: 'CCP followup record updated successfully',
      followup: updatedFollowup
    });

  } catch (error) {
    log('Error updating CCP followup record', { 
      followupId: req.params.followupId, 
      error: error.message 
    });
    next(error);
  }
}

// Complete CCP followup
async completeCCPFollowup(req, res, next) {
  try {
    const { followupId } = req.params;
    const {
      followupFeedback,
      consultationFeedback,
      vitalSigns,
      symptomsAssessment,
      medicationCompliance,
      actionItems,
      referralsNeeded,
      labTestsOrdered,
      duration,
      privateNotes,
      patientNotes
    } = req.body;

    log('Completing CCP followup', { followupId });

    const followup = await CCP.findByPk(followupId, {
      include: [{
        model: Patient,
        as: 'patient',
        attributes: ['id', 'patientNumber', 'surname', 'otherNames']
      }]
    });

    if (!followup) {
      return res.status(404).json({
        success: false,
        message: 'CCP followup record not found'
      });
    }

    if (followup.isFollowupCompleted) {
      return res.status(400).json({
        success: false,
        message: 'CCP followup is already completed'
      });
    }

    const completionDate = new Date();
    
    const completionData = {
      isFollowupCompleted: true,
      actualFollowupDate: completionDate,
      completedBy: req.user.id,
      status: 'COMPLETED',
      followupFeedback,
      consultationFeedback,
      vitalSigns: vitalSigns || followup.vitalSigns,
      symptomsAssessment: symptomsAssessment || followup.symptomsAssessment,
      medicationCompliance,
      actionItems: actionItems || followup.actionItems,
      referralsNeeded: referralsNeeded || followup.referralsNeeded,
      labTestsOrdered: labTestsOrdered || followup.labTestsOrdered,
      duration,
      privateNotes,
      patientNotes
    };
    
    log('Completing CCP followup with data', { followupId, completionData });
    
    // Update followup with completion data
    await followup.update(completionData);

    // Update patient's lastFollowup date
    await followup.patient.update({
      lastFollowup: completionDate
    });

    // Calculate and create next followup if needed
    const nextDate = followup.calculateNextFollowupDate();
    if (nextDate) {
      const nextMonth = nextDate.getMonth() + 1;
      const nextYear = nextDate.getFullYear();

      // Check if next followup already exists
      const existingNext = await CCP.findOne({
        where: {
          patientId: followup.patientId,
          followupMonth: nextMonth,
          followupYear: nextYear
        }
      });

      if (!existingNext) {
        await CCP.create({
          patientId: followup.patientId,
          nextFollowupDate: nextDate,
          followupFrequency: followup.followupFrequency,
          followupMonth: nextMonth,
          followupYear: nextYear,
          followupType: followup.followupType,
          followupMode: followup.followupMode,
          priority: followup.priority,
          scheduledBy: req.user.id,
          status: 'SCHEDULED'
        });
      }
    }

    log('CCP followup completed successfully', { 
      followupId, 
      patientId: followup.patientId 
    });

    res.json({
      success: true,
      message: 'CCP followup completed successfully',
      followup: await CCP.findByPk(followupId, {
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: ['id', 'patientNumber', 'surname', 'otherNames']
          },
          {
            model: User,
            as: 'completedByUser',
            attributes: ['id', 'surname', 'otherNames', 'role']
          }
        ]
      })
    });

  } catch (error) {
    log('Error completing CCP followup', { 
      followupId: req.params.followupId, 
      error: error.message 
    });
    next(error);
  }
}

// Get CCP followup dashboard
async getCCPFollowupDashboard(req, res, next) {
  try {
    const { month, year } = req.query;
    const currentDate = new Date();
    const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();

    log('Fetching CCP followup dashboard', { month: targetMonth, year: targetYear });

    // Parallel queries for dashboard metrics
    const [
      totalFollowups,
      completedFollowups,
      overdueFollowups,
      upcomingFollowups,
      followupsByStatus,
      followupsByPriority,
      recentCompletions
    ] = await Promise.all([
      // Total followups for the month
      CCP.count({
        where: {
          followupMonth: targetMonth,
          followupYear: targetYear
        }
      }),

      // Completed followups
      CCP.count({
        where: {
          followupMonth: targetMonth,
          followupYear: targetYear,
          isFollowupCompleted: true
        }
      }),

      // Overdue followups
      CCP.findAll({
        where: {
          followupMonth: targetMonth,
          followupYear: targetYear,
          isFollowupCompleted: false,
          nextFollowupDate: {
            [Op.lt]: currentDate
          }
        },
        include: [{
          model: Patient,
          as: 'patient',
          attributes: ['id', 'patientNumber', 'surname', 'otherNames', 'telephone1']
        }]
      }),

      // Upcoming followups (next 7 days)
      CCP.findAll({
        where: {
          nextFollowupDate: {
            [Op.between]: [
              currentDate,
              new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000)
            ]
          },
          isFollowupCompleted: false
        },
        include: [{
          model: Patient,
          as: 'patient',
          attributes: ['id', 'patientNumber', 'surname', 'otherNames', 'telephone1']
        }],
        order: [['nextFollowupDate', 'ASC']]
      }),

      // Followups by status
      sequelize.query(`
        SELECT status, COUNT(*) as count
        FROM "CCPs"
        WHERE "followupMonth" = :month AND "followupYear" = :year
        GROUP BY status
      `, {
        replacements: { month: targetMonth, year: targetYear },
        type: sequelize.QueryTypes.SELECT
      }),

      // Followups by priority
      sequelize.query(`
        SELECT priority, COUNT(*) as count
        FROM "CCPs"
        WHERE "followupMonth" = :month AND "followupYear" = :year
        GROUP BY priority
      `, {
        replacements: { month: targetMonth, year: targetYear },
        type: sequelize.QueryTypes.SELECT
      }),

      // Recent completions
      CCP.findAll({
        where: {
          isFollowupCompleted: true,
          actualFollowupDate: {
            [Op.gte]: new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000)
          }
        },
        include: [{
          model: Patient,
          as: 'patient',
          attributes: ['id', 'patientNumber', 'surname', 'otherNames']
        }],
        order: [['actualFollowupDate', 'DESC']],
        limit: 10
      })
    ]);

    const dashboard = {
      summary: {
        totalFollowups,
        completedFollowups,
        pendingFollowups: totalFollowups - completedFollowups,
        completionRate: totalFollowups > 0 ? 
          Math.round((completedFollowups / totalFollowups) * 100) : 0,
        overdueCount: overdueFollowups.length,
        upcomingCount: upcomingFollowups.length
      },

      overdueFollowups: overdueFollowups.map(f => ({
        id: f.id,
        patient: {
          id: f.patient.id,
          patientNumber: f.patient.patientNumber,
          fullName: `${f.patient.surname} ${f.patient.otherNames}`,
          contact: f.patient.telephone1
        },
        nextFollowupDate: moment(f.nextFollowupDate).format('MMMM Do YYYY'),
        daysOverdue: Math.abs(f.getDaysUntilFollowup()),
        priority: f.priority,
        followupType: f.followupType
      })),

      upcomingFollowups: upcomingFollowups.map(f => ({
        id: f.id,
        patient: {
          id: f.patient.id,
          patientNumber: f.patient.patientNumber,
          fullName: `${f.patient.surname} ${f.patient.otherNames}`,
          contact: f.patient.telephone1
        },
        nextFollowupDate: moment(f.nextFollowupDate).format('MMMM Do YYYY'),
        daysUntilFollowup: f.getDaysUntilFollowup(),
        priority: f.priority,
        followupType: f.followupType
      })),

      statusDistribution: followupsByStatus.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {}),

      priorityDistribution: followupsByPriority.reduce((acc, item) => {
        acc[item.priority] = parseInt(item.count);
        return acc;
      }, {}),

      recentCompletions: recentCompletions.map(f => ({
        id: f.id,
        patient: {
          id: f.patient.id,
          patientNumber: f.patient.patientNumber,
          fullName: `${f.patient.surname} ${f.patient.otherNames}`
        },
        completedDate: moment(f.actualFollowupDate).format('MMMM Do YYYY'),
        followupType: f.followupType,
        duration: f.duration
      }))
    };

    res.json({
      success: true,
      dashboard
    });

  } catch (error) {
    log('Error fetching CCP followup dashboard', { error: error.message });
    next(error);
  }
}

// Get overdue followups
async getOverdueCCPFollowups(req, res, next) {
  try {
    const { limit = 50, page = 1 } = req.query;
    const currentDate = new Date();

    log('Fetching overdue CCP followups');

    const { count, rows: overdueFollowups } = await CCP.findAndCountAll({
      where: {
        isFollowupCompleted: false,
        nextFollowupDate: {
          [Op.lt]: currentDate
        }
      },
      include: [{
        model: Patient,
        as: 'patient',
        attributes: ['id', 'patientNumber', 'surname', 'otherNames', 'telephone1', 'dateOfBirth']
      }],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['nextFollowupDate', 'ASC']]
    });

    const formattedOverdue = overdueFollowups.map(f => ({
      id: f.id,
      patient: {
        id: f.patient.id,
        patientNumber: f.patient.patientNumber,
        fullName: `${f.patient.surname} ${f.patient.otherNames}`,
        contact: f.patient.telephone1,
        age: moment().diff(moment(f.patient.dateOfBirth), 'years')
      },
      followupDetails: {
        nextFollowupDate: moment(f.nextFollowupDate).format('MMMM Do YYYY'),
        dueFollowupDate: f.dueFollowupDate ? 
          moment(f.dueFollowupDate).format('MMMM Do YYYY') : null,
        daysOverdue: Math.abs(f.getDaysUntilFollowup()),
        frequency: f.followupFrequency,
        type: f.followupType,
        mode: f.followupMode,
        priority: f.priority,
        status: f.status
      }
    }));

    res.json({
      success: true,
      count: formattedOverdue.length,
      total: count,
      pages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      overdueFollowups: formattedOverdue
    });

  } catch (error) {
    log('Error fetching overdue CCP followups', { error: error.message });
    next(error);
  }
}

    // Get medical history for CCP patient
    async getCCPMedicalHistory(req, res, next) {
      try {
        const { patientId } = req.params;
        const { startDate, endDate, limit = 20, page = 1 } = req.query;
        
        log('Fetching CCP medical history', { patientId, startDate, endDate });
        
        const whereClause = { patientId };
        
        if (startDate && endDate) {
          whereClause.createdAt = {
            [Op.between]: [new Date(startDate), new Date(endDate)]
          };
        }
        
        const { count, rows: records } = await MedicalRecord.findAndCountAll({
          where: whereClause,
          include: [
            {
              model: User,
              as: 'doctor',
              attributes: ['id', 'surname', 'otherNames', 'role']
            }
          ],
          limit: parseInt(limit),
          offset: (parseInt(page) - 1) * parseInt(limit),
          order: [['createdAt', 'DESC']]
        });
        
        const formattedRecords = records.map(record => ({
          id: record.id,
          date: moment(record.createdAt).format('MMMM Do YYYY, h:mm a'),
          doctor: {
            name: `${record.doctor.surname} ${record.doctor.otherNames}`,
            role: record.doctor.role
          },
          complaints: record.complaints,
          hpi: record.hpi,
          medicalHistory: record.medicalHistory,
          familySocialHistory: record.familySocialHistory,
          allergies: record.allergies,
          examinationNotes: record.examinationNotes,
          reviewOtherSystems: record.reviewOtherSystems,
          specialHistory: record.specialHistory,
          impressions: record.impressions,
          diagnosis: record.diagnosis,
          notes: record.notes,
          status: record.status
        }));
        
        res.json({
          success: true,
          count: formattedRecords.length,
          total: count,
          pages: Math.ceil(count / limit),
          currentPage: parseInt(page),
          records: formattedRecords
        });
        
      } catch (error) {
        log('Error fetching CCP medical history', { error: error.message });
        next(error);
      }
    }
  
    // Get vital trends for CCP patient
    async getCCPVitalTrends(req, res, next) {
      try {
        const { patientId } = req.params;
        const { startDate, endDate, metric } = req.query;
        
        log('Fetching CCP vital trends', { patientId, startDate, endDate, metric });
        
        const whereClause = { patientId };
        
        if (startDate && endDate) {
          whereClause.examinationDateTime = {
            [Op.between]: [new Date(startDate), new Date(endDate)]
          };
        } else {
          // Default to last 12 months
          whereClause.examinationDateTime = {
            [Op.gte]: moment().subtract(12, 'months').toDate()
          };
        }
        
        const examinations = await Examination.findAll({
          where: whereClause,
          attributes: ['id', 'examinationDateTime', 'generalExamination'],
          order: [['examinationDateTime', 'ASC']]
        });
        
        const trends = this.calculateDetailedVitalTrends(examinations, metric);
        
        res.json({
          success: true,
          trends
        });
        
      } catch (error) {
        log('Error fetching CCP vital trends', { error: error.message });
        next(error);
      }
    }
  
    // Get lab history for CCP patient
    async getCCPLabHistory(req, res, next) {
      try {
        const { patientId } = req.params;
        const { testType, status, startDate, endDate, limit = 20, page = 1 } = req.query;
        
        log('Fetching CCP lab history', { patientId, testType, status });
        
        const whereClause = { patientId };
        
        if (testType) whereClause.testType = testType;
        if (status) whereClause.status = status;
        
        if (startDate && endDate) {
          whereClause.createdAt = {
            [Op.between]: [new Date(startDate), new Date(endDate)]
          };
        }
        
        const { count, rows: tests } = await LabTest.findAndCountAll({
          where: whereClause,
          include: [
            {
              model: User,
              as: 'requestedBy',
              attributes: ['id', 'surname', 'otherNames']
            },
            {
              model: User,
              as: 'sampleCollector',
              attributes: ['id', 'surname', 'otherNames']
            }
          ],
          limit: parseInt(limit),
          offset: (parseInt(page) - 1) * parseInt(limit),
          order: [['createdAt', 'DESC']]
        });
        
        const formattedTests = tests.map(test => ({
          id: test.id,
          testType: test.testType,
          sampleId: test.sampleId,
          status: test.status,
          priority: test.priority,
          requestDate: moment(test.createdAt).format('MMMM Do YYYY'),
          sampleCollectionDate: test.sampleCollectionDate ? 
            moment(test.sampleCollectionDate).format('MMMM Do YYYY') : null,
          resultDate: test.resultDate ? 
            moment(test.resultDate).format('MMMM Do YYYY') : null,
          results: test.results,
          referenceRange: test.referenceRange,
          isCritical: test.isCritical,
          notes: test.notes,
          requestedBy: test.requestedBy ? 
            `${test.requestedBy.surname} ${test.requestedBy.otherNames}` : null,
          sampleCollector: test.sampleCollector ? 
            `${test.sampleCollector.surname} ${test.sampleCollector.otherNames}` : null
        }));
        
        // Calculate lab trends
        const labTrends = this.calculateLabTrends(tests);
        
        res.json({
          success: true,
          count: formattedTests.length,
          total: count,
          pages: Math.ceil(count / limit),
          currentPage: parseInt(page),
          tests: formattedTests,
          trends: labTrends
        });
        
      } catch (error) {
        log('Error fetching CCP lab history', { error: error.message });
        next(error);
      }
    }
  
    // Get current medications for CCP patient
    async getCCPCurrentMedications(req, res, next) {
      try {
        const { patientId } = req.params;
        
        log('Fetching CCP current medications', { patientId });
        
        // Get active prescriptions with medications
        const activePrescriptions = await sequelize.query(`
          SELECT p.*, 
                 u."surname" AS "doctorSurname", 
                 u."otherNames" AS "doctorOtherNames",
                 m."id" as "medicationId",
                 m."name" as "medicationName",
                 m."genericName",
                 m."strength",
                 m."type",
                 m."unitPrice",
                 pm."quantity",
                 pm."specialInstructions"
          FROM "Prescriptions" p
          LEFT JOIN "Users" u ON p."doctorId" = u."id"
          LEFT JOIN "PrescriptionMedications" pm ON p."id" = pm."prescriptionId"
          LEFT JOIN "Medications" m ON pm."MedicationId" = m."id"
          WHERE p."patientId" = :patientId 
          AND p.status = 'active'
          AND p."validUntil" > NOW()
          ORDER BY p."createdAt" DESC
        `, {
          replacements: { patientId },
          type: sequelize.QueryTypes.SELECT
        });
        
        // Get recent dispenses
        const recentDispenses = await sequelize.query(`
          SELECT md.*, 
                 m."name" as "medicationName",
                 m."strength",
                 m."type",
                 p."diagnosis"
          FROM medication_dispenses md
          LEFT JOIN "Medications" m ON md.medication_id = m."id"
          LEFT JOIN "Prescriptions" p ON md.prescription_id = p."id"
          WHERE md.patient_id = :patientId
          AND md.dispensed_at >= NOW() - INTERVAL '6 months'
          ORDER BY md.dispensed_at DESC
          LIMIT 20
        `, {
          replacements: { patientId },
          type: sequelize.QueryTypes.SELECT
        });
        
        // Group prescriptions by prescription ID
        const prescriptionMap = {};
        activePrescriptions.forEach(row => {
          if (!prescriptionMap[row.id]) {
            prescriptionMap[row.id] = {
              id: row.id,
              date: moment(row.createdAt).format('MMMM Do YYYY'),
              doctor: `${row.doctorSurname} ${row.doctorOtherNames}`,
              diagnosis: row.diagnosis,
              status: row.status,
              validUntil: moment(row.validUntil).format('MMMM Do YYYY'),
              medications: []
            };
          }
          
          if (row.medicationId) {
            prescriptionMap[row.id].medications.push({
              id: row.medicationId,
              name: row.medicationName,
              genericName: row.genericName,
              strength: row.strength,
              type: row.type,
              quantity: row.quantity,
              instructions: row.specialInstructions,
              unitPrice: row.unitPrice
            });
          }
        });
        
        const formattedPrescriptions = Object.values(prescriptionMap);
        
        const formattedDispenses = recentDispenses.map(dispense => ({
          id: dispense.id,
          medicationName: dispense.medicationName,
          strength: dispense.strength,
          type: dispense.type,
          quantity: dispense.quantity,
          dispensedAt: moment(dispense.dispensed_at).format('MMMM Do YYYY'),
          totalPrice: dispense.total_price,
          diagnosis: dispense.diagnosis
        }));
        
        // Calculate medication adherence
        const adherenceAnalysis = this.calculateMedicationAdherence(formattedPrescriptions, formattedDispenses);
        
        res.json({
          success: true,
          activePrescriptions: formattedPrescriptions,
          recentDispenses: formattedDispenses,
          adherenceAnalysis
        });
        
      } catch (error) {
        log('Error fetching CCP current medications', { error: error.message });
        next(error);
      }
    }
  
    // Get billing history for CCP patient
    async getCCPBillingHistory(req, res, next) {
      try {
        const { patientId } = req.params;
        const { startDate, endDate, paymentStatus, limit = 20, page = 1 } = req.query;
        
        log('Fetching CCP billing history', { patientId, paymentStatus });
        
        const whereClause = { patientId };
        
        if (paymentStatus) whereClause.paymentStatus = paymentStatus;
        
        if (startDate && endDate) {
          whereClause.createdAt = {
            [Op.between]: [new Date(startDate), new Date(endDate)]
          };
        }
        
        const { count, rows: billings } = await Billing.findAndCountAll({
          where: whereClause,
          limit: parseInt(limit),
          offset: (parseInt(page) - 1) * parseInt(limit),
          order: [['createdAt', 'DESC']]
        });
        
        const formattedBillings = billings.map(bill => ({
          id: bill.id,
          date: moment(bill.createdAt).format('MMMM Do YYYY'),
          billType: bill.billType,
          totalAmount: bill.totalAmount,
          paymentStatus: bill.paymentStatus,
          paymentMethod: bill.paymentMethod,
          paidAt: bill.paidAt ? moment(bill.paidAt).format('MMMM Do YYYY') : null,
          items: bill.items,
          notes: bill.notes
        }));
        
        // Calculate cost analysis
        const costAnalysis = this.calculateDetailedCostAnalysis(billings);
        
        res.json({
          success: true,
          count: formattedBillings.length,
          total: count,
          pages: Math.ceil(count / limit),
          currentPage: parseInt(page),
          billings: formattedBillings,
          costAnalysis
        });
        
      } catch (error) {
        log('Error fetching CCP billing history', { error: error.message });
        next(error);
      }
    }
  
    // Get CCP analytics and metrics
    async getCCPAnalytics(req, res, next) {
      try {
        const { startDate, endDate } = req.query;
        
        log('Fetching CCP analytics', { startDate, endDate });
        
        const dateFilter = startDate && endDate ? {
          createdAt: {
            [Op.between]: [new Date(startDate), new Date(endDate)]
          }
        } : {};
        
        // Parallel queries for performance
        const [
          totalCCPPatients,
          newEnrollments,
          activePatients,
          totalVisits,
          totalPrescriptions,
          totalLabTests,
          totalBilling,
          medicationCompliance,
          healthOutcomes
        ] = await Promise.all([
          // Total CCP patients
          Patient.count({ where: { isCCPEnrolled: true } }),
          
          // New enrollments in period
          Patient.count({
            where: {
              isCCPEnrolled: true,
              ccpEnrollmentDate: dateFilter.createdAt || { [Op.gte]: moment().subtract(1, 'month').toDate() }
            }
          }),
          
          // Active patients (visited in last 3 months)
          sequelize.query(`
            SELECT COUNT(DISTINCT p.id) as count
            FROM "Patients" p
            INNER JOIN "MedicalRecords" mr ON p.id = mr."patientId"
            WHERE p."isCCPEnrolled" = true
            AND mr."createdAt" >= NOW() - INTERVAL '3 months'
          `, { type: sequelize.QueryTypes.SELECT }),
          
          // Total visits
          MedicalRecord.count({
            include: [{
              model: Patient,
              where: { isCCPEnrolled: true },
              attributes: []
            }],
            where: dateFilter
          }),
          
          // Total prescriptions
       Prescription.count({
        include: [{
          model: User,
          as: 'PATIENT',
          where: { isCCPEnrolled: true },
          attributes: []
        }],
        where: dateFilter
      }),
      
      // Total lab tests
      LabTest.count({
        include: [{
          model: Patient,
          as: 'patient',
          where: { isCCPEnrolled: true },
          attributes: []
        }],
        where: dateFilter
      }),
      
      // Total billing amount
      sequelize.query(`
        SELECT COALESCE(SUM(CAST("totalAmount" AS DECIMAL)), 0) as total
        FROM "Billings" b
        INNER JOIN "Patients" p ON b."patientId" = p.id
        WHERE p."isCCPEnrolled" = true
        ${startDate && endDate ? `AND b."createdAt" BETWEEN '${startDate}' AND '${endDate}'` : ''}
      `, { type: sequelize.QueryTypes.SELECT }),
      
      // Medication compliance metrics
      this.calculatePopulationMedicationCompliance(dateFilter),
      
      // Health outcomes
      this.calculateHealthOutcomes(dateFilter)
    ]);
    
    // Age and gender distribution
    const demographics = await sequelize.query(`
      SELECT 
        sex,
        CASE 
          WHEN EXTRACT(YEAR FROM AGE("dateOfBirth")) < 18 THEN 'Under 18'
          WHEN EXTRACT(YEAR FROM AGE("dateOfBirth")) BETWEEN 18 AND 30 THEN '18-30'
          WHEN EXTRACT(YEAR FROM AGE("dateOfBirth")) BETWEEN 31 AND 50 THEN '31-50'
          WHEN EXTRACT(YEAR FROM AGE("dateOfBirth")) BETWEEN 51 AND 70 THEN '51-70'
          ELSE 'Over 70'
        END as age_group,
        COUNT(*) as count
      FROM "Patients"
      WHERE "isCCPEnrolled" = true
      GROUP BY sex, age_group
      ORDER BY sex, age_group
    `, { type: sequelize.QueryTypes.SELECT });
    
    // Top conditions/diagnoses
    const topConditions = await sequelize.query(`
      SELECT 
        diagnosis,
        COUNT(*) as frequency
      FROM "MedicalRecords" mr
      INNER JOIN "Patients" p ON mr."patientId" = p.id
      WHERE p."isCCPEnrolled" = true
      ${startDate && endDate ? `AND mr."createdAt" BETWEEN '${startDate}' AND '${endDate}'` : ''}
      GROUP BY diagnosis
      ORDER BY frequency DESC
      LIMIT 10
    `, { type: sequelize.QueryTypes.SELECT });
    
    // Monthly enrollment trends
    const enrollmentTrends = await sequelize.query(`
      SELECT 
        DATE_TRUNC('month', "ccpEnrollmentDate") as month,
        COUNT(*) as enrollments
      FROM "Patients"
      WHERE "isCCPEnrolled" = true
      AND "ccpEnrollmentDate" >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', "ccpEnrollmentDate")
      ORDER BY month
    `, { type: sequelize.QueryTypes.SELECT });
    
    const analytics = {
      summary: {
        totalCCPPatients,
        newEnrollments,
        activePatients: parseInt(activePatients[0].count),
        totalVisits,
        totalPrescriptions,
        totalLabTests,
        totalBillingAmount: parseFloat(totalBilling[0].total),
        averageCostPerPatient: totalCCPPatients > 0 ? 
          parseFloat(totalBilling[0].total) / totalCCPPatients : 0
      },
      
      demographics: {
        byGender: demographics.reduce((acc, item) => {
          acc[item.sex] = (acc[item.sex] || 0) + parseInt(item.count);
          return acc;
        }, {}),
        byAgeGroup: demographics.reduce((acc, item) => {
          if (!acc[item.age_group]) acc[item.age_group] = {};
          acc[item.age_group][item.sex] = parseInt(item.count);
          return acc;
        }, {})
      },
      
      clinicalMetrics: {
        topConditions: topConditions.map(c => ({
          diagnosis: c.diagnosis,
          frequency: parseInt(c.frequency)
        })),
        medicationCompliance,
        healthOutcomes
      },
      
      trends: {
        enrollments: enrollmentTrends.map(t => ({
          month: moment(t.month).format('MMM YYYY'),
          count: parseInt(t.enrollments)
        }))
      },
      
      utilization: {
        averageVisitsPerPatient: totalCCPPatients > 0 ? totalVisits / totalCCPPatients : 0,
        averagePrescriptionsPerPatient: totalCCPPatients > 0 ? totalPrescriptions / totalCCPPatients : 0,
        averageLabTestsPerPatient: totalCCPPatients > 0 ? totalLabTests / totalCCPPatients : 0
      }
    };
    
    log('CCP analytics retrieved successfully');
    
    res.json({
      success: true,
      analytics
    });
    
  } catch (error) {
    log('Error fetching CCP analytics', { error: error.message });
    next(error);
  }
}

// Get follow-up schedule for CCP patient
async getCCPFollowUpSchedule(req, res, next) {
  try {
    const { patientId } = req.params;
    
    log('Fetching CCP follow-up schedule', { patientId });
    
    // Get upcoming appointments, prescription renewals, and lab follow-ups
    const [upcomingAppointments, prescriptionRenewals, labFollowUps] = await Promise.all([
      // Future appointments (if you have an Appointment model)
      sequelize.query(`
        SELECT * FROM "Appointments"
        WHERE "patientId" = :patientId
        AND "dateTime" > NOW()
        ORDER BY "dateTime" ASC
        LIMIT 10
      `, {
        replacements: { patientId },
        type: sequelize.QueryTypes.SELECT
      }).catch(() => []),
      
      // Prescriptions expiring soon
      sequelize.query(`
        SELECT p.*, 
               u."surname" || ' ' || u."otherNames" as doctor_name
        FROM "Prescriptions" p
        LEFT JOIN "Users" u ON p."doctorId" = u.id
        WHERE p."patientId" = :patientId
        AND p.status = 'active'
        AND p."validUntil" BETWEEN NOW() AND NOW() + INTERVAL '30 days'
        ORDER BY p."validUntil" ASC
      `, {
        replacements: { patientId },
        type: sequelize.QueryTypes.SELECT
      }),
      
      // Lab tests requiring follow-up
      LabTest.findAll({
        where: {
          patientId,
          status: 'COMPLETED',
          isCritical: true,
          createdAt: { [Op.gte]: moment().subtract(1, 'month').toDate() }
        },
        order: [['resultDate', 'DESC']],
        limit: 5
      })
    ]);
    
    const followUpSchedule = {
      upcomingAppointments: upcomingAppointments.map(apt => ({
        id: apt.id,
        date: moment(apt.dateTime).format('MMMM Do YYYY, h:mm a'),
        type: apt.type,
        status: apt.status,
        notes: apt.notes
      })),
      
      prescriptionRenewals: prescriptionRenewals.map(p => ({
        id: p.id,
        diagnosis: p.diagnosis,
        doctor: p.doctor_name,
        expiryDate: moment(p.validUntil).format('MMMM Do YYYY'),
        daysUntilExpiry: moment(p.validUntil).diff(moment(), 'days'),
        urgency: moment(p.validUntil).diff(moment(), 'days') <= 7 ? 'HIGH' : 'MEDIUM'
      })),
      
      labFollowUps: labFollowUps.map(test => ({
        id: test.id,
        testType: test.testType,
        resultDate: moment(test.resultDate).format('MMMM Do YYYY'),
        isCritical: test.isCritical,
        results: test.results,
        recommendedFollowUp: this.getRecommendedFollowUp(test)
      }))
    };
    
    res.json({
      success: true,
      followUpSchedule
    });
    
  } catch (error) {
    log('Error fetching CCP follow-up schedule', { error: error.message });
    next(error);
  }
}

// Generate CCP comprehensive report
async generateCCPReport(req, res, next) {
  try {
    const { patientId } = req.params;
    const { startDate, endDate, includeVitals = true, includeLabs = true, includeMedications = true } = req.query;
    
    log('Generating CCP comprehensive report', { patientId, startDate, endDate });
    
    const dateFilter = startDate && endDate ? {
      [Op.between]: [new Date(startDate), new Date(endDate)]
    } : {
      [Op.gte]: moment().subtract(12, 'months').toDate()
    };
    
    // Get patient info
    const patient = await Patient.findOne({
      where: { id: patientId, isCCPEnrolled: true },
      attributes: { exclude: ['password', 'resetPasswordToken', 'emailVerificationToken'] }
    });
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'CCP patient not found'
      });
    }
    
    const reportData = {
      patient: {
        id: patient.id,
        patientNumber: patient.patientNumber,
        fullName: `${patient.surname} ${patient.otherNames}`,
        sex: patient.sex,
        age: moment().diff(moment(patient.dateOfBirth), 'years'),
        enrollmentDate: patient.ccpEnrollmentDate,
        enrollmentDuration: moment().diff(moment(patient.ccpEnrollmentDate), 'months')
      },
      
      reportPeriod: {
        startDate: startDate || moment().subtract(12, 'months').format('YYYY-MM-DD'),
        endDate: endDate || moment().format('YYYY-MM-DD')
      }
    };
    
    // Medical records
    const medicalRecords = await MedicalRecord.findAll({
      where: {
        patientId,
        createdAt: dateFilter
      },
      include: [
        {
          model: User,
          as: 'doctor',
          attributes: ['surname', 'otherNames']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    reportData.medicalHistory = {
      totalRecords: medicalRecords.length,
      records: medicalRecords.map(record => ({
        date: moment(record.createdAt).format('MMMM Do YYYY'),
        doctor: `${record.doctor.surname} ${record.doctor.otherNames}`,
        complaints: record.complaints,
        diagnosis: record.diagnosis,
        notes: record.notes
      }))
    };
    
    // Vital signs if requested
    if (includeVitals === 'true') {
      const examinations = await Examination.findAll({
        where: {
          patientId,
          examinationDateTime: dateFilter
        },
        order: [['examinationDateTime', 'ASC']]
      });
      
      reportData.vitalSigns = {
        totalExaminations: examinations.length,
        trends: this.calculateDetailedVitalTrends(examinations),
        latestVitals: examinations.length > 0 ? examinations[examinations.length - 1].generalExamination : null
      };
    }
    
    // Lab results if requested
    if (includeLabs === 'true') {
      const labTests = await LabTest.findAll({
        where: {
          patientId,
          createdAt: dateFilter
        },
        order: [['createdAt', 'DESC']]
      });
      
      reportData.laboratory = {
        totalTests: labTests.length,
        completedTests: labTests.filter(t => t.status === 'COMPLETED').length,
        criticalResults: labTests.filter(t => t.isCritical).length,
        tests: labTests.map(test => ({
          testType: test.testType,
          date: moment(test.createdAt).format('MMMM Do YYYY'),
          status: test.status,
          results: test.results,
          isCritical: test.isCritical
        }))
      };
    }
    
    // Medications if requested
    if (includeMedications === 'true') {
      const prescriptions = await sequelize.query(`
        SELECT p.*, 
               u."surname" || ' ' || u."otherNames" as doctor_name,
               COUNT(pm."MedicationId") as medication_count
        FROM "Prescriptions" p
        LEFT JOIN "Users" u ON p."doctorId" = u.id
        LEFT JOIN "PrescriptionMedications" pm ON p.id = pm."prescriptionId"
        WHERE p."patientId" = :patientId
        AND p."createdAt" BETWEEN :startDate AND :endDate
        GROUP BY p.id, u."surname", u."otherNames"
        ORDER BY p."createdAt" DESC
      `, {
        replacements: { 
          patientId, 
          startDate: reportData.reportPeriod.startDate, 
          endDate: reportData.reportPeriod.endDate 
        },
        type: sequelize.QueryTypes.SELECT
      });
      
      reportData.medications = {
        totalPrescriptions: prescriptions.length,
        prescriptions: prescriptions.map(p => ({
          date: moment(p.createdAt).format('MMMM Do YYYY'),
          doctor: p.doctor_name,
          diagnosis: p.diagnosis,
          medicationCount: parseInt(p.medication_count),
          status: p.status
        }))
      };
    }
    
    // Care summary
    reportData.careSummary = {
      totalVisits: medicalRecords.length,
      uniqueDoctors: [...new Set(medicalRecords.map(r => `${r.doctor.surname} ${r.doctor.otherNames}`))].length,
      commonDiagnoses: this.getCommonDiagnoses(medicalRecords),
      careQualityMetrics: this.calculateCareQualityMetrics(reportData)
    };
    
    log('CCP comprehensive report generated successfully', { patientId });
    
    res.json({
      success: true,
      report: reportData
    });
    
  } catch (error) {
    log('Error generating CCP comprehensive report', { error: error.message });
    next(error);
  }
}

// Helper methods for calculations

calculateVitalTrends(examinations) {
  if (!examinations || examinations.length === 0) return {};
  
  const trends = {
    bloodPressure: [],
    weight: [],
    temperature: [],
    heartRate: []
  };
  
  examinations.forEach(exam => {
    const vitals = exam.generalExamination;
    const date = moment(exam.examinationDateTime).format('YYYY-MM-DD');
    
    if (vitals.bloodPressure) {
      trends.bloodPressure.push({
        date,
        systolic: vitals.bloodPressure.systolic || vitals.bloodPressure,
        diastolic: vitals.bloodPressure.diastolic
      });
    }
    
    if (vitals.weight) {
      trends.weight.push({ date, value: vitals.weight });
    }
    
    if (vitals.temperature) {
      trends.temperature.push({ date, value: vitals.temperature });
    }
    
    if (vitals.pulseRate) {
      trends.heartRate.push({ date, value: vitals.pulseRate });
    }
  });
  
  return trends;
}

calculateDetailedVitalTrends(examinations, specificMetric = null) {
  if (!examinations || examinations.length === 0) return {};
  
  const allTrends = {
    bloodPressure: { data: [], average: null, trend: 'stable' },
    weight: { data: [], average: null, trend: 'stable' },
    temperature: { data: [], average: null, trend: 'stable' },
    heartRate: { data: [], average: null, trend: 'stable' },
    bmi: { data: [], average: null, trend: 'stable' },
    oxygenSaturation: { data: [], average: null, trend: 'stable' }
  };
  
  examinations.forEach(exam => {
    const vitals = exam.generalExamination;
    const date = moment(exam.examinationDateTime).format('YYYY-MM-DD');
    
    // Blood pressure
    if (vitals.bloodPressure) {
      const systolic = vitals.bloodPressure.systolic || vitals.bloodPressure;
      const diastolic = vitals.bloodPressure.diastolic;
      allTrends.bloodPressure.data.push({ date, systolic, diastolic });
    }
    
    // Weight
    if (vitals.weight) {
      allTrends.weight.data.push({ date, value: vitals.weight });
    }
    
    // Temperature
    if (vitals.temperature) {
      allTrends.temperature.data.push({ date, value: vitals.temperature });
    }
    
    // Heart rate
    if (vitals.pulseRate) {
      allTrends.heartRate.data.push({ date, value: vitals.pulseRate });
    }
    
    // BMI
    if (vitals.bmi) {
      allTrends.bmi.data.push({ date, value: vitals.bmi });
    }
    
    // Oxygen saturation
    if (vitals.spo2) {
      allTrends.oxygenSaturation.data.push({ date, value: vitals.spo2 });
    }
  });
  
  // Calculate averages and trends
  Object.keys(allTrends).forEach(metric => {
    const data = allTrends[metric].data;
    if (data.length > 0) {
      if (metric === 'bloodPressure') {
        const systolicValues = data.map(d => d.systolic).filter(v => v);
        const diastolicValues = data.map(d => d.diastolic).filter(v => v);
        allTrends[metric].average = {
          systolic: systolicValues.length > 0 ? 
            Math.round(systolicValues.reduce((a, b) => a + b, 0) / systolicValues.length) : null,
          diastolic: diastolicValues.length > 0 ? 
            Math.round(diastolicValues.reduce((a, b) => a + b, 0) / diastolicValues.length) : null
        };
      } else {
        const values = data.map(d => d.value).filter(v => v);
        if (values.length > 0) {
          allTrends[metric].average = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
          
          // Calculate trend (simple linear regression)
          if (values.length >= 3) {
            const firstHalf = values.slice(0, Math.floor(values.length / 2));
            const secondHalf = values.slice(Math.floor(values.length / 2));
            const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
            const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
            
            const difference = secondAvg - firstAvg;
            const threshold = firstAvg * 0.05; // 5% threshold
            
            if (Math.abs(difference) < threshold) {
              allTrends[metric].trend = 'stable';
            } else if (difference > 0) {
              allTrends[metric].trend = 'increasing';
            } else {
              allTrends[metric].trend = 'decreasing';
            }
          }
        }
      }
    }
  });
  
  return specificMetric ? allTrends[specificMetric] : allTrends;
}

calculateLabTrends(tests) {
  const testsByType = {};
  
  tests.forEach(test => {
    if (test.results && test.status === 'COMPLETED') {
      if (!testsByType[test.testType]) {
        testsByType[test.testType] = [];
      }
      testsByType[test.testType].push({
        date: moment(test.resultDate || test.createdAt).format('YYYY-MM-DD'),
        results: test.results,
        isCritical: test.isCritical
      });
    }
  });
  
  return testsByType;
}

calculateMedicationCompliance(prescriptions, dispenses) {
  if (!prescriptions || prescriptions.length === 0) {
    return { overall: 0, details: [] };
  }
  
  const compliance = {
    totalPrescriptions: prescriptions.length,
    activePrescriptions: prescriptions.filter(p => p.status === 'active').length,
    dispensedMedications: dispenses ? dispenses.length : 0,
    overall: 0,
    details: []
  };
  
  // Simple compliance calculation based on dispense vs prescription ratio
  if (compliance.activePrescriptions > 0) {
    compliance.overall = Math.min(100, Math.round((compliance.dispensedMedications / compliance.activePrescriptions) * 100));
  }
  
  return compliance;
}

calculateMedicationAdherence(prescriptions, dispenses) {
  const adherence = {
    overallScore: 0,
    prescriptionsAnalyzed: prescriptions.length,
    dispensesTracked: dispenses.length,
    adherenceByMedication: []
  };
  
  // Calculate overall adherence score
  if (prescriptions.length > 0) {
    const expectedDispenses = prescriptions.reduce((sum, p) => sum + p.medications.length, 0);
    const actualDispenses = dispenses.length;
    adherence.overallScore = Math.min(100, Math.round((actualDispenses / Math.max(expectedDispenses, 1)) * 100));
  }
  
  return adherence;
}

async calculatePopulationMedicationCompliance(dateFilter) {
  try {
    const complianceData = await sequelize.query(`
      SELECT 
        COUNT(DISTINCT p."patientId") as total_patients,
        COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p."patientId" END) as active_patients,
        COUNT(p.id) as total_prescriptions,
        COUNT(CASE WHEN p.status = 'completed' THEN p.id END) as completed_prescriptions
      FROM "Prescriptions" p
      INNER JOIN "Patients" pt ON p."patientId" = pt.id
      WHERE pt."isCCPEnrolled" = true
      ${dateFilter.createdAt ? `AND p."createdAt" BETWEEN '${moment(dateFilter.createdAt[Op.gte]).format('YYYY-MM-DD')}' AND '${moment().format('YYYY-MM-DD')}'` : ''}
    `, { type: sequelize.QueryTypes.SELECT });
    
    const data = complianceData[0];
    return {
      totalPatients: parseInt(data.total_patients || 0),
      activePatients: parseInt(data.active_patients || 0),
      totalPrescriptions: parseInt(data.total_prescriptions || 0),
      completedPrescriptions: parseInt(data.completed_prescriptions || 0),
      complianceRate: data.total_prescriptions > 0 ? 
        Math.round((data.completed_prescriptions / data.total_prescriptions) * 100) : 0
    };
  } catch (error) {
    log('Error calculating population medication compliance', { error: error.message });
    return { totalPatients: 0, activePatients: 0, totalPrescriptions: 0, completedPrescriptions: 0, complianceRate: 0 };
  }
}

async calculateHealthOutcomes(dateFilter) {
  try {
    // Calculate various health outcome metrics
    const outcomes = await sequelize.query(`
      SELECT 
        COUNT(DISTINCT mr."patientId") as patients_with_visits,
        AVG(CASE WHEN mr.diagnosis ILIKE '%hypertension%' THEN 1 ELSE 0 END) as hypertension_rate,
        AVG(CASE WHEN mr.diagnosis ILIKE '%diabetes%' THEN 1 ELSE 0 END) as diabetes_rate,
        COUNT(CASE WHEN mr.diagnosis ILIKE '%emergency%' OR mr.diagnosis ILIKE '%urgent%' THEN 1 END) as emergency_visits
      FROM "MedicalRecords" mr
      INNER JOIN "Patients" p ON mr."patientId" = p.id
      WHERE p."isCCPEnrolled" = true
      ${dateFilter.createdAt ? `AND mr."createdAt" BETWEEN '${moment(dateFilter.createdAt[Op.gte]).format('YYYY-MM-DD')}' AND '${moment().format('YYYY-MM-DD')}'` : ''}
    `, { type: sequelize.QueryTypes.SELECT });
    
    const data = outcomes[0];
    return {
      patientsWithVisits: parseInt(data.patients_with_visits || 0),
      hypertensionRate: Math.round((parseFloat(data.hypertension_rate || 0)) * 100),
      diabetesRate: Math.round((parseFloat(data.diabetes_rate || 0)) * 100),
      emergencyVisits: parseInt(data.emergency_visits || 0)
    };
  } catch (error) {
    log('Error calculating health outcomes', { error: error.message });
    return { patientsWithVisits: 0, hypertensionRate: 0, diabetesRate: 0, emergencyVisits: 0 };
  }
}

analyzeCareCoordination(medicalRecords, examinations, labTests) {
  const coordination = {
    uniqueDoctors: new Set(),
    totalInteractions: 0,
    lastInteraction: null,
    careTeam: []
  };
  
  // Analyze medical records
  medicalRecords.forEach(record => {
    if (record.doctor) {
      const doctorName = `${record.doctor.surname} ${record.doctor.otherNames}`;
      coordination.uniqueDoctors.add(doctorName);
      coordination.totalInteractions++;
      
      if (!coordination.lastInteraction || record.createdAt > coordination.lastInteraction) {
        coordination.lastInteraction = record.createdAt;
      }
    }
  });
  
  // Analyze examinations
  examinations.forEach(exam => {
    if (exam.examiner) {
      const examinerName = `${exam.examiner.surname} ${exam.examiner.otherNames}`;
      coordination.uniqueDoctors.add(examinerName);
      coordination.totalInteractions++;
    }
  });
  
  coordination.careTeam = Array.from(coordination.uniqueDoctors);
  coordination.uniqueDoctors = coordination.uniqueDoctors.size;
  
  return coordination;
}

calculateCostAnalysis(billingRecords) {
  const analysis = {
    totalAmount: 0,
    averagePerVisit: 0,
    paymentMethods: {},
    monthlyTrends: {}
  };
  
  billingRecords.forEach(bill => {
    const amount = parseFloat(bill.totalAmount || 0);
    analysis.totalAmount += amount;
    
    // Payment methods
    if (!analysis.paymentMethods[bill.paymentMethod]) {
      analysis.paymentMethods[bill.paymentMethod] = 0;
    }
    analysis.paymentMethods[bill.paymentMethod] += amount;
    
    // Monthly trends
    const month = moment(bill.createdAt).format('YYYY-MM');
    if (!analysis.monthlyTrends[month]) {
      analysis.monthlyTrends[month] = 0;
    }
    analysis.monthlyTrends[month] += amount;
  });
  
  analysis.averagePerVisit = billingRecords.length > 0 ? 
    Math.round((analysis.totalAmount / billingRecords.length) * 100) / 100 : 0;
  
  return analysis;
}

calculateDetailedCostAnalysis(billings) {
  const analysis = {
    totalBilled: 0,
    totalPaid: 0,
    pendingAmount: 0,
    byServiceType: {},
    byPaymentMethod: {},
    costPerVisit: 0,
    savingsFromProgram: 0
  };
  
  billings.forEach(bill => {
    const amount = parseFloat(bill.totalAmount || 0);
    analysis.totalBilled += amount;
    
    if (bill.paymentStatus === 'PAID') {
      analysis.totalPaid += amount;
    } else {
      analysis.pendingAmount += amount;
    }
    
    // Group by service type
    if (!analysis.byServiceType[bill.billType]) {
      analysis.byServiceType[bill.billType] = 0;
    }
    analysis.byServiceType[bill.billType] += amount;
    
    // Group by payment method
    if (!analysis.byPaymentMethod[bill.paymentMethod]) {
      analysis.byPaymentMethod[bill.paymentMethod] = 0;
    }
    analysis.byPaymentMethod[bill.paymentMethod] += amount;
  });
  
  analysis.costPerVisit = billings.length > 0 ? 
    Math.round((analysis.totalBilled / billings.length) * 100) / 100 : 0;
  
  // Estimate savings (assuming 20% discount for CCP patients)
  analysis.savingsFromProgram = Math.round(analysis.totalBilled * 0.2 * 100) / 100;
  
  return analysis;
}

calculateNextFollowUp(medicalRecords, prescriptions) {
  let nextFollowUp = null;
  
  // Check prescription expiry dates
  prescriptions.forEach(prescription => {
    if (prescription.status === 'active') {
      const expiryDate = moment(prescription.validUntil);
      if (!nextFollowUp || expiryDate.isBefore(nextFollowUp)) {
        nextFollowUp = expiryDate;
      }
    }
  });
  
  // If no prescription follow-up, suggest based on last visit
  if (!nextFollowUp && medicalRecords.length > 0) {
    const lastVisit = moment(medicalRecords[0].createdAt);
    nextFollowUp = lastVisit.clone().add(3, 'months'); // Suggest follow-up in 3 months
   }
   
   return nextFollowUp ? nextFollowUp.format('MMMM Do YYYY') : null;
 }

 getRecommendedFollowUp(labTest) {
   if (labTest.isCritical) {
     return 'Immediate follow-up required';
   }
   
   // Based on test type, suggest follow-up timeframe
   const followUpMap = {
     'BLOOD_GLUCOSE': '3 months',
     'HBA1C': '3-6 months',
     'LIPID_PROFILE': '6 months',
     'KIDNEY_FUNCTION': '6 months',
     'LIVER_FUNCTION': '6 months',
     'THYROID_FUNCTION': '12 months'
   };
   
   return followUpMap[labTest.testType] || '6 months';
 }

 getCommonDiagnoses(medicalRecords) {
   const diagnosisCount = {};
   
   medicalRecords.forEach(record => {
     if (record.diagnosis) {
       const diagnosis = record.diagnosis.toLowerCase().trim();
       diagnosisCount[diagnosis] = (diagnosisCount[diagnosis] || 0) + 1;
     }
   });
   
   return Object.entries(diagnosisCount)
     .sort(([,a], [,b]) => b - a)
     .slice(0, 5)
     .map(([diagnosis, count]) => ({ diagnosis, count }));
 }

 calculateCareQualityMetrics(reportData) {
   const metrics = {
     continuityOfCare: 0,
     preventiveCareScore: 0,
     medicationManagement: 0,
     overallQualityScore: 0
   };
   
   // Continuity of Care (based on regular visits)
   if (reportData.medicalHistory && reportData.medicalHistory.totalRecords > 0) {
     const monthsInProgram = moment().diff(moment(reportData.patient.enrollmentDate), 'months');
     const visitsPerMonth = reportData.medicalHistory.totalRecords / Math.max(monthsInProgram, 1);
     metrics.continuityOfCare = Math.min(100, Math.round(visitsPerMonth * 50)); // Assuming 2 visits per month is ideal
   }
   
   // Preventive Care (based on lab tests and examinations)
   if (reportData.laboratory && reportData.vitalSigns) {
     const preventiveScore = (reportData.laboratory.totalTests > 0 ? 50 : 0) + 
                            (reportData.vitalSigns.totalExaminations > 0 ? 50 : 0);
     metrics.preventiveCareScore = preventiveScore;
   }
   
   // Medication Management (based on prescription completion)
   if (reportData.medications && reportData.medications.totalPrescriptions > 0) {
     const completedPrescriptions = reportData.medications.prescriptions.filter(p => p.status === 'completed').length;
     metrics.medicationManagement = Math.round((completedPrescriptions / reportData.medications.totalPrescriptions) * 100);
   }
   
   // Overall Quality Score (average of all metrics)
   const scores = [metrics.continuityOfCare, metrics.preventiveCareScore, metrics.medicationManagement];
   const validScores = scores.filter(score => score > 0);
   metrics.overallQualityScore = validScores.length > 0 ? 
     Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0;
   
   return metrics;
 }
}

module.exports = CCPController;