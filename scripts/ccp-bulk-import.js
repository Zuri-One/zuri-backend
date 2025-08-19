#!/usr/bin/env node

require('dotenv').config();
const XLSX = require('xlsx');
const { Patient, User, CCP, sequelize } = require('../src/models');
const { Op } = require('sequelize');
const moment = require('moment');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to ask user for confirmation
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase().trim());
    });
  });
}

const log = (message, data = null) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    service: 'ccp-bulk-import',
    message
  };
  
  if (data) {
    logEntry.data = data;
  }
  
  console.log(JSON.stringify(logEntry));
};

class CCPBulkImporter {
  constructor() {
    this.importStats = {
      totalSheets: 0,
      totalPatients: 0,
      patientsCreated: 0,
      patientsUpdated: 0,
      ccpRecordsCreated: 0,
      ccpRecordsUpdated: 0,
      errors: [],
      skipped: 0
    };
  }

  async importFromExcel(filePath, attendingDoctorName) {
    const transaction = await sequelize.transaction();
    
    try {
      log('Starting CCP bulk import', { filePath, attendingDoctorName });

      // Verify file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Get attending doctor
      const doctor = await this.findDoctor(attendingDoctorName, transaction);
      if (!doctor) {
        throw new Error(`Doctor not found: ${attendingDoctorName}`);
      }

      // Read Excel file
      const workbook = XLSX.readFile(filePath);
      const parsedData = this.parseWorkbook(workbook);

      // Process each sheet
      for (const [sheetName, patients] of Object.entries(parsedData)) {
        log(`Processing sheet: ${sheetName}`, { patientCount: patients.length });
        
        for (const patientData of patients) {
          try {
            await this.processPatient(patientData, doctor, transaction);
          } catch (error) {
            this.importStats.errors.push(`${patientData.patientId}: ${error.message}`);
            this.importStats.skipped++;
            log('Error processing patient', { 
              patientId: patientData.patientId, 
              error: error.message 
            });
          }
        }
      }

      await transaction.commit();
      
      log('CCP bulk import completed successfully', this.importStats);
      this.printSummary();
      
      return this.importStats;

    } catch (error) {
      await transaction.rollback();
      log('CCP bulk import failed', { error: error.message });
      throw error;
    }
  }

  async findDoctor(doctorName, transaction) {
    const doctorMap = {
      'georgina': 'georgina@zuri.health',
      'antony': 'antony@zuri.health', 
      'esther': 'esther@zuri.health'
    };
    
    const email = doctorMap[doctorName.toLowerCase()] || doctorName;
    
    return await User.findOne({
      where: {
        [Op.or]: [
          { email: email },
          { surname: { [Op.iLike]: `%${doctorName}%` } },
          { otherNames: { [Op.iLike]: `%${doctorName}%` } }
        ],
        role: 'DOCTOR',
        isActive: true
      },
      transaction
    });
  }

  parseWorkbook(workbook) {
    const parsedData = {};
    
    workbook.SheetNames.forEach(sheetName => {
      // Skip task sheets and discontinued sheets
      if (sheetName.toUpperCase().includes('TASK') || 
          sheetName.toUpperCase().includes('DISCONTINUATION') ||
          sheetName.toUpperCase().includes('DISCONTINUED')) {
        return;
      }
      
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      const patients = this.parseSheetData(jsonData, sheetName);
      if (patients.length > 0) {
        parsedData[sheetName] = patients;
        this.importStats.totalSheets++;
        this.importStats.totalPatients += patients.length;
      }
    });

    return parsedData;
  }

