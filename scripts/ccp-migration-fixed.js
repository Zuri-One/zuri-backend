#!/usr/bin/env node

require('dotenv').config();
const XLSX = require('xlsx');
const { Patient, User, CCP, MedicalRecord, sequelize } = require('../src/models');
const { Op } = require('sequelize');
const moment = require('moment');

class CCPMigrationFixed {
  constructor() {
    this.stats = {
      patientsProcessed: 0,
      patientsUpdated: 0,
      patientsCreated: 0,
      ccpRecordsCreated: 0,
      ccpRecordsUpdated: 0,
      medicalRecordsCreated: 0,
      errors: []
    };

    // Doctor mapping based on Excel files
    this.doctorMapping = {
      'georgina': {
        id: '50ab7923-a67d-4284-8f10-b4c1aa28c9a4',
        name: 'Dr. Georgina Nyaka',
        file: 'Copy of DR. GEORGINA NYAKA - MADISON & CiC _ CCP 2025.xlsx',
        insurers: ['MADISON', 'CIC']
      },
      'antony': {
        id: 'e4839717-1f77-4c45-b7ed-853b95e758ec', 
        name: 'Dr. Antony Ndegwa',
        file: 'Copy of DR. ANTONY NDUATI - KPLC , MINET & PACIS _ CCP 2025.xlsx',
        insurers: ['KPLC', 'MINET', 'PACIS']
      },
      'esther': {
        id: '747d9c52-4a3b-4abe-a0c6-e5fe45e348eb',
        name: 'Dr. Esther Ogembo', 
        file: 'Copy of DR. ESTHER OGEMBO - BRITAM & GA _ CCP 2025.xlsx',
        insurers: ['BRITAM', 'GA']
      }
    };
  }

  async migrate() {
    console.log('🚀 Starting CCP Migration (Fixed)...\n');

    try {
      // Process each doctor's Excel file
      for (const [doctorKey, doctorInfo] of Object.entries(this.doctorMapping)) {
        console.log(`📋 Processing ${doctorInfo.name} - ${doctorInfo.file}`);
        await this.processDoctorFile(doctorKey, doctorInfo);
        console.log('');
      }

      this.printSummary();
      
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  }

  async processDoctorFile(doctorKey, doctorInfo) {
    const filePath = `./${doctorInfo.file}`;
    
    try {
      // Read Excel file
      const workbook = XLSX.readFile(filePath);
      const sheets = this.parseWorkbook(workbook, doctorInfo);
      
      console.log(`   Found ${Object.keys(sheets).length} valid sheets`);
      
      // Process each sheet
      for (const [sheetName, patients] of Object.entries(sheets)) {
        console.log(`   📄 Processing sheet: ${sheetName} (${patients.length} patients)`);
        
        for (const patientData of patients) {
          await this.processPatient(patientData, doctorInfo, sheetName);
        }
      }
      
    } catch (error) {
      console.error(`   ❌ Error processing ${doctorInfo.file}:`, error.message);
      this.stats.errors.push(`${doctorInfo.name}: ${error.message}`);
    }
  }

  parseWorkbook(workbook, doctorInfo) {
    const sheets = {};
    
    for (const sheetName of workbook.SheetNames) {
      // Skip task/discontinuation sheets
      if (this.shouldSkipSheet(sheetName)) continue;
      
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      const patients = this.parseSheetData(jsonData, sheetName, doctorInfo);
      if (patients.length > 0) {
        sheets[sheetName] = patients;
      }
    }
    
    return sheets;
  }

  shouldSkipSheet(sheetName) {
    const skipKeywords = ['TASK', 'DISCONTINUATION', 'DISCONTINUED', 'SUMMARY'];
    return skipKeywords.some(keyword => 
      sheetName.toUpperCase().includes(keyword)
    );
  }

  parseSheetData(jsonData, sheetName, doctorInfo) {
    const patients = [];
    
    // Find header row
    const columnMap = this.detectColumns(jsonData);
    if (!columnMap) return [];
    
    // Parse data rows
    for (let i = columnMap.headerRow + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length === 0) continue;
      
      const patientId = this.cleanValue(row[columnMap.patientId]);
      const name = this.cleanValue(row[columnMap.name]);
      
      if (!patientId || !name || this.isHeaderRow(patientId, name)) continue;
      
      const patient = {
        originalPatientId: patientId,
        name: name,
        surname: this.extractSurname(name),
        otherNames: this.extractOtherNames(name),
        gender: this.normalizeGender(row[columnMap.gender]),
        age: this.cleanValue(row[columnMap.age]),
        contact: this.cleanValue(row[columnMap.contact]),
        location: this.cleanValue(row[columnMap.location]),
        dateEnrolled: this.cleanValue(row[columnMap.dateEnrolled]),
        condition: this.cleanValue(row[columnMap.condition]),
        followupStatus: this.cleanValue(row[columnMap.followupStatus]),
        followupFeedback: this.cleanValue(row[columnMap.followupFeedback]),
        labTest: this.cleanValue(row[columnMap.labTest]),
        medication: this.cleanValue(row[columnMap.medication]),
        nextFollowup: this.cleanValue(row[columnMap.nextFollowup]),
        
        // Extracted metadata
        month: this.extractMonth(sheetName),
        year: this.extractYear(sheetName),
        insurer: this.extractInsurer(sheetName, doctorInfo),
        sheetName: sheetName,
        doctorInfo: doctorInfo
      };
      
      patients.push(patient);
    }
    
    return patients;
  }

