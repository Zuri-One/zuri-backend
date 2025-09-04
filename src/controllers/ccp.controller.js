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
    const startTime = Date.now();
    log('Internal API: getCCPPatientsList called', { 
      query: req.query,
      userId: req.user?.id,
      userRole: req.user?.role
    });
    
    try {
      const { page = 1, limit = 50, search, status = 'active' } = req.query;
      
      log('Internal API: getCCPPatientsList parameters', { page, limit, search, status });
      
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
      
      log('Internal API: getCCPPatientsList success', { 
        totalCount: count, 
        returnedCount: formattedPatients.length,
        duration: Date.now() - startTime,
        hasImportedPatients: formattedPatients.some(p => p.patientNumber?.startsWith('ZH'))
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
      log('Internal API: getCCPPatientsList error', { 
        error: error.message, 
        stack: error.stack,
        duration: Date.now() - startTime,
        query: req.query
      });
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

  // Middleware for CCP token authentication
  static ccpTokenAuth = (req, res, next) => {
    const token = req.headers['x-ccp-token'] || req.headers['authorization']?.replace('Bearer ', '');
    
    if (token === process.env.CCP_TOKEN) {
      req.isExternalAuth = true;
      return next();
    }
    
    // Fall back to regular auth middleware if available
    if (req.user) {
      req.isExternalAuth = false;
      return next();
    }
    
    return res.status(401).json({
      success: false,
      message: 'Unauthorized. Valid CCP token or user authentication required.'
    });
  };

  // GET /api/v1/ccp/patients - Paginated list of CCP patients
  static async getPatients(req, res) {
    const startTime = Date.now();
    log('CCP API: getPatients called', { 
      query: req.query, 
      isExternalAuth: req.isExternalAuth,
      userAgent: req.headers['user-agent']
    });
    
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
        insurer,
        doctor,
        status,
        search,
        month,
        year
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      log('CCP API: getPatients parameters', { 
        page, limit, sortBy, sortOrder, insurer, doctor, status, search, month, year, offset 
      });
      
      // Build where conditions
      const whereConditions = {
        isCCPEnrolled: true
      };
      
      if (search) {
        whereConditions[Op.or] = [
          { surname: { [Op.iLike]: `%${search}%` } },
          { otherNames: { [Op.iLike]: `%${search}%` } },
          { patientNumber: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // CCP-specific filters
      const ccpWhere = {};
      if (month) ccpWhere.followupMonth = parseInt(month);
      if (year) ccpWhere.followupYear = parseInt(year);
      if (status) ccpWhere.status = status;

      const includeOptions = [
        {
          model: CCP,
          as: 'ccpFollowups',
          where: Object.keys(ccpWhere).length > 0 ? ccpWhere : undefined,
          required: Object.keys(ccpWhere).length > 0,
          include: [
            {
              model: User,
              as: 'scheduler',
              attributes: ['id', 'surname', 'otherNames', 'email'],
              where: doctor ? {
                [Op.or]: [
                  { surname: { [Op.iLike]: `%${doctor}%` } },
                  { otherNames: { [Op.iLike]: `%${doctor}%` } },
                  { email: { [Op.iLike]: `%${doctor}%` } }
                ]
              } : undefined
            }
          ]
        }
      ];

      log('CCP API: Executing Patient.findAndCountAll', { 
        whereConditions, 
        includeOptionsCount: includeOptions.length 
      });
      
      const { count, rows: patients } = await Patient.findAndCountAll({
        where: whereConditions,
        include: includeOptions,
        limit: parseInt(limit),
        offset,
        order: [[sortBy, sortOrder.toUpperCase()]],
        distinct: true
      });
      
      log('CCP API: Patient query results', { 
        totalCount: count, 
        returnedCount: patients.length,
        queryDuration: Date.now() - startTime 
      });

      // Filter by insurer if specified
      let filteredPatients = patients;
      if (insurer) {
        filteredPatients = patients.filter(patient => {
          const paymentScheme = patient.paymentScheme;
          if (typeof paymentScheme === 'object' && paymentScheme.provider) {
            return paymentScheme.provider.toLowerCase().includes(insurer.toLowerCase());
          }
          return false;
        });
      }

      const totalPages = Math.ceil(count / parseInt(limit));

      const response = {
        success: true,
        data: {
          patients: filteredPatients,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalRecords: count,
            limit: parseInt(limit),
            hasNext: parseInt(page) < totalPages,
            hasPrev: parseInt(page) > 1
          }
        }
      };
      
      log('CCP API: getPatients success', { 
        totalDuration: Date.now() - startTime,
        patientsReturned: filteredPatients.length,
        totalRecords: count
      });
      
      res.json(response);

    } catch (error) {
      log('CCP API: getPatients error', { 
        error: error.message, 
        stack: error.stack,
        duration: Date.now() - startTime,
        query: req.query
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to fetch CCP patients',
        error: error.message
      });
    }
  }

  // GET /api/v1/ccp/patients/:id - Get specific CCP patient
  static async getPatient(req, res) {
    const startTime = Date.now();
    log('CCP API: getPatient called', { 
      patientId: req.params.id, 
      isExternalAuth: req.isExternalAuth 
    });
    
    try {
      const patient = await Patient.findOne({
        where: {
          [Op.or]: [
            { id: req.params.id },
            { patientNumber: req.params.id }
          ],
          isCCPEnrolled: true
        },
        include: [
          {
            model: CCP,
            as: 'ccpFollowups',
            include: [
              {
                model: User,
                as: 'scheduler',
                attributes: ['id', 'surname', 'otherNames', 'email']
              },
              {
                model: User,
                as: 'completedByUser',
                attributes: ['id', 'surname', 'otherNames', 'email']
              }
            ]
          }
        ]
      });

      if (!patient) {
        log('CCP API: getPatient - patient not found', { 
          patientId: req.params.id,
          duration: Date.now() - startTime
        });
        
        return res.status(404).json({
          success: false,
          message: 'CCP patient not found'
        });
      }
      
      log('CCP API: getPatient success', { 
        patientId: patient.id,
        patientNumber: patient.patientNumber,
        followupsCount: patient.ccpFollowups?.length || 0,
        duration: Date.now() - startTime
      });

      res.json({
        success: true,
        data: patient
      });

    } catch (error) {
      log('CCP API: getPatient error', { 
        patientId: req.params.id,
        error: error.message, 
        stack: error.stack,
        duration: Date.now() - startTime
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to fetch CCP patient',
        error: error.message
      });
    }
  }

  // PUT /api/v1/ccp/patients/:id - Update CCP patient
  static async updatePatient(req, res) {
    const startTime = Date.now();
    log('CCP API: updatePatient called', { 
      patientId: req.params.id, 
      updateData: req.body,
      isExternalAuth: req.isExternalAuth 
    });
    
    try {
      const patient = await Patient.findOne({
        where: {
          [Op.or]: [
            { id: req.params.id },
            { patientNumber: req.params.id }
          ],
          isCCPEnrolled: true
        }
      });

      if (!patient) {
        log('CCP API: updatePatient - patient not found', { 
          patientId: req.params.id,
          duration: Date.now() - startTime
        });
        
        return res.status(404).json({
          success: false,
          message: 'CCP patient not found'
        });
      }

      const allowedUpdates = [
        'surname', 'otherNames', 'telephone1', 'telephone2', 
        'residence', 'town', 'paymentScheme', 'medicalHistory'
      ];

      const updates = {};
      allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });

      await patient.update(updates);
      
      log('CCP API: updatePatient success', { 
        patientId: patient.id,
        updatedFields: Object.keys(updates),
        duration: Date.now() - startTime
      });

      res.json({
        success: true,
        message: 'CCP patient updated successfully',
        data: patient
      });

    } catch (error) {
      log('CCP API: updatePatient error', { 
        patientId: req.params.id,
        error: error.message, 
        stack: error.stack,
        duration: Date.now() - startTime
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to update CCP patient',
        error: error.message
      });
    }
  }

  // GET /api/v1/ccp/followups - Get CCP followups with filters
  static async getFollowups(req, res) {
    const startTime = Date.now();
    log('CCP API: getFollowups called', { 
      query: req.query, 
      isExternalAuth: req.isExternalAuth 
    });
    
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
        status,
        month,
        year,
        doctor,
        patientId
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      log('CCP API: getFollowups parameters', { 
        page, limit, sortBy, sortOrder, status, month, year, doctor, patientId 
      });
      
      const whereConditions = {};
      if (status) whereConditions.status = status;
      if (month) whereConditions.followupMonth = parseInt(month);
      if (year) whereConditions.followupYear = parseInt(year);
      if (patientId) whereConditions.patientId = patientId;

      const includeOptions = [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'patientNumber', 'surname', 'otherNames', 'telephone1']
        },
        {
          model: User,
          as: 'scheduler',
          attributes: ['id', 'surname', 'otherNames', 'email'],
          where: doctor ? {
            [Op.or]: [
              { surname: { [Op.iLike]: `%${doctor}%` } },
              { otherNames: { [Op.iLike]: `%${doctor}%` } }
            ]
          } : undefined
        }
      ];

      const { count, rows: followups } = await CCP.findAndCountAll({
        where: whereConditions,
        include: includeOptions,
        limit: parseInt(limit),
        offset,
        order: [[sortBy, sortOrder.toUpperCase()]]
      });

      const totalPages = Math.ceil(count / parseInt(limit));
      
      log('CCP API: getFollowups success', { 
        totalCount: count,
        returnedCount: followups.length,
        duration: Date.now() - startTime
      });

      res.json({
        success: true,
        data: {
          followups,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalRecords: count,
            limit: parseInt(limit),
            hasNext: parseInt(page) < totalPages,
            hasPrev: parseInt(page) > 1
          }
        }
      });

    } catch (error) {
      log('CCP API: getFollowups error', { 
        error: error.message, 
        stack: error.stack,
        duration: Date.now() - startTime,
        query: req.query
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to fetch CCP followups',
        error: error.message
      });
    }
  }

  // PUT /api/v1/ccp/followups/:id - Update CCP followup
  static async updateFollowup(req, res) {
    try {
      const followup = await CCP.findByPk(req.params.id);

      if (!followup) {
        return res.status(404).json({
          success: false,
          message: 'CCP followup not found'
        });
      }

      const allowedUpdates = [
        'followupFeedback', 'status', 'nextFollowupDate', 'isFollowupCompleted',
        'actualFollowupDate', 'labTestsPerformed', 'medicationsPrescribed',
        'medicationDispenseStatus', 'nextRefillDate'
      ];

      const updates = {};
      allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });

      // Set completion details if marking as completed
      if (req.body.isFollowupCompleted === true && !followup.isFollowupCompleted) {
        updates.actualFollowupDate = new Date();
        updates.status = 'COMPLETED';
        if (req.user) {
          updates.completedBy = req.user.id;
        }
      }

      await followup.update(updates);

      res.json({
        success: true,
        message: 'CCP followup updated successfully',
        data: followup
      });

    } catch (error) {
      console.error('Error updating CCP followup:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update CCP followup',
        error: error.message
      });
    }
  }

  // POST /api/v1/ccp/followups - Create new followup
  static async createFollowup(req, res) {
    try {
      const {
        patientId,
        followupMonth,
        followupYear,
        followupFrequency = '1_MONTH',
        followupType = 'ROUTINE',
        followupMode = 'PHONE_CALL',
        nextFollowupDate,
        dueFollowupDate
      } = req.body;

      if (!patientId || !followupMonth || !followupYear) {
        return res.status(400).json({
          success: false,
          message: 'Patient ID, followup month, and year are required'
        });
      }

      // Check if patient exists and is CCP enrolled
      const patient = await Patient.findOne({
        where: {
          [Op.or]: [
            { id: patientId },
            { patientNumber: patientId }
          ],
          isCCPEnrolled: true
        }
      });

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'CCP patient not found'
        });
      }

      // Check for existing followup in same month/year
      const existingFollowup = await CCP.findOne({
        where: {
          patientId: patient.id,
          followupMonth: parseInt(followupMonth),
          followupYear: parseInt(followupYear)
        }
      });

      if (existingFollowup) {
        return res.status(409).json({
          success: false,
          message: 'Followup already exists for this patient in the specified month/year'
        });
      }

      const followupData = {
        patientId: patient.id,
        followupMonth: parseInt(followupMonth),
        followupYear: parseInt(followupYear),
        followupFrequency,
        followupType,
        followupMode,
        nextFollowupDate: nextFollowupDate ? new Date(nextFollowupDate) : null,
        dueFollowupDate: dueFollowupDate ? new Date(dueFollowupDate) : null,
        status: 'SCHEDULED',
        isFollowupCompleted: false
      };

      if (req.user) {
        followupData.scheduledBy = req.user.id;
      }

      const followup = await CCP.create(followupData);

      res.status(201).json({
        success: true,
        message: 'CCP followup created successfully',
        data: followup
      });

    } catch (error) {
      console.error('Error creating CCP followup:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create CCP followup',
        error: error.message
      });
    }
  }

  // GET /api/v1/ccp/summary/insurers - Get insurer summary
  static async getInsurerSummary(req, res) {
    try {
      const patients = await Patient.findAll({
        where: { isCCPEnrolled: true },
        attributes: ['paymentScheme']
      });

      const insurerCounts = {};
      
      patients.forEach(patient => {
        const paymentScheme = patient.paymentScheme;
        let insurer = 'CASH';
        
        if (typeof paymentScheme === 'object' && paymentScheme.provider) {
          insurer = paymentScheme.provider;
        } else if (typeof paymentScheme === 'object' && paymentScheme.type) {
          insurer = paymentScheme.type;
        }
        
        insurerCounts[insurer] = (insurerCounts[insurer] || 0) + 1;
      });

      const summary = Object.entries(insurerCounts)
        .map(([insurer, count]) => ({ insurer, count }))
        .sort((a, b) => b.count - a.count);

      res.json({
        success: true,
        data: {
          totalPatients: patients.length,
          insurers: summary
        }
      });

    } catch (error) {
      console.error('Error fetching insurer summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch insurer summary',
        error: error.message
      });
    }
  }

  // GET /api/v1/ccp/summary/doctors - Get doctor summary
  static async getDoctorSummary(req, res) {
    try {
      const followups = await CCP.findAll({
        include: [
          {
            model: User,
            as: 'scheduler',
            attributes: ['id', 'surname', 'otherNames', 'email']
          }
        ]
      });

      const doctorCounts = {};
      
      followups.forEach(followup => {
        if (followup.scheduler) {
          const doctorName = `${followup.scheduler.surname} ${followup.scheduler.otherNames}`;
          const doctorId = followup.scheduler.id;
          
          if (!doctorCounts[doctorId]) {
            doctorCounts[doctorId] = {
              id: doctorId,
              name: doctorName,
              email: followup.scheduler.email,
              totalFollowups: 0,
              completedFollowups: 0,
              pendingFollowups: 0
            };
          }
          
          doctorCounts[doctorId].totalFollowups++;
          
          if (followup.isFollowupCompleted) {
            doctorCounts[doctorId].completedFollowups++;
          } else {
            doctorCounts[doctorId].pendingFollowups++;
          }
        }
      });

      const summary = Object.values(doctorCounts)
        .sort((a, b) => b.totalFollowups - a.totalFollowups);

      res.json({
        success: true,
        data: {
          totalFollowups: followups.length,
          doctors: summary
        }
      });

    } catch (error) {
      console.error('Error fetching doctor summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch doctor summary',
        error: error.message
      });
    }
  }

  // GET /api/v1/ccp/summary/monthly - Get monthly followup summary
  static async getMonthlySummary(req, res) {
    try {
      const { year = new Date().getFullYear() } = req.query;

      const followups = await CCP.findAll({
        where: {
          followupYear: parseInt(year)
        },
        attributes: ['followupMonth', 'status', 'isFollowupCompleted']
      });

      const monthlyData = {};
      
      // Initialize all months
      for (let month = 1; month <= 12; month++) {
        monthlyData[month] = {
          month,
          total: 0,
          completed: 0,
          pending: 0,
          cancelled: 0
        };
      }

      followups.forEach(followup => {
        const month = followup.followupMonth;
        if (monthlyData[month]) {
          monthlyData[month].total++;
          
          if (followup.isFollowupCompleted) {
            monthlyData[month].completed++;
          } else if (followup.status === 'CANCELLED') {
            monthlyData[month].cancelled++;
          } else {
            monthlyData[month].pending++;
          }
        }
      });

      res.json({
        success: true,
        data: {
          year: parseInt(year),
          months: Object.values(monthlyData)
        }
      });

    } catch (error) {
      console.error('Error fetching monthly summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch monthly summary',
        error: error.message
      });
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
          daysUntilFollowup: followup.getDaysUntilFollowup ? followup.getDaysUntilFollowup() : null,
          isOverdue: followup.isOverdue ? followup.isOverdue() : null
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
      const nextDate = followup.calculateNextFollowupDate ? followup.calculateNextFollowupDate() : null;
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
          daysOverdue: f.getDaysUntilFollowup ? Math.abs(f.getDaysUntilFollowup()) : null,
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
          daysUntilFollowup: f.getDaysUntilFollowup ? f.getDaysUntilFollowup() : null,
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

  // Get CCP patient medical history
  async getCCPMedicalHistory(req, res, next) {
    try {
      const { patientId } = req.params;
      const { startDate, endDate, limit = 20, page = 1 } = req.query;
      
      log('🔍 [CCP Medical History] Request received', { patientId, startDate, endDate, limit, page });
      
      const patient = await Patient.findOne({
        where: { id: patientId, isCCPEnrolled: true }
      });
      
      if (!patient) {
        log('❌ [CCP Medical History] Patient not found', { patientId });
        return res.status(404).json({
          success: false,
          message: 'CCP patient not found'
        });
      }
      
      const whereClause = { patientId };
      if (startDate) whereClause.createdAt = { [Op.gte]: new Date(startDate) };
      if (endDate) {
        whereClause.createdAt = whereClause.createdAt ? 
          { ...whereClause.createdAt, [Op.lte]: new Date(endDate) } : 
          { [Op.lte]: new Date(endDate) };
      }
      
      const { count, rows: records } = await MedicalRecord.findAndCountAll({
        where: whereClause,
        include: [{
          model: User,
          as: 'doctor',
          attributes: ['id', 'surname', 'otherNames', 'role']
        }],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        order: [['createdAt', 'DESC']]
      });
      
      const response = {
        success: true,
        data: {
          records: records.map(record => ({
            id: record.id,
            date: moment(record.createdAt).format('MMMM Do YYYY'),
            doctor: record.doctor ? `${record.doctor.surname} ${record.doctor.otherNames}` : 'Unknown',
            complaints: record.complaints,
            diagnosis: record.diagnosis,
            notes: record.notes,
            treatment: record.treatment
          })),
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(count / parseInt(limit)),
            totalRecords: count,
            limit: parseInt(limit)
          }
        }
      };
      
      log('✅ [CCP Medical History] Response sent', { 
        patientId, 
        recordsFound: count, 
        recordsReturned: records.length,
        response: JSON.stringify(response, null, 2)
      });
      
      res.json(response);
      
    } catch (error) {
      log('❌ [CCP Medical History] Error', { patientId: req.params.patientId, error: error.message, stack: error.stack });
      next(error);
    }
  }

  // Get CCP patient vital trends
  async getCCPVitalTrends(req, res, next) {
    try {
      const { patientId } = req.params;
      const { startDate, endDate, metric } = req.query;
      
      log('🔍 [CCP Vital Trends] Request received', { patientId, startDate, endDate, metric });
      
      const patient = await Patient.findOne({
        where: { id: patientId, isCCPEnrolled: true }
      });
      
      if (!patient) {
        log('❌ [CCP Vital Trends] Patient not found', { patientId });
        return res.status(404).json({
          success: false,
          message: 'CCP patient not found'
        });
      }
      
      const whereClause = { patientId };
      if (startDate) whereClause.examinationDateTime = { [Op.gte]: new Date(startDate) };
      if (endDate) {
        whereClause.examinationDateTime = whereClause.examinationDateTime ? 
          { ...whereClause.examinationDateTime, [Op.lte]: new Date(endDate) } : 
          { [Op.lte]: new Date(endDate) };
      }
      
      const examinations = await Examination.findAll({
        where: whereClause,
        order: [['examinationDateTime', 'ASC']]
      });
      
      const trends = this.calculateVitalTrends(examinations);
      
      // Filter by specific metric if requested
      const filteredTrends = metric ? { [metric]: trends[metric] } : trends;
      
      const response = {
        success: true,
        data: {
          trends: filteredTrends,
          totalExaminations: examinations.length
        }
      };
      
      log('✅ [CCP Vital Trends] Response sent', { 
        patientId, 
        examinationsFound: examinations.length,
        trendsCalculated: Object.keys(filteredTrends).length,
        response: JSON.stringify(response, null, 2)
      });
      
      res.json(response);
      
    } catch (error) {
      log('❌ [CCP Vital Trends] Error', { patientId: req.params.patientId, error: error.message, stack: error.stack });
      next(error);
    }
  }

  // Get CCP patient lab history
  async getCCPLabHistory(req, res, next) {
    try {
      const { patientId } = req.params;
      const { testType, status, startDate, endDate, limit = 20, page = 1 } = req.query;
      
      log('Fetching CCP lab history', { patientId, testType, status });
      
      const patient = await Patient.findOne({
        where: { id: patientId, isCCPEnrolled: true }
      });
      
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'CCP patient not found'
        });
      }
      
      const whereClause = { patientId };
      if (testType) whereClause.testType = { [Op.iLike]: `%${testType}%` };
      if (status) whereClause.status = status;
      if (startDate) whereClause.createdAt = { [Op.gte]: new Date(startDate) };
      if (endDate) {
        whereClause.createdAt = whereClause.createdAt ? 
          { ...whereClause.createdAt, [Op.lte]: new Date(endDate) } : 
          { [Op.lte]: new Date(endDate) };
      }
      
      const { count, rows: labTests } = await LabTest.findAndCountAll({
        where: whereClause,
        include: [{
          model: User,
          as: 'requestedBy',
          attributes: ['id', 'surname', 'otherNames']
        }],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        order: [['createdAt', 'DESC']]
      });
      
      res.json({
        success: true,
        data: {
          tests: labTests.map(test => ({
            id: test.id,
            testType: test.testType,
            status: test.status,
            requestDate: moment(test.createdAt).format('MMMM Do YYYY'),
            resultDate: test.resultDate ? moment(test.resultDate).format('MMMM Do YYYY') : null,
            results: test.results,
            isCritical: test.isCritical,
            requestedBy: test.requestedBy ? `${test.requestedBy.surname} ${test.requestedBy.otherNames}` : 'Unknown'
          })),
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(count / parseInt(limit)),
            totalRecords: count,
            limit: parseInt(limit)
          }
        }
      });
      
    } catch (error) {
      log('Error fetching CCP lab history', { patientId: req.params.patientId, error: error.message });
      next(error);
    }
  }

  // Get CCP patient current medications
  async getCCPCurrentMedications(req, res, next) {
    try {
      const { patientId } = req.params;
      
      log('🔍 [CCP Medications] Request received', { patientId });
      
      const patient = await Patient.findOne({
        where: { id: patientId, isCCPEnrolled: true }
      });
      
      if (!patient) {
        log('❌ [CCP Medications] Patient not found', { patientId });
        return res.status(404).json({
          success: false,
          message: 'CCP patient not found'
        });
      }
      
      const [prescriptions, dispenses] = await Promise.all([
        // Active prescriptions
        sequelize.query(`
          SELECT p.*, 
                 u."surname" AS "doctorSurname", 
                 u."otherNames" AS "doctorOtherNames",
                 COUNT(pm."MedicationId") as "medicationCount"
          FROM "Prescriptions" p
          LEFT JOIN "Users" u ON p."doctorId" = u."id"
          LEFT JOIN "PrescriptionMedications" pm ON p."id" = pm."prescriptionId"
          WHERE p."patientId" = :patientId
          AND p."status" = 'active'
          AND p."validUntil" > NOW()
          GROUP BY p."id", u."surname", u."otherNames"
          ORDER BY p."createdAt" DESC
        `, {
          replacements: { patientId },
          type: sequelize.QueryTypes.SELECT
        }),
        
        // Recent medication dispenses
        sequelize.query(`
          SELECT md.*, 
                 m."name" as "medicationName",
                 m."strength",
                 m."type"
          FROM medication_dispenses md
          LEFT JOIN "Medications" m ON md.medication_id = m."id"
          WHERE md.patient_id = :patientId
          AND md.dispensed_at >= NOW() - INTERVAL '6 months'
          ORDER BY md.dispensed_at DESC
        `, {
          replacements: { patientId },
          type: sequelize.QueryTypes.SELECT
        })
      ]);
      
      const response = {
        success: true,
        data: {
          activePrescriptions: prescriptions.map(p => ({
            id: p.id,
            date: moment(p.createdAt).format('MMMM Do YYYY'),
            doctor: `${p.doctorSurname} ${p.doctorOtherNames}`,
            diagnosis: p.diagnosis,
            medicationCount: parseInt(p.medicationCount),
            validUntil: moment(p.validUntil).format('MMMM Do YYYY')
          })),
          recentDispenses: dispenses.map(d => ({
            id: d.id,
            medicationName: d.medicationName,
            strength: d.strength,
            quantity: d.quantity,
            dispensedAt: moment(d.dispensed_at).format('MMMM Do YYYY'),
            totalPrice: d.total_price
          }))
        }
      };
      
      log('✅ [CCP Medications] Response sent', { 
        patientId,
        activePrescriptions: prescriptions.length,
        recentDispenses: dispenses.length,
        response: JSON.stringify(response, null, 2)
      });
      
      res.json(response);
      
    } catch (error) {
      log('❌ [CCP Medications] Error', { patientId: req.params.patientId, error: error.message, stack: error.stack });
      next(error);
    }
  }

  // Get CCP patient billing history
  async getCCPBillingHistory(req, res, next) {
    try {
      const { patientId } = req.params;
      const { startDate, endDate, paymentStatus, limit = 20, page = 1 } = req.query;
      
      log('Fetching CCP billing history', { patientId, paymentStatus });
      
      const patient = await Patient.findOne({
        where: { id: patientId, isCCPEnrolled: true }
      });
      
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'CCP patient not found'
        });
      }
      
      const whereClause = { patientId };
      if (paymentStatus) whereClause.paymentStatus = paymentStatus;
      if (startDate) whereClause.createdAt = { [Op.gte]: new Date(startDate) };
      if (endDate) {
        whereClause.createdAt = whereClause.createdAt ? 
          { ...whereClause.createdAt, [Op.lte]: new Date(endDate) } : 
          { [Op.lte]: new Date(endDate) };
      }
      
      const { count, rows: billingRecords } = await Billing.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        order: [['createdAt', 'DESC']]
      });
      
      const costAnalysis = this.calculateCostAnalysis(billingRecords);
      
      res.json({
        success: true,
        data: {
          records: billingRecords.map(b => ({
            id: b.id,
            date: moment(b.createdAt).format('MMMM Do YYYY'),
            totalAmount: b.totalAmount,
            paymentStatus: b.paymentStatus,
            paymentMethod: b.paymentMethod,
            items: b.items
          })),
          costAnalysis,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(count / parseInt(limit)),
            totalRecords: count,
            limit: parseInt(limit)
          }
        }
      });
      
    } catch (error) {
      log('Error fetching CCP billing history', { patientId: req.params.patientId, error: error.message });
      next(error);
    }
  }

  // Get CCP patient follow-up schedule
  async getCCPFollowUpSchedule(req, res, next) {
    try {
      const { patientId } = req.params;
      
      log('🔍 [CCP Follow-up Schedule] Request received', { patientId });
      
      const patient = await Patient.findOne({
        where: { id: patientId, isCCPEnrolled: true }
      });
      
      if (!patient) {
        log('❌ [CCP Follow-up Schedule] Patient not found', { patientId });
        return res.status(404).json({
          success: false,
          message: 'CCP patient not found'
        });
      }
      
      const [upcomingFollowups, completedFollowups, overdueFollowups] = await Promise.all([
        // Upcoming followups
        CCP.findAll({
          where: {
            patientId,
            isFollowupCompleted: false,
            nextFollowupDate: { [Op.gte]: new Date() }
          },
          order: [['nextFollowupDate', 'ASC']]
        }),
        
        // Recent completed followups
        CCP.findAll({
          where: {
            patientId,
            isFollowupCompleted: true
          },
          order: [['actualFollowupDate', 'DESC']],
          limit: 5
        }),
        
        // Overdue followups
        CCP.findAll({
          where: {
            patientId,
            isFollowupCompleted: false,
            nextFollowupDate: { [Op.lt]: new Date() }
          },
          order: [['nextFollowupDate', 'ASC']]
        })
      ]);
      
      const response = {
        success: true,
        data: {
          upcoming: upcomingFollowups.map(f => ({
            id: f.id,
            nextFollowupDate: moment(f.nextFollowupDate).format('MMMM Do YYYY'),
            followupType: f.followupType,
            followupMode: f.followupMode,
            priority: f.priority,
            status: f.status
          })),
          completed: completedFollowups.map(f => ({
            id: f.id,
            actualFollowupDate: moment(f.actualFollowupDate).format('MMMM Do YYYY'),
            followupType: f.followupType,
            followupFeedback: f.followupFeedback
          })),
          overdue: overdueFollowups.map(f => ({
            id: f.id,
            nextFollowupDate: moment(f.nextFollowupDate).format('MMMM Do YYYY'),
            daysOverdue: moment().diff(moment(f.nextFollowupDate), 'days'),
            followupType: f.followupType,
            priority: f.priority
          }))
        }
      };
      
      log('✅ [CCP Follow-up Schedule] Response sent', { 
        patientId,
        upcomingCount: upcomingFollowups.length,
        completedCount: completedFollowups.length,
        overdueCount: overdueFollowups.length,
        response: JSON.stringify(response, null, 2)
      });
      
      res.json(response);
      
    } catch (error) {
      log('❌ [CCP Follow-up Schedule] Error', { patientId: req.params.patientId, error: error.message, stack: error.stack });
      next(error);
    }
  }

  // Generate comprehensive CCP patient report
  async generateCCPReport(req, res, next) {
    try {
      const { patientId } = req.params;
      const { startDate, endDate, includeVitals = true, includeLabs = true, includeMedications = true } = req.query;
      
      log('Generating CCP patient report', { patientId, includeVitals, includeLabs, includeMedications });
      
      const patient = await Patient.findOne({
        where: { id: patientId, isCCPEnrolled: true }
      });
      
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'CCP patient not found'
        });
      }
      
      const dateFilter = {};
      if (startDate) dateFilter[Op.gte] = new Date(startDate);
      if (endDate) dateFilter[Op.lte] = new Date(endDate);
      
      const reportData = {
        patient: {
          id: patient.id,
          patientNumber: patient.patientNumber,
          fullName: `${patient.surname} ${patient.otherNames}`,
          age: moment().diff(moment(patient.dateOfBirth), 'years'),
          enrollmentDate: moment(patient.ccpEnrollmentDate).format('MMMM Do YYYY')
        },
        reportPeriod: {
          startDate: startDate ? moment(startDate).format('MMMM Do YYYY') : 'All time',
          endDate: endDate ? moment(endDate).format('MMMM Do YYYY') : 'Present',
          generatedAt: moment().format('MMMM Do YYYY, h:mm a')
        }
      };
      
      // Add sections based on request
      if (includeVitals === 'true') {
        const examinations = await Examination.findAll({
          where: {
            patientId,
            ...(Object.keys(dateFilter).length > 0 && { examinationDateTime: dateFilter })
          },
          order: [['examinationDateTime', 'DESC']]
        });
        reportData.vitals = this.calculateVitalTrends(examinations);
      }
      
      if (includeLabs === 'true') {
        const labTests = await LabTest.findAll({
          where: {
            patientId,
            ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
          },
          order: [['createdAt', 'DESC']]
        });
        reportData.labTests = labTests.map(test => ({
          testType: test.testType,
          status: test.status,
          date: moment(test.createdAt).format('MMMM Do YYYY'),
          results: test.results,
          isCritical: test.isCritical
        }));
      }
      
      if (includeMedications === 'true') {
        const prescriptions = await sequelize.query(`
          SELECT p.*, u."surname" AS "doctorSurname", u."otherNames" AS "doctorOtherNames"
          FROM "Prescriptions" p
          LEFT JOIN "Users" u ON p."doctorId" = u."id"
          WHERE p."patientId" = :patientId
          ${Object.keys(dateFilter).length > 0 ? 'AND p."createdAt" BETWEEN :startDate AND :endDate' : ''}
          ORDER BY p."createdAt" DESC
        `, {
          replacements: { 
            patientId, 
            ...(startDate && { startDate }),
            ...(endDate && { endDate })
          },
          type: sequelize.QueryTypes.SELECT
        });
        
        reportData.medications = prescriptions.map(p => ({
          date: moment(p.createdAt).format('MMMM Do YYYY'),
          doctor: `${p.doctorSurname} ${p.doctorOtherNames}`,
          diagnosis: p.diagnosis,
          status: p.status
        }));
      }
      
      res.json({
        success: true,
        report: reportData
      });
      
    } catch (error) {
      log('Error generating CCP report', { patientId: req.params.patientId, error: error.message });
      next(error);
    }
  }

  // Get CCP program analytics
  async getCCPAnalytics(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      
      log('Fetching CCP analytics', { startDate, endDate });
      
      const dateFilter = {};
      if (startDate) dateFilter[Op.gte] = new Date(startDate);
      if (endDate) dateFilter[Op.lte] = new Date(endDate);
      
      const [totalPatients, activeFollowups, completedFollowups, overdueFollowups] = await Promise.all([
        // Total CCP patients
        Patient.count({ where: { isCCPEnrolled: true } }),
        
        // Active followups
        CCP.count({ 
          where: { 
            isFollowupCompleted: false,
            ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
          } 
        }),
        
        // Completed followups
        CCP.count({ 
          where: { 
            isFollowupCompleted: true,
            ...(Object.keys(dateFilter).length > 0 && { actualFollowupDate: dateFilter })
          } 
        }),
        
        // Overdue followups
        CCP.count({
          where: {
            isFollowupCompleted: false,
            nextFollowupDate: { [Op.lt]: new Date() }
          }
        })
      ]);
      
      const analytics = {
        overview: {
          totalPatients,
          activeFollowups,
          completedFollowups,
          overdueFollowups,
          completionRate: activeFollowups + completedFollowups > 0 ? 
            Math.round((completedFollowups / (activeFollowups + completedFollowups)) * 100) : 0
        },
        period: {
          startDate: startDate ? moment(startDate).format('MMMM Do YYYY') : 'All time',
          endDate: endDate ? moment(endDate).format('MMMM Do YYYY') : 'Present'
        }
      };
      
      res.json({
        success: true,
        analytics
      });
      
    } catch (error) {
      log('Error fetching CCP analytics', { error: error.message });
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
          daysOverdue: f.getDaysUntilFollowup ? Math.abs(f.getDaysUntilFollowup()) : null,
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

  // Additional patient detail endpoints
  async getPatientVitalTrends(req, res, next) {
    return this.getCCPVitalTrends(req, res, next);
  }

  async getPatientFollowUpSchedule(req, res, next) {
    return this.getCCPFollowUpSchedule(req, res, next);
  }

  async getPatientMedicalHistory(req, res, next) {
    return this.getCCPMedicalHistory(req, res, next);
  }

  async getPatientLabHistory(req, res, next) {
    return this.getCCPLabHistory(req, res, next);
  }

  async getPatientMedications(req, res, next) {
    return this.getCCPCurrentMedications(req, res, next);
  }

  async getPatientBilling(req, res, next) {
    return this.getCCPBillingHistory(req, res, next);
  }
}

module.exports = CCPController;