  parseSheetData(jsonData, sheetName) {
    const patients = [];
    
    // Find header row and detect column positions
    const columnMap = this.detectColumns(jsonData);
    if (!columnMap) {
      console.log(`⚠️ Could not detect columns in sheet: ${sheetName}`);
      return [];
    }

    // Parse data rows (start after header row)
    for (let i = columnMap.headerRow + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length === 0) continue;

      const patientId = row[columnMap.patientId];
      const name = row[columnMap.name];
      
      // Skip header rows and empty rows
      if (!patientId || !name || 
          this.isHeaderRow(patientId, name)) continue;

      const patient = {
        patientId: this.cleanValue(patientId),
        name: this.cleanValue(name),
        enrollmentStatus: this.cleanValue(row[columnMap.enrollmentStatus]) || 'ACTIVE',
        dateEnrolled: this.cleanValue(row[columnMap.dateEnrolled]),
        gender: this.cleanValue(row[columnMap.gender]),
        age: this.cleanValue(row[columnMap.age]),
        contact: this.cleanValue(row[columnMap.contact]),
        nextOfKinContact: this.cleanValue(row[columnMap.nextOfKinContact]),
        location: this.cleanValue(row[columnMap.location]),
        insurance: this.cleanValue(row[columnMap.insurance]),
        condition: this.cleanValue(row[columnMap.condition]),
        labTest: this.cleanValue(row[columnMap.labTest]),
        labDate: this.cleanValue(row[columnMap.labDate]),
        followupFrequency: this.cleanValue(row[columnMap.followupFrequency]),
        previousFeedback: this.cleanValue(row[columnMap.previousFeedback]),
        dueFollowupDate: this.cleanValue(row[columnMap.dueFollowupDate]),
        followupStatus: this.cleanValue(row[columnMap.followupStatus]),
        followupFeedback: this.cleanValue(row[columnMap.followupFeedback]),
        medicationPrescribed: this.cleanValue(row[columnMap.medicationPrescribed]),
        nextFollowup: this.cleanValue(row[columnMap.nextFollowup]),
        dispenseStatus: this.cleanValue(row[columnMap.dispenseStatus]),
        refillFrequency: this.cleanValue(row[columnMap.refillFrequency]),
        refillDate: this.cleanValue(row[columnMap.refillDate]),
        sheet: sheetName,
        month: this.extractMonth(sheetName),
        year: this.extractYear(sheetName),
        insurer: this.extractInsurer(sheetName),
        errors: this.validatePatient({
          patientId: this.cleanValue(patientId), 
          name: this.cleanValue(name), 
          gender: this.cleanValue(row[columnMap.gender]), 
          contact: this.cleanValue(row[columnMap.contact]), 
          dateEnrolled: this.cleanValue(row[columnMap.dateEnrolled])
        })
      };

      patients.push(patient);
    }

