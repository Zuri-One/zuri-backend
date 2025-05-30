// controllers/medical-record.controller.js
const { MedicalRecord, Patient, User, DepartmentQueue } = require('../models');
const { Op } = require('sequelize');

exports.getPatientMedicalHistory = async (req, res, next) => {
 try {
   const { patientId } = req.params;
   console.log('Getting medical history for patient:', patientId);

   // Validate patient exists
   const patient = await Patient.findByPk(patientId);
   if (!patient) {
     console.log('Patient not found:', patientId);
     return res.status(404).json({
       success: false,
       message: 'Patient not found'
     });
   }

   // Fetch all medical records for the patient
   const records = await MedicalRecord.findAll({
     where: { patientId },
     include: [
       {
         model: User,
         as: 'doctor',
         attributes: ['id', 'surname', 'otherNames']
       }
     ],
     order: [['createdAt', 'DESC']] // Most recent first
   });

   console.log('Found medical records:', records.length);
   console.log('Sample record fields:', records.length > 0 ? Object.keys(records[0].dataValues) : 'No records');

   res.json({
     success: true,
     data: records
   });

 } catch (error) {
   console.error('Error fetching medical history:', error);
   next(error);
 }
};





exports.createMedicalRecord = async (req, res, next) => {
 try {
   console.log('Creating medical record with data:', req.body);
   console.log('User creating record:', req.user);

   const {
     patientId,
     queueEntryId,
     complaints,
     hpi,
     medicalHistory,
     familySocialHistory,
     allergies,
     examinationNotes,
     reviewOtherSystems,
     specialHistory,
     impressions,
     diagnosis,
     notes
   } = req.body;

   const doctorId = req.user.id;

   console.log('Extracted fields:', {
     patientId,
     queueEntryId,
     doctorId,
     hasComplaints: !!complaints,
     hasHpi: !!hpi,
     hasDiagnosis: !!diagnosis,
     hasExaminationNotes: !!examinationNotes,
     hasReviewOtherSystems: !!reviewOtherSystems,
     hasSpecialHistory: !!specialHistory
   });

   // Validate queue entry exists and belongs to doctor's department
   const queueEntry = await DepartmentQueue.findOne({
     where: {
       id: queueEntryId,
       patientId,
       status: 'IN_PROGRESS'
     },
     include: [{
       model: Patient
     }]
   });

   if (!queueEntry) {
     console.log('Queue entry not found or invalid:', { queueEntryId, patientId });
     return res.status(404).json({
       success: false,
       message: 'Invalid queue entry or consultation not in progress'
     });
   }

   console.log('Queue entry validated successfully');

   // Create medical record
   const medicalRecordData = {
     patientId,
     doctorId,
     queueEntryId,
     complaints,
     hpi,
     medicalHistory,
     familySocialHistory,
     allergies,
     examinationNotes,
     reviewOtherSystems,
     specialHistory,
     impressions,
     diagnosis,
     notes
   };

   console.log('Creating medical record with data:', medicalRecordData);

   const medicalRecord = await MedicalRecord.create(medicalRecordData);

   console.log('Medical record created successfully:', {
     id: medicalRecord.id,
     fields: Object.keys(medicalRecord.dataValues)
   });

   // Update queue entry status
   await queueEntry.update({
     status: 'COMPLETED',
     endTime: new Date(),
     actualWaitTime: Math.floor(
       (new Date() - new Date(queueEntry.startTime)) / (1000 * 60)
     )
   });

   console.log('Queue entry updated to COMPLETED');

   // Update patient record
   await queueEntry.Patient.update({
     status: 'CONSULTATION_COMPLETE'
   });

   console.log('Patient status updated to CONSULTATION_COMPLETE');

   // Fetch complete record with associations
   const completeRecord = await MedicalRecord.findByPk(medicalRecord.id, {
     include: [
       {
         model: Patient,
         attributes: ['id', 'patientNumber', 'surname', 'otherNames']
       },
       {
         model: User,
         as: 'doctor',
         attributes: ['id', 'surname', 'otherNames']
       }
     ]
   });

   console.log('Fetched complete record:', {
     id: completeRecord.id,
     fields: Object.keys(completeRecord.dataValues),
     hasExaminationNotes: !!completeRecord.examinationNotes,
     hasReviewOtherSystems: !!completeRecord.reviewOtherSystems,
     hasSpecialHistory: !!completeRecord.specialHistory
   });

   res.status(201).json({
     success: true,
     data: completeRecord
   });

 } catch (error) {
   console.error('Error creating medical record:', error);
   console.error('Error stack:', error.stack);
   next(error);
 }
};