// routes/v1/ccp.route.js
const express = require('express');
const router = express.Router();
const CCPController = require('../../controllers/ccp.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

// Create an instance of the controller
const ccpController = new CCPController();

/**
 * @swagger
 * /api/v1/ccp/patients:
 *   get:
 *     summary: Get all CCP enrolled patients
 *     tags: [CCP]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *           default: active
 */
router.get('/patients', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE', 'ADMIN', 'CCP_COORDINATOR']), 
  ccpController.getCCPPatientsList.bind(ccpController)
);

/**
 * @swagger
 * /api/v1/ccp/patient/{patientId}/profile:
 *   get:
 *     summary: Get comprehensive CCP patient profile
 *     tags: [CCP]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/patient/:patientId/profile', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE', 'ADMIN', 'CCP_COORDINATOR']), 
  ccpController.getCCPPatientProfile.bind(ccpController)
);

/**
 * @swagger
 * /api/v1/ccp/patient/{patientId}/medical-history:
 *   get:
 *     summary: Get CCP patient medical history
 *     tags: [CCP]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 */
router.get('/patient/:patientId/medical-history', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE', 'ADMIN', 'CCP_COORDINATOR']), 
  ccpController.getCCPMedicalHistory.bind(ccpController)
);

/**
 * @swagger
 * /api/v1/ccp/patient/{patientId}/vital-trends:
 *   get:
 *     summary: Get CCP patient vital signs trends
 *     tags: [CCP]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: metric
 *         schema:
 *           type: string
 *           enum: [bloodPressure, weight, temperature, heartRate, bmi, oxygenSaturation]
 */
router.get('/patient/:patientId/vital-trends', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE', 'ADMIN', 'CCP_COORDINATOR']), 
  ccpController.getCCPVitalTrends.bind(ccpController)
);

/**
 * @swagger
 * /api/v1/ccp/patient/{patientId}/lab-history:
 *   get:
 *     summary: Get CCP patient laboratory test history
 *     tags: [CCP]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: testType
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, SAMPLE_COLLECTED, IN_PROGRESS, COMPLETED, CANCELLED]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 */
router.get('/patient/:patientId/lab-history', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE', 'ADMIN', 'CCP_COORDINATOR', 'LAB_TECHNICIAN']), 
  ccpController.getCCPLabHistory.bind(ccpController)
);

/**
 * @swagger
 * /api/v1/ccp/patient/{patientId}/medications:
 *   get:
 *     summary: Get CCP patient current medications and prescription history
 *     tags: [CCP]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/patient/:patientId/medications', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE', 'ADMIN', 'CCP_COORDINATOR', 'PHARMACIST']), 
  ccpController.getCCPCurrentMedications.bind(ccpController)
);

/**
 * @swagger
 * /api/v1/ccp/patient/{patientId}/billing:
 *   get:
 *     summary: Get CCP patient billing history and cost analysis
 *     tags: [CCP]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [PENDING, PAID, WAIVED]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 */
router.get('/patient/:patientId/billing', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE', 'ADMIN', 'CCP_COORDINATOR', 'BILLING_CLERK']), 
  ccpController.getCCPBillingHistory.bind(ccpController)
);

/**
 * @swagger
 * /api/v1/ccp/patient/{patientId}/follow-up:
 *   get:
 *     summary: Get CCP patient follow-up schedule
 *     tags: [CCP]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/patient/:patientId/follow-up', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE', 'ADMIN', 'CCP_COORDINATOR']), 
  ccpController.getCCPFollowUpSchedule.bind(ccpController)
);


/**
 * @swagger
 * /api/v1/ccp/patient/{patientId}/followups:
 *   post:
 *     summary: Create CCP followup record for a patient
 *     tags: [CCP Followups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - followupFrequency
 *             properties:
 *               nextFollowupDate:
 *                 type: string
 *                 format: date
 *               dueFollowupDate:
 *                 type: string
 *                 format: date
 *               followupFrequency:
 *                 type: string
 *                 enum: [1_WEEK, 2_WEEKS, 1_MONTH, 2_MONTHS, 3_MONTHS, 6_MONTHS, 12_MONTHS]
 *               followupType:
 *                 type: string
 *                 enum: [ROUTINE, URGENT, MEDICATION_REVIEW, LAB_FOLLOWUP, SYMPTOM_CHECK, EMERGENCY]
 *               followupMode:
 *                 type: string
 *                 enum: [IN_PERSON, PHONE_CALL, VIDEO_CALL, SMS, HOME_VISIT]
 *               priority:
 *                 type: string
 *                 enum: [LOW, NORMAL, HIGH, URGENT]
 *               followupFeedback:
 *                 type: string
 *               consultationFeedback:
 *                 type: string
 *               vitalSigns:
 *                 type: object
 *               symptomsAssessment:
 *                 type: object
 *               medicationCompliance:
 *                 type: string
 *                 enum: [EXCELLENT, GOOD, FAIR, POOR, NON_COMPLIANT]
 *               actionItems:
 *                 type: array
 *                 items:
 *                   type: string
 *               referralsNeeded:
 *                 type: array
 *                 items:
 *                   type: string
 *               labTestsOrdered:
 *                 type: array
 *                 items:
 *                   type: string
 *               privateNotes:
 *                 type: string
 *               patientNotes:
 *                 type: string
 */
router.post('/patient/:patientId/followups', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE', 'ADMIN', 'CCP_COORDINATOR']), 
  ccpController.createCCPFollowup.bind(ccpController)
);

/**
 * @swagger
 * /api/v1/ccp/patient/{patientId}/followups:
 *   get:
 *     summary: Get CCP followup records for a patient
 *     tags: [CCP Followups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [SCHEDULED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW, RESCHEDULED]
 *       - in: query
 *         name: isCompleted
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 */
router.get('/patient/:patientId/followups', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE', 'ADMIN', 'CCP_COORDINATOR']), 
  ccpController.getCCPFollowups.bind(ccpController)
);

/**
 * @swagger
 * /api/v1/ccp/followups/{followupId}:
 *   put:
 *     summary: Update CCP followup record
 *     tags: [CCP Followups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: followupId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nextFollowupDate:
 *                 type: string
 *                 format: date
 *               dueFollowupDate:
 *                 type: string
 *                 format: date
 *               followupFrequency:
 *                 type: string
 *                 enum: [1_WEEK, 2_WEEKS, 1_MONTH, 2_MONTHS, 3_MONTHS, 6_MONTHS, 12_MONTHS]
 *               followupType:
 *                 type: string
 *                 enum: [ROUTINE, URGENT, MEDICATION_REVIEW, LAB_FOLLOWUP, SYMPTOM_CHECK, EMERGENCY]
 *               followupMode:
 *                 type: string
 *                 enum: [IN_PERSON, PHONE_CALL, VIDEO_CALL, SMS, HOME_VISIT]
 *               priority:
 *                 type: string
 *                 enum: [LOW, NORMAL, HIGH, URGENT]
 *               status:
 *                 type: string
 *                 enum: [SCHEDULED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW, RESCHEDULED]
 *               isFollowupCompleted:
 *                 type: boolean
 *               followupFeedback:
 *                 type: string
 *               consultationFeedback:
 *                 type: string
 *               vitalSigns:
 *                 type: object
 *               symptomsAssessment:
 *                 type: object
 *               medicationCompliance:
 *                 type: string
 *                 enum: [EXCELLENT, GOOD, FAIR, POOR, NON_COMPLIANT]
 *               actionItems:
 *                 type: array
 *                 items:
 *                   type: string
 *               referralsNeeded:
 *                 type: array
 *                 items:
 *                   type: string
 *               labTestsOrdered:
 *                 type: array
 *                 items:
 *                   type: string
 *               duration:
 *                 type: integer
 *               privateNotes:
 *                 type: string
 *               patientNotes:
 *                 type: string
 */
router.put('/followups/:followupId', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE', 'ADMIN', 'CCP_COORDINATOR']), 
  ccpController.updateCCPFollowup.bind(ccpController)
);

/**
 * @swagger
 * /api/v1/ccp/followups/{followupId}/complete:
 *   post:
 *     summary: Complete CCP followup and record outcomes
 *     tags: [CCP Followups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: followupId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               followupFeedback:
 *                 type: string
 *               consultationFeedback:
 *                 type: string
 *               vitalSigns:
 *                 type: object
 *               symptomsAssessment:
 *                 type: object
 *               medicationCompliance:
 *                 type: string
 *                 enum: [EXCELLENT, GOOD, FAIR, POOR, NON_COMPLIANT]
 *               actionItems:
 *                 type: array
 *                 items:
 *                   type: string
 *               referralsNeeded:
 *                 type: array
 *                 items:
 *                   type: string
 *               labTestsOrdered:
 *                 type: array
 *                 items:
 *                   type: string
 *               duration:
 *                 type: integer
 *                 description: Duration of followup in minutes
 *               privateNotes:
 *                 type: string
 *               patientNotes:
 *                 type: string
 */
router.post('/followups/:followupId/complete', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE', 'ADMIN', 'CCP_COORDINATOR']), 
  ccpController.completeCCPFollowup.bind(ccpController)
);

/**
 * @swagger
 * /api/v1/ccp/followups/dashboard:
 *   get:
 *     summary: Get CCP followup dashboard with metrics and overdue followups
 *     tags: [CCP Followups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         description: Month for dashboard data (defaults to current month)
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Year for dashboard data (defaults to current year)
 */
router.get('/followups/dashboard', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE', 'ADMIN', 'CCP_COORDINATOR']), 
  ccpController.getCCPFollowupDashboard.bind(ccpController)
);

/**
 * @swagger
 * /api/v1/ccp/followups/overdue:
 *   get:
 *     summary: Get all overdue CCP followups across all patients
 *     tags: [CCP Followups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 */
router.get('/followups/overdue', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE', 'ADMIN', 'CCP_COORDINATOR']), 
  ccpController.getOverdueCCPFollowups.bind(ccpController)
);

/**
 * @swagger
 * /api/v1/ccp/followups/{followupId}:
 *   get:
 *     summary: Get specific CCP followup record by ID
 *     tags: [CCP Followups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: followupId
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/followups/:followupId', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE', 'ADMIN', 'CCP_COORDINATOR']), 
  async (req, res, next) => {
    try {
      const { followupId } = req.params;
      
      const followup = await CCP.findByPk(followupId, {
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: ['id', 'patientNumber', 'surname', 'otherNames', 'telephone1', 'dateOfBirth']
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

      if (!followup) {
        return res.status(404).json({
          success: false,
          message: 'CCP followup record not found'
        });
      }

      res.json({
        success: true,
        followup
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/ccp/followups/{followupId}:
 *   delete:
 *     summary: Delete CCP followup record
 *     tags: [CCP Followups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: followupId
 *         required: true
 *         schema:
 *           type: string
 */
router.delete('/followups/:followupId', 
  authenticate, 
  authorize(['ADMIN', 'CCP_COORDINATOR']), 
  async (req, res, next) => {
    try {
      const { followupId } = req.params;
      
      const followup = await CCP.findByPk(followupId);

      if (!followup) {
        return res.status(404).json({
          success: false,
          message: 'CCP followup record not found'
        });
      }

      // Don't allow deletion of completed followups
      if (followup.isFollowupCompleted) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete completed followup records'
        });
      }

      await followup.destroy();

      res.json({
        success: true,
        message: 'CCP followup record deleted successfully'
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/ccp/followups/bulk-schedule:
 *   post:
 *     summary: Bulk schedule followups for multiple CCP patients
 *     tags: [CCP Followups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientIds
 *               - followupFrequency
 *             properties:
 *               patientIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               followupFrequency:
 *                 type: string
 *                 enum: [1_WEEK, 2_WEEKS, 1_MONTH, 2_MONTHS, 3_MONTHS, 6_MONTHS, 12_MONTHS]
 *               followupType:
 *                 type: string
 *                 enum: [ROUTINE, URGENT, MEDICATION_REVIEW, LAB_FOLLOWUP, SYMPTOM_CHECK, EMERGENCY]
 *                 default: ROUTINE
 *               followupMode:
 *                 type: string
 *                 enum: [IN_PERSON, PHONE_CALL, VIDEO_CALL, SMS, HOME_VISIT]
 *                 default: IN_PERSON
 *               priority:
 *                 type: string
 *                 enum: [LOW, NORMAL, HIGH, URGENT]
 *                 default: NORMAL
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: Starting date for scheduling followups
 */
router.post('/followups/bulk-schedule', 
  authenticate, 
  authorize(['ADMIN', 'CCP_COORDINATOR']), 
  async (req, res, next) => {
    try {
      const {
        patientIds,
        followupFrequency,
        followupType = 'ROUTINE',
        followupMode = 'IN_PERSON',
        priority = 'NORMAL',
        startDate
      } = req.body;

      if (!patientIds || !Array.isArray(patientIds) || patientIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Patient IDs array is required'
        });
      }

      if (!followupFrequency) {
        return res.status(400).json({
          success: false,
          message: 'Followup frequency is required'
        });
      }

      const results = {
        successful: [],
        failed: [],
        total: patientIds.length
      };

      const baseDate = startDate ? new Date(startDate) : new Date();
      
      for (const patientId of patientIds) {
        try {
          // Verify patient is CCP enrolled
          const patient = await Patient.findOne({
            where: { id: patientId, isCCPEnrolled: true }
          });

          if (!patient) {
            results.failed.push({
              patientId,
              reason: 'Patient not found or not CCP enrolled'
            });
            continue;
          }

          // Calculate followup date based on index to spread them out
          const followupDate = new Date(baseDate);
          const patientIndex = patientIds.indexOf(patientId);
          followupDate.setDate(baseDate.getDate() + patientIndex); // Spread by days

          const followupMonth = followupDate.getMonth() + 1;
          const followupYear = followupDate.getFullYear();

          // Check if followup already exists
          const existingFollowup = await CCP.findOne({
            where: {
              patientId,
              followupMonth,
              followupYear
            }
          });

          if (existingFollowup) {
            results.failed.push({
              patientId,
              reason: 'Followup already exists for this month/year'
            });
            continue;
          }

          // Create followup
          const followup = await CCP.create({
            patientId,
            nextFollowupDate: followupDate,
            followupFrequency,
            followupMonth,
            followupYear,
            followupType,
            followupMode,
            priority,
            scheduledBy: req.user.id,
            status: 'SCHEDULED'
          });

          results.successful.push({
            patientId,
            followupId: followup.id,
            followupDate: followupDate
          });

        } catch (error) {
          results.failed.push({
            patientId,
            reason: error.message
          });
        }
      }

      res.json({
        success: true,
        message: `Bulk scheduling completed. ${results.successful.length} successful, ${results.failed.length} failed.`,
        results
      });

    } catch (error) {
      next(error);
    }
  }
);


/**
 * @swagger
 * /api/v1/ccp/patient/{patientId}/report:
 *   get:
 *     summary: Generate comprehensive CCP patient report
 *     tags: [CCP]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: includeVitals
 *         schema:
 *           type: boolean
 *           default: true
 *       - in: query
 *         name: includeLabs
 *         schema:
 *           type: boolean
 *           default: true
 *       - in: query
 *         name: includeMedications
 *         schema:
 *           type: boolean
 *           default: true
 */
router.get('/patient/:patientId/report', 
  authenticate, 
  authorize(['DOCTOR', 'NURSE', 'ADMIN', 'CCP_COORDINATOR']), 
  ccpController.generateCCPReport.bind(ccpController)
);

/**
 * @swagger
 * /api/v1/ccp/analytics:
 *   get:
 *     summary: Get CCP program analytics and metrics
 *     tags: [CCP]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 */
router.get('/analytics', 
  authenticate, 
  authorize(['ADMIN', 'CCP_COORDINATOR', 'DOCTOR']), 
  ccpController.getCCPAnalytics.bind(ccpController)
);

module.exports = router;