    return patients;
  }

  cleanValue(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') {
      return value.trim() === '' ? null : value.trim();
    }
    return value;
  }

  detectColumns(jsonData) {
    // Look for header row containing "Patient ID" and "Name"
    for (let i = 0; i < Math.min(10, jsonData.length); i++) {
      const row = jsonData[i];
      if (!row) continue;
      
      let patientIdCol = -1;
      let nameCol = -1;
      
      for (let j = 0; j < row.length; j++) {
        const cell = row[j]?.toString().toLowerCase() || '';
        if (cell.includes('patient') && cell.includes('id')) patientIdCol = j;
        if (cell.includes('name') && !cell.includes('next')) nameCol = j;
      }
      
      if (patientIdCol >= 0 && nameCol >= 0) {
        return {
          headerRow: i,
          patientId: patientIdCol,
          name: nameCol,
          enrollmentStatus: this.findColumn(row, ['status', 'enrollment status']),
          dateEnrolled: this.findColumn(row, ['date enrolled', 'enrolled']),
          gender: this.findColumn(row, ['gender', 'sex']),
          age: this.findColumn(row, ['age']),
          contact: this.findColumn(row, ['contact']) - (this.findColumn(row, ['next of kin']) || 999),
          nextOfKinContact: this.findColumn(row, ['next of kin']),
          location: this.findColumn(row, ['location']),
          insurance: this.findColumn(row, ['insurance']),
          condition: this.findColumn(row, ['condition', 'underlying']),
          labTest: this.findColumn(row, ['lab test']),
          labDate: this.findColumn(row, ['lab date']),
          followupFrequency: this.findColumn(row, ['frequency']),
          previousFeedback: this.findColumn(row, ['previous']),
          dueFollowupDate: this.findColumn(row, ['due date', 'due follow']),
          followupStatus: this.findColumn(row, ['follow-up status', 'followup status']),
          followupFeedback: this.findColumn(row, ['follow-up feedback', 'followup feedback']),
          medicationPrescribed: this.findColumn(row, ['medication']),
          nextFollowup: this.findColumn(row, ['next follow']),
          dispenseStatus: this.findColumn(row, ['dispense']),
          refillFrequency: this.findColumn(row, ['refill frequency']),
          refillDate: this.findColumn(row, ['refill date'])
        };
      }
    }
    return null;
  }
  
  findColumn(row, searchTerms) {
    for (let i = 0; i < row.length; i++) {
      const cell = row[i]?.toString().toLowerCase() || '';
      for (const term of searchTerms) {
        if (cell.includes(term.toLowerCase())) return i;
      }
    }
    return -1;
  }

  isHeaderRow(patientId, name) {
    const id = patientId?.toString().toLowerCase() || '';
    const nm = name?.toString().toLowerCase() || '';
    
    return id.includes('patient') || id.includes('tag') || id.includes('ccp') ||
           nm.includes('name') || nm.includes('patient') || id.includes('enrollment') ||
           id === 'active' || id === 'inactive';
  }

  validatePatient(patient) {
    const errors = [];
    if (!patient.patientId) errors.push('Missing Patient ID');
    if (!patient.name) errors.push('Missing Patient Name');
    if (!patient.dateEnrolled) errors.push('Missing Date Enrolled');
    return errors;
  }

  extractMonth(sheetName) {
    const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 
                    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    for (let i = 0; i < months.length; i++) {
      if (sheetName.toUpperCase().includes(months[i])) {
        return i + 1;
      }
    }
    return new Date().getMonth() + 1;
  }

  extractYear(sheetName) {
    const yearMatch = sheetName.match(/20\\d{2}/);
    return yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();
  }

  extractInsurer(sheetName) {
    const insurers = ['CIC', 'BRITAM', 'MADISON', 'NHIF', 'AAR', 'JUBILEE', 'HERITAGE', 'RESOLUTION'];
    const upperSheet = sheetName.toUpperCase();
    
    for (const insurer of insurers) {
      if (upperSheet.includes(insurer)) {
        return insurer;
      }
    }
    
    const parts = sheetName.split(/[-_\s]+/);
    for (const part of parts) {
      const cleanPart = part.trim().toUpperCase();
      if (cleanPart.length > 2 && !['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'].includes(cleanPart)) {
        return cleanPart;
      }
    }
    
    return 'UNKNOWN';
  }

  async processPatient(patientData, doctor, transaction) {
    // Skip if has validation errors
    if (patientData.errors && patientData.errors.length > 0) {
      this.importStats.skipped++;
      return;
    }

    // Find or create patient
    let patient = await this.findOrCreatePatient(patientData, doctor.id, transaction);
    
    // Create or update CCP record
    await this.createOrUpdateCCPRecord(patient, patientData, doctor.id, transaction);
  }

  async findOrCreatePatient(patientData, doctorId, transaction) {
    // Try to find existing patient
    let patient = await Patient.findOne({
      where: {
        [Op.or]: [
          { patientNumber: patientData.patientId },
          { 
            [Op.and]: [
              { surname: this.extractSurname(patientData.name) },
              { otherNames: this.extractOtherNames(patientData.name) }
            ]
          }
        ]
      },
      transaction
    });

    if (patient) {
      // Update existing patient
      await this.updatePatient(patient, patientData, transaction);
      this.importStats.patientsUpdated++;
      return patient;
    } else {
      // Create new patient
      patient = await this.createPatient(patientData, doctorId, transaction);
      this.importStats.patientsCreated++;
      return patient;
    }
  }

  async createPatient(patientData, doctorId, transaction) {
    console.log('Creating patient:', patientData.patientId);
    
    const patientNumber = await this.generatePatientNumber(transaction);
    const cleanedPhone = await this.cleanPhone(patientData.contact, transaction);
    
    const patientCreateData = {
      patientNumber,
      surname: this.extractSurname(patientData.name),
      otherNames: this.extractOtherNames(patientData.name),
      sex: this.normalizeGender(patientData.gender),
      dateOfBirth: this.calculateDateOfBirth(patientData.age),
      telephone1: cleanedPhone,
      telephone2: await this.cleanPhone(patientData.nextOfKinContact, transaction),
      residence: patientData.location || 'Not specified',
      town: this.extractTown(patientData.location),
      nationality: 'Kenyan',
      occupation: 'Not specified',
      idType: 'NATIONAL_ID',
      idNumber: 'CCP-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      isCCPEnrolled: true,
      ccpEnrollmentDate: this.parseDate(patientData.dateEnrolled) || new Date(),
      status: patientData.enrollmentStatus === 'ACTIVE' ? 'WAITING' : 'INACTIVE',
      paymentScheme: this.parseInsurance(patientData.insurance || patientData.insurer),
      medicalHistory: patientData.condition ? { 
        existingConditions: [patientData.condition],
        allergies: []
      } : { existingConditions: [], allergies: [] },
      isActive: true
    };
    
    console.log('Patient data to create:', JSON.stringify(patientCreateData, null, 2));
    
    try {
      // Test database connection first
      await sequelize.authenticate();
      console.log('Database connection OK');
      
      const patient = await Patient.create(patientCreateData, { 
        transaction,
        timeout: 10000 // 10 second timeout
      });
      console.log('Patient created successfully:', patient.id);
      return patient;
    } catch (error) {
      console.error('Error creating patient:', error.message);
      if (error.name === 'SequelizeConnectionError') {
        console.error('Database connection lost!');
      }
      throw error;
    }
  }

  async updatePatient(patient, patientData, transaction) {
    const updates = {
      isCCPEnrolled: true,
      ccpEnrollmentDate: this.parseDate(patientData.dateEnrolled) || patient.ccpEnrollmentDate || new Date(),
      status: patientData.enrollmentStatus === 'ACTIVE' ? 'WAITING' : 'INACTIVE'
    };

    // Update contact if provided and different
    if (patientData.contact && this.cleanPhone(patientData.contact) !== patient.telephone1) {
      updates.telephone1 = this.cleanPhone(patientData.contact);
    }

    // Update next of kin contact
    if (patientData.nextOfKinContact && this.cleanPhone(patientData.nextOfKinContact) !== patient.telephone2) {
      updates.telephone2 = this.cleanPhone(patientData.nextOfKinContact);
    }

    // Update location if provided
    if (patientData.location && patientData.location !== patient.residence) {
      updates.residence = patientData.location;
      updates.town = this.extractTown(patientData.location);
    }

    // Update insurance if provided
    if (patientData.insurance || patientData.insurer) {
      updates.paymentScheme = this.parseInsurance(patientData.insurance || patientData.insurer);
    }

    // Update medical history if condition provided
    if (patientData.condition) {
      const existingHistory = patient.medicalHistory || { existingConditions: [], allergies: [] };
      const conditions = existingHistory.existingConditions || [];
      if (!conditions.includes(patientData.condition)) {
        conditions.push(patientData.condition);
        updates.medicalHistory = { ...existingHistory, existingConditions: conditions };
      }
    }

    await patient.update(updates, { transaction });
    return patient;
  }

  async createOrUpdateCCPRecord(patient, patientData, doctorId, transaction) {
    const month = patientData.month || new Date().getMonth() + 1;
    const year = patientData.year || new Date().getFullYear();

    // Check if CCP record already exists for this month/year
    const existingCCP = await CCP.findOne({
      where: {
        patientId: patient.id,
        followupMonth: month,
        followupYear: year
      },
      transaction
    });

    const ccpData = {
      patientId: patient.id,
      followupMonth: month,
      followupYear: year,
      followupFrequency: this.normalizeFrequency(patientData.followupFrequency),
      nextFollowupDate: this.parseDate(patientData.nextFollowup),
      dueFollowupDate: this.parseDate(patientData.dueFollowupDate),
      followupType: 'ROUTINE',
      followupMode: this.normalizeFollowupMode(patientData.followupStatus),
      scheduledBy: doctorId,
      status: this.normalizeFollowupStatus(patientData.followupStatus),
      followupFeedback: patientData.followupFeedback,
      previousFollowupFeedback: patientData.previousFeedback,
      labTestsPerformed: patientData.labTest ? [{ 
        test: patientData.labTest, 
        date: patientData.labDate 
      }] : [],
      medicationsPrescribed: patientData.medicationPrescribed ? 
        [patientData.medicationPrescribed] : [],
      medicationDispenseStatus: patientData.dispenseStatus,
      refillFrequency: patientData.refillFrequency,
      nextRefillDate: this.parseDate(patientData.refillDate),
      isFollowupCompleted: this.isFollowupCompleted(patientData.followupStatus),
      actualFollowupDate: this.isFollowupCompleted(patientData.followupStatus) ? new Date() : null,
      completedBy: this.isFollowupCompleted(patientData.followupStatus) ? doctorId : null
    };

    if (existingCCP) {
      await existingCCP.update(ccpData, { transaction });
      this.importStats.ccpRecordsUpdated++;
    } else {
      await CCP.create(ccpData, { transaction });
      this.importStats.ccpRecordsCreated++;
    }
  }

  // Helper methods (same as in controller)
  async generatePatientNumber(transaction) {
    const lastPatient = await Patient.findOne({
      where: {
        patientNumber: {
          [Op.like]: 'ZH%'
        }
      },
      order: [['patientNumber', 'DESC']],
      transaction
    });

    if (!lastPatient) {
      return 'ZH000001';
    }

    const lastNumber = parseInt(lastPatient.patientNumber.replace('ZH', ''));
    const nextNumber = (lastNumber + 1).toString().padStart(6, '0');
    return `ZH${nextNumber}`;
  }

  extractSurname(fullName) {
    if (!fullName) return 'Unknown';
    const parts = fullName.trim().split(' ');
    return parts[0];
  }

  extractOtherNames(fullName) {
    if (!fullName) return 'Unknown';
    const parts = fullName.trim().split(' ');
    return parts.slice(1).join(' ') || 'Unknown';
  }

  normalizeGender(gender) {
    if (!gender) return 'OTHER';
    const g = gender.toString().toUpperCase();
    if (g.includes('FEMALE') || g === 'F') return 'FEMALE';
    if (g.includes('MALE') || g === 'M') return 'MALE';
    return 'OTHER';
  }

  calculateDateOfBirth(age) {
    if (!age) return new Date('1990-01-01');
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - parseInt(age);
    return new Date(`${birthYear}-01-01`);
  }

  async cleanPhone(phone, transaction) {
    if (!phone || phone.toString().trim() === '') {
      return await this.generateUniquePhone(transaction);
    }
    
    const cleaned = phone.toString().replace(/\D/g, '');
    if (cleaned.length === 0) {
      return await this.generateUniquePhone(transaction);
    }
    
    // Handle valid phone numbers
    let formattedPhone;
    if (cleaned.startsWith('254')) {
      formattedPhone = `+${cleaned}`;
    } else if (cleaned.startsWith('0')) {
      formattedPhone = `+254${cleaned.substring(1)}`;
    } else if (cleaned.length === 9) {
      formattedPhone = `+254${cleaned}`;
    } else if (cleaned.length < 9) {
      return await this.generateUniquePhone(transaction);
    } else {
      formattedPhone = phone.toString();
    }
    
    // Check if phone already exists
    const existing = await Patient.findOne({
      where: { telephone1: formattedPhone },
      transaction
    });
    
    if (existing) {
      return await this.generateUniquePhone(transaction);
    }
    
    return formattedPhone;
  }

  async generateUniquePhone(transaction) {
    let attempts = 0;
    while (attempts < 10) {
      const prefix = '+254700';
      const randomSuffix = Math.floor(Math.random() * 900000) + 100000;
      const phone = `${prefix}${randomSuffix}`;
      
      const existing = await Patient.findOne({
        where: { telephone1: phone },
        transaction
      });
      
      if (!existing) {
        return phone;
      }
      attempts++;
    }
    
    // Fallback with timestamp
    const timestamp = Date.now().toString().slice(-6);
    return `+254700${timestamp}`;
  }

  extractTown(location) {
    if (!location) return 'Not specified';
    const parts = location.split(',');
    return parts[parts.length - 1].trim();
  }

  parseInsurance(insurance) {
    if (!insurance) return { type: 'CASH', provider: null };
    
    const insuranceStr = insurance.toString().toUpperCase();
    if (insuranceStr.includes('NHIF')) {
      return { type: 'NHIF', provider: 'NHIF' };
    }
    if (insuranceStr.includes('INSURANCE') || insuranceStr.includes('COVER')) {
      return { type: 'INSURANCE', provider: insurance };
    }
    return { type: 'CASH', provider: null };
  }

  parseDate(dateStr) {
    if (!dateStr) return null;
    
    try {
      // Handle Excel serial date numbers
      if (typeof dateStr === 'number') {
        const excelEpoch = new Date(1900, 0, 1);
        const days = dateStr - 2; // Excel bug: treats 1900 as leap year
        return new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
      }
      
      const formats = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY'];
      for (const format of formats) {
        const parsed = moment(dateStr, format, true);
        if (parsed.isValid()) {
          return parsed.toDate();
        }
      }
      
      const natural = new Date(dateStr);
      if (!isNaN(natural.getTime())) {
        return natural;
      }
    } catch (error) {
      log('Date parsing error', { dateStr, error: error.message });
    }
    
    return null;
  }

  normalizeFrequency(frequency) {
    if (!frequency) return '1_MONTH';
    
    const freq = frequency.toString().toUpperCase();
    if (freq.includes('WEEK')) return '1_WEEK';
    if (freq.includes('2') && freq.includes('MONTH')) return '2_MONTHS';
    if (freq.includes('3') && freq.includes('MONTH')) return '3_MONTHS';
    if (freq.includes('6') && freq.includes('MONTH')) return '6_MONTHS';
    if (freq.includes('MONTH')) return '1_MONTH';
    
    return '1_MONTH';
  }

  normalizeFollowupStatus(status) {
    if (!status) return 'SCHEDULED';
    
    const statusStr = status.toString().toUpperCase();
    if (statusStr.includes('COMPLETE') || statusStr.includes('DONE')) return 'COMPLETED';
    if (statusStr.includes('CANCEL')) return 'CANCELLED';
    if (statusStr.includes('RESCHEDULE')) return 'RESCHEDULED';
    if (statusStr.includes('PROGRESS')) return 'IN_PROGRESS';
    
    return 'SCHEDULED';
  }

  isFollowupCompleted(status) {
    if (!status) return false;
    const statusStr = status.toString().toUpperCase();
    return statusStr.includes('COMPLETE') || statusStr.includes('DONE') || statusStr.includes('REACHABLE');
  }

  normalizeFollowupMode(status) {
    if (!status) return 'IN_PERSON';
    const statusStr = status.toString().toUpperCase();
    if (statusStr.includes('PHONE') || statusStr.includes('CALL') || statusStr.includes('CONTACTED')) return 'PHONE_CALL';
    if (statusStr.includes('SMS') || statusStr.includes('TEXT')) return 'SMS';
    return 'IN_PERSON';
  }

  printSummary() {
    console.log('\\n📊 CCP Import Summary:');
    console.log('========================');
    console.log(`📄 Sheets processed: ${this.importStats.totalSheets}`);
    console.log(`👥 Total patients: ${this.importStats.totalPatients}`);
    console.log(`✅ Patients created: ${this.importStats.patientsCreated}`);
    console.log(`🔄 Patients updated: ${this.importStats.patientsUpdated}`);
    console.log(`📋 CCP records created: ${this.importStats.ccpRecordsCreated}`);
    console.log(`🔄 CCP records updated: ${this.importStats.ccpRecordsUpdated}`);
    console.log(`⚠️  Records skipped: ${this.importStats.skipped}`);
    console.log(`❌ Errors: ${this.importStats.errors.length}`);
    
    if (this.importStats.errors.length > 0) {
      console.log('\\n❌ First 10 Errors:');
      this.importStats.errors.slice(0, 10).forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
  }
}