  detectColumns(jsonData) {
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
          gender: this.findColumn(row, ['gender', 'sex']),
          age: this.findColumn(row, ['age']),
          contact: this.findColumn(row, ['contact', 'phone']),
          location: this.findColumn(row, ['location', 'address']),
          dateEnrolled: this.findColumn(row, ['date enrolled', 'enrolled']),
          condition: this.findColumn(row, ['condition', 'diagnosis']),
          followupStatus: this.findColumn(row, ['follow-up status', 'followup status']),
          followupFeedback: this.findColumn(row, ['follow-up feedback', 'followup feedback']),
          labTest: this.findColumn(row, ['lab test', 'laboratory']),
          medication: this.findColumn(row, ['medication', 'drug']),
          nextFollowup: this.findColumn(row, ['next follow', 'next appointment'])
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

  async processPatient(patientData, doctorInfo, sheetName) {
    const transaction = await sequelize.transaction();
    
    try {
      // Find existing patient by name (fuzzy match)
      let patient = await this.findExistingPatient(patientData, transaction);
      
      if (patient) {
        // Update existing patient
        await this.updateExistingPatient(patient, patientData, doctorInfo, transaction);
        this.stats.patientsUpdated++;
      } else {
        // Create new patient
        patient = await this.createNewPatient(patientData, doctorInfo, transaction);
        this.stats.patientsCreated++;
      }
      
      // Create/update CCP record
      await this.createCCPRecord(patient, patientData, doctorInfo, transaction);
      
      // Create medical record if followup was completed
      if (this.isFollowupCompleted(patientData.followupStatus)) {
        await this.createMedicalRecord(patient, patientData, doctorInfo, transaction);
      }
      
      await transaction.commit();
      this.stats.patientsProcessed++;
      
    } catch (error) {
      await transaction.rollback();
      this.stats.errors.push(`${patientData.name}: ${error.message}`);
      console.error(`     ❌ Error processing ${patientData.name}:`, error.message);
    }
  }

  async findExistingPatient(patientData, transaction) {
    // Try exact name match first
    let patient = await Patient.findOne({
      where: {
        surname: patientData.surname,
        otherNames: patientData.otherNames
      },
      transaction
    });
    
    if (patient) return patient;
    
    // Try fuzzy name match
    const patients = await Patient.findAll({
      where: {
        [Op.or]: [
          { surname: { [Op.iLike]: `%${patientData.surname}%` } },
          { otherNames: { [Op.iLike]: `%${patientData.otherNames}%` } }
        ]
      },
      transaction
    });
    
    // Find best match
    for (const p of patients) {
      const similarity = this.calculateNameSimilarity(
        `${patientData.surname} ${patientData.otherNames}`,
        `${p.surname} ${p.otherNames}`
      );
      if (similarity > 0.8) return p;
    }
    
    return null;
  }

  calculateNameSimilarity(name1, name2) {
    const normalize = (str) => str.toLowerCase().replace(/[^a-z]/g, '');
    const n1 = normalize(name1);
    const n2 = normalize(name2);
    
    if (n1 === n2) return 1;
    
    const longer = n1.length > n2.length ? n1 : n2;
    const shorter = n1.length > n2.length ? n2 : n1;
    
    if (longer.length === 0) return 1;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  async updateExistingPatient(patient, patientData, doctorInfo, transaction) {
    const updates = {
      isCCPEnrolled: true,
      ccpEnrollmentDate: this.parseDate(patientData.dateEnrolled) || patient.ccpEnrollmentDate || new Date('2025-01-01')
    };
    
    // Update contact if provided
    if (patientData.contact) {
      const cleanPhone = this.cleanPhone(patientData.contact);
      if (cleanPhone && cleanPhone !== patient.telephone1) {
        updates.telephone1 = cleanPhone;
      }
    }
    
    // Update location if provided
    if (patientData.location) {
      updates.residence = patientData.location;
      updates.town = this.extractTown(patientData.location);
    }
    
    // Update medical history
    if (patientData.condition) {
      const existingHistory = patient.medicalHistory || { existingConditions: [], allergies: [] };
      const conditions = existingHistory.existingConditions || [];
      if (!conditions.includes(patientData.condition)) {
        conditions.push(patientData.condition);
        updates.medicalHistory = { ...existingHistory, existingConditions: conditions };
      }
    }
    
    await patient.update(updates, { transaction });
  }

  async createNewPatient(patientData, doctorInfo, transaction) {
    const patientNumber = await this.generatePatientNumber(transaction);
    const cleanPhone = this.cleanPhone(patientData.contact) || await this.generateUniquePhone(transaction);
    
    const patientCreateData = {
      patientNumber,
      surname: patientData.surname,
      otherNames: patientData.otherNames,
      sex: patientData.gender || 'FEMALE',
      dateOfBirth: this.calculateDateOfBirth(patientData.age),
      telephone1: cleanPhone,
      residence: patientData.location || 'Not specified',
      town: this.extractTown(patientData.location),
      nationality: 'Kenyan',
      occupation: 'Not specified',
      idType: 'NATIONAL_ID',
      idNumber: `CCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      isCCPEnrolled: true,
      ccpEnrollmentDate: this.parseDate(patientData.dateEnrolled) || new Date('2025-01-01'),
      status: 'WAITING',
      paymentScheme: this.parseInsurance(patientData.insurer),
      medicalHistory: patientData.condition ? {
        existingConditions: [patientData.condition],
        allergies: []
      } : { existingConditions: [], allergies: [] },
      isActive: true
    };
    
    return await Patient.create(patientCreateData, { transaction });
  }

  async createCCPRecord(patient, patientData, doctorInfo, transaction) {
    const month = patientData.month;
    const year = patientData.year;
    
    // Check if CCP record exists
    const existingCCP = await CCP.findOne({
      where: {
        patientId: patient.id,
        followupMonth: month,
        followupYear: year
      },
      transaction
    });
    
    const isCompleted = this.isFollowupCompleted(patientData.followupStatus);
    const ccpData = {
      patientId: patient.id,
      followupMonth: month,
      followupYear: year,
      followupFrequency: '1_MONTH',
      followupType: 'ROUTINE',
      followupMode: this.getFollowupMode(patientData.followupStatus),
      scheduledBy: doctorInfo.id,
      status: isCompleted ? 'COMPLETED' : 'SCHEDULED',
      followupFeedback: patientData.followupFeedback,
      labTestsPerformed: patientData.labTest ? [{ test: patientData.labTest }] : [],
      medicationsPrescribed: patientData.medication ? [patientData.medication] : [],
      isFollowupCompleted: isCompleted,
      actualFollowupDate: isCompleted ? new Date() : null,
      completedBy: isCompleted ? doctorInfo.id : null
    };
    
    if (existingCCP) {
      await existingCCP.update(ccpData, { transaction });
      this.stats.ccpRecordsUpdated++;
    } else {
      await CCP.create(ccpData, { transaction });
      this.stats.ccpRecordsCreated++;
    }
    
    // Update patient's lastFollowup if this is completed
    if (isCompleted) {
      await patient.update({ lastFollowup: new Date() }, { transaction });
    }
  }

  async createMedicalRecord(patient, patientData, doctorInfo, transaction) {
    // Check if medical record already exists for this month
    const existingRecord = await MedicalRecord.findOne({
      where: {
        patientId: patient.id,
        doctorId: doctorInfo.id,
        createdAt: {
          [Op.gte]: new Date(patientData.year, patientData.month - 1, 1),
          [Op.lt]: new Date(patientData.year, patientData.month, 1)
        }
      },
      transaction
    });
    
    if (!existingRecord) {
      const recordData = {
        patientId: patient.id,
        doctorId: doctorInfo.id,
        complaints: 'CCP Follow-up visit',
        diagnosis: patientData.condition || 'Chronic condition follow-up',
        notes: patientData.followupFeedback || 'CCP follow-up completed',
        status: 'COMPLETED'
      };
      
      await MedicalRecord.create(recordData, { transaction });
      this.stats.medicalRecordsCreated++;
      
      // Update patient's lastVisit
      await patient.update({ lastVisit: new Date() }, { transaction });
    }
  }

  // Helper methods
  cleanValue(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') {
      return value.trim() === '' ? null : value.trim();
    }
    return value;
  }

  isHeaderRow(patientId, name) {
    const id = patientId?.toString().toLowerCase() || '';
    const nm = name?.toString().toLowerCase() || '';
    
    return id.includes('patient') || id.includes('tag') || id.includes('ccp') ||
           nm.includes('name') || nm.includes('patient') || id.includes('enrollment');
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
    if (!gender) return 'FEMALE';
    const g = gender.toString().toUpperCase();
    if (g.includes('MALE') && !g.includes('FEMALE')) return 'MALE';
    if (g.includes('FEMALE')) return 'FEMALE';
    return 'FEMALE';
  }

  calculateDateOfBirth(age) {
    if (!age) return new Date('1990-01-01');
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - parseInt(age);
    return new Date(`${birthYear}-01-01`);
  }

  cleanPhone(phone) {
    if (!phone) return null;
    
    const cleaned = phone.toString().replace(/\D/g, '');
    if (cleaned.length === 0) return null;
    
    if (cleaned.startsWith('254')) {
      return `+${cleaned}`;
    } else if (cleaned.startsWith('0')) {
      return `+254${cleaned.substring(1)}`;
    } else if (cleaned.length === 9) {
      return `+254${cleaned}`;
    }
    
    return null;
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
      
      if (!existing) return phone;
      attempts++;
    }
    
    const timestamp = Date.now().toString().slice(-6);
    return `+254700${timestamp}`;
  }

  async generatePatientNumber(transaction) {
    const lastPatient = await Patient.findOne({
      where: {
        patientNumber: { [Op.like]: 'ZH%' }
      },
      order: [['patientNumber', 'DESC']],
      transaction
    });

    if (!lastPatient) return 'ZH000001';

    const lastNumber = parseInt(lastPatient.patientNumber.replace('ZH', ''));
    const nextNumber = (lastNumber + 1).toString().padStart(6, '0');
    return `ZH${nextNumber}`;
  }

  extractTown(location) {
    if (!location) return 'Not specified';
    const parts = location.split(',');
    return parts[parts.length - 1].trim();
  }

  parseInsurance(insurer) {
    if (!insurer) return { type: 'CASH', provider: null };
    
    const insuranceStr = insurer.toString().toUpperCase();
    if (insuranceStr.includes('NHIF')) {
      return { type: 'NHIF', provider: 'NHIF' };
    }
    return { type: 'INSURANCE', provider: insurer };
  }

  parseDate(dateStr) {
    if (!dateStr) return null;
    
    try {
      if (typeof dateStr === 'number') {
        const excelEpoch = new Date(1900, 0, 1);
        const days = dateStr - 2;
        return new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
      }
      
      const formats = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY'];
      for (const format of formats) {
        const parsed = moment(dateStr, format, true);
        if (parsed.isValid()) return parsed.toDate();
      }
      
      const natural = new Date(dateStr);
      if (!isNaN(natural.getTime())) return natural;
    } catch (error) {
      console.warn('Date parsing error:', dateStr);
    }
    
    return null;
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
    const yearMatch = sheetName.match(/20\d{2}/);
    return yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();
  }

  extractInsurer(sheetName, doctorInfo) {
    const upperSheet = sheetName.toUpperCase();
    
    for (const insurer of doctorInfo.insurers) {
      if (upperSheet.includes(insurer.toUpperCase())) {
        return insurer;
      }
    }
    
    return doctorInfo.insurers[0] || 'UNKNOWN';
  }

  isFollowupCompleted(status) {
    if (!status) return false;
    const statusStr = status.toString().toUpperCase();
    return statusStr.includes('COMPLETE') || statusStr.includes('DONE') || 
           statusStr.includes('REACHABLE') || statusStr.includes('CONTACTED');
  }

  getFollowupMode(status) {
    if (!status) return 'PHONE_CALL';
    const statusStr = status.toString().toUpperCase();
    if (statusStr.includes('PHONE') || statusStr.includes('CALL')) return 'PHONE_CALL';
    if (statusStr.includes('SMS')) return 'SMS';
    if (statusStr.includes('VISIT')) return 'IN_PERSON';
    return 'PHONE_CALL';
  }

  printSummary() {
    console.log('\n📊 CCP Migration Summary:');
    console.log('========================');
    console.log(`👥 Patients processed: ${this.stats.patientsProcessed}`);
    console.log(`✅ Patients created: ${this.stats.patientsCreated}`);
    console.log(`🔄 Patients updated: ${this.stats.patientsUpdated}`);
    console.log(`📋 CCP records created: ${this.stats.ccpRecordsCreated}`);
    console.log(`🔄 CCP records updated: ${this.stats.ccpRecordsUpdated}`);
    console.log(`🏥 Medical records created: ${this.stats.medicalRecordsCreated}`);
    console.log(`❌ Errors: ${this.stats.errors.length}`);
    
    if (this.stats.errors.length > 0) {
      console.log('\n❌ First 10 Errors:');
      this.stats.errors.slice(0, 10).forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
  }
}

async function main() {
  try {
    const migrator = new CCPMigrationFixed();
    await migrator.migrate();
    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = CCPMigrationFixed;