// CLI usage with sheet-by-sheet processing
async function main() {
  try {
    console.log('\n=== CCP Bulk Import (Sheet by Sheet) ===');
    
    // Find Excel files in project root
    const projectRoot = path.dirname(__dirname);
    const files = fs.readdirSync(projectRoot)
      .filter(file => file.toLowerCase().endsWith('.xlsx'))
      .map((file, index) => ({ index: index + 1, name: file, path: path.join(projectRoot, file) }));
    
    if (files.length === 0) {
      console.log('No Excel files found in project root.');
      return;
    }
    
    console.log('\nAvailable Excel files:');
    files.forEach(file => {
      console.log(`${file.index}. ${file.name}`);
    });
    
    // Get file selection
    const selection = await new Promise((resolve) => {
      rl.question(`\nSelect file (1-${files.length}): `, resolve);
    });
    
    const selectedIndex = parseInt(selection) - 1;
    if (selectedIndex < 0 || selectedIndex >= files.length) {
      console.log('Invalid selection. Exiting.');
      return;
    }
    
    const filePath = files[selectedIndex].path;
    console.log(`Selected: ${files[selectedIndex].name}`);

    // Get available doctors
    console.log('\nFetching available doctors...');
    const doctors = await User.findAll({
      where: {
        role: 'DOCTOR',
        isActive: true
      },
      attributes: ['id', 'surname', 'otherNames', 'email']
    });
    
    if (doctors.length === 0) {
      console.log('No active doctors found.');
      return;
    }
    
    console.log('\nAvailable doctors:');
    doctors.forEach((doctor, index) => {
      console.log(`${index + 1}. ${doctor.surname} ${doctor.otherNames} (${doctor.email})`);
    });
    
    const doctorSelection = await new Promise((resolve) => {
      rl.question(`\nSelect doctor (1-${doctors.length}): `, resolve);
    });
    
    const selectedDoctorIndex = parseInt(doctorSelection) - 1;
    if (selectedDoctorIndex < 0 || selectedDoctorIndex >= doctors.length) {
      console.log('Invalid doctor selection. Exiting.');
      return;
    }
    
    const selectedDoctor = doctors[selectedDoctorIndex];
    console.log(`Selected doctor: ${selectedDoctor.surname} ${selectedDoctor.otherNames}`);



    // Read the workbook
    console.log('\nReading Excel file...');
    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames.filter(name => 
      !name.toUpperCase().includes('TASK') && 
      !name.toUpperCase().includes('DISCONTINUATION') &&
      !name.toUpperCase().includes('DISCONTINUED')
    );
    
    console.log(`Found ${sheetNames.length} sheets to process:`, sheetNames);

    let totalProcessed = 0;
    let totalErrors = 0;

    // Process each sheet with confirmation
    for (let i = 0; i < sheetNames.length; i++) {
      const sheetName = sheetNames[i];
      
      console.log(`\n--- Sheet ${i + 1}/${sheetNames.length}: ${sheetName} ---`);
      
      // Ask for confirmation before processing
      const proceed = await askQuestion(`Process sheet "${sheetName}"? (y/n/q to quit): `);
      
      if (proceed === 'q' || proceed === 'quit') {
        console.log('Stopping import as requested.');
        break;
      }
      
      if (proceed !== 'y' && proceed !== 'yes') {
        console.log(`Skipping sheet: ${sheetName}`);
        continue;
      }
      
      try {
        console.log(`Processing sheet: ${sheetName}...`);
        const result = await processSheet(workbook, sheetName, selectedDoctor);
        totalProcessed += result.processed;
        totalErrors += result.errors;
        
        console.log(`✅ Sheet ${sheetName} completed: ${result.processed} processed, ${result.errors} errors`);
        
      } catch (error) {
        console.error(`❌ Error processing sheet ${sheetName}:`, error.message);
        totalErrors++;
        
        const continueOnError = await askQuestion('Continue with next sheet? (y/n): ');
        if (continueOnError !== 'y' && continueOnError !== 'yes') {
          break;
        }
      }
    }

    console.log(`\n=== Import Complete ===`);
    console.log(`Total records processed: ${totalProcessed}`);
    console.log(`Total errors: ${totalErrors}`);

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    rl.close();
    await sequelize.close();
  }
}

// Process a single sheet
async function processSheet(workbook, sheetName, selectedDoctor) {
  const transaction = await sequelize.transaction();
  
  try {
    const importer = new CCPBulkImporter();

    // Parse single sheet
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const patients = importer.parseSheetData(jsonData, sheetName);
    
    console.log(`Found ${patients.length} patients in sheet`);
    
    // Show preview of data
    if (patients.length > 0) {
      console.log('\n--- Data Preview ---');
      patients.slice(0, 3).forEach((patient, index) => {
        console.log(`${index + 1}. ID: ${patient.patientId}, Name: ${patient.name}, Contact: ${patient.contact}`);
        console.log(`   Gender: ${patient.gender}, Age: ${patient.age}, Location: ${patient.location}`);
        console.log(`   Condition: ${patient.condition}, Status: ${patient.enrollmentStatus}`);
        if (patient.errors && patient.errors.length > 0) {
          console.log(`   ⚠️  Errors: ${patient.errors.join(', ')}`);
        }
        console.log('');
      });
      
      if (patients.length > 3) {
        console.log(`... and ${patients.length - 3} more patients`);
      }
    }
    
    // Ask for confirmation
    const processAll = await askQuestion(`Process all ${patients.length} patients? (y/n/s for select individual): `);
    
    if (processAll === 'n' || processAll === 'no') {
      console.log('Skipping sheet.');
      await transaction.rollback();
      return { processed: 0, errors: 0 };
    }
    
    let patientsToProcess = patients;
    
    if (processAll === 's' || processAll === 'select') {
      patientsToProcess = [];
      for (let i = 0; i < patients.length; i++) {
        const patient = patients[i];
        console.log(`\n${i + 1}/${patients.length}: ${patient.patientId} - ${patient.name}`);
        const processThis = await askQuestion('Process this patient? (y/n): ');
        if (processThis === 'y' || processThis === 'yes') {
          patientsToProcess.push(patient);
        }
      }
    }
    
    console.log(`\nProcessing ${patientsToProcess.length} patients...`);
    
    let processed = 0;
    let errors = 0;

    // Process selected patients
    for (const patientData of patientsToProcess) {
      try {
        console.log(`Processing: ${patientData.patientId} - ${patientData.name}...`);
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Operation timeout after 30 seconds')), 30000)
        );
        
        await Promise.race([
          importer.processPatient(patientData, selectedDoctor, transaction),
          timeoutPromise
        ]);
        
        processed++;
        console.log(`✅ Processed: ${patientData.patientId} - ${patientData.name}`);
      } catch (error) {
        console.error(`❌ Error processing patient ${patientData.patientId}:`, error.message);
        console.error('Full error:', error);
        errors++;
        
        // If it's a constraint violation, continue with next patient
        if (error.message.includes('duplicate') || error.message.includes('constraint')) {
          console.log('Continuing with next patient...');
          continue;
        }
        
        // For other errors, ask if we should continue
        const continueProcessing = await askQuestion('Continue with next patient? (y/n): ');
        if (continueProcessing !== 'y' && continueProcessing !== 'yes') {
          break;
        }
      }
    }

    await transaction.commit();
    return { processed, errors };

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { CCPBulkImporter };