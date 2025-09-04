#!/usr/bin/env node

require('dotenv').config();
const XLSX = require('xlsx');
const { Patient, User, CCP, MedicalRecord, sequelize } = require('../src/models');
const { Op } = require('sequelize');
const moment = require('moment');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase().trim());
    });
  });
}

class CCPMigrationSafe {
  constructor() {
    this.doctorMapping = {
      'georgina': {
        id: '50ab7923-a67d-4284-8f10-b4c1aa28c9a4',
        name: 'Dr. Georgina Nyaka',
        file: 'Copy of DR. GEORGINA NYAKA - MADISON & CiC _ CCP 2025.xlsx'
      },
      'antony': {
        id: 'e4839717-1f77-4c45-b7ed-853b95e758ec', 
        name: 'Dr. Antony Ndegwa',
        file: 'Copy of DR. ANTONY NDUATI - KPLC , MINET & PACIS _ CCP 2025.xlsx'
      },
      'esther': {
        id: '747d9c52-4a3b-4abe-a0c6-e5fe45e348eb',
        name: 'Dr. Esther Ogembo', 
        file: 'Copy of DR. ESTHER OGEMBO - BRITAM & GA _ CCP 2025.xlsx'
      }
    };
  }

  async migrate() {
    console.log('🚀 Starting Safe CCP Migration...\n');

    try {
      // Process each doctor's file
      for (const [doctorKey, doctorInfo] of Object.entries(this.doctorMapping)) {
        console.log(`\n📋 Processing ${doctorInfo.name}`);
        console.log(`📄 File: ${doctorInfo.file}`);
        
        const proceed = await askQuestion(`Process ${doctorInfo.name}? (y/n/q to quit): `);
        if (proceed === 'q') break;
        if (proceed !== 'y') continue;

        await this.processDoctorFile(doctorKey, doctorInfo);
      }

      console.log('\n✅ Migration completed!');
      
    } catch (error) {
      console.error('\n❌ Migration failed:', error.message);
    } finally {
      rl.close();
      await sequelize.close();
    }
  }

  async processDoctorFile(doctorKey, doctorInfo) {
    try {
      const workbook = XLSX.readFile(`./${doctorInfo.file}`);
      const validSheets = workbook.SheetNames.filter(name => !this.shouldSkipSheet(name));
      
      console.log(`\n   Found ${validSheets.length} sheets to process:`);
      validSheets.forEach((sheet, i) => console.log(`   ${i+1}. ${sheet}`));

      // Process each sheet individually
      for (let i = 0; i < validSheets.length; i++) {
        const sheetName = validSheets[i];
        console.log(`\n   📄 Sheet ${i+1}/${validSheets.length}: ${sheetName}`);
        
        const processSheet = await askQuestion(`   Process this sheet? (y/n/s to skip all): `);
        if (processSheet === 's') break;
        if (processSheet !== 'y') continue;

        await this.processSheet(workbook, sheetName, doctorInfo);
      }

    } catch (error) {
      console.error(`   ❌ Error with ${doctorInfo.file}:`, error.message);
    }
  }

  async processSheet(workbook, sheetName, doctorInfo) {
    const stats = { processed: 0, created: 0, updated: 0, errors: 0 };
    
    try {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const patients = this.parseSheetData(jsonData, sheetName, doctorInfo);
      
      console.log(`      Found ${patients.length} patients`);
      if (patients.length === 0) return;

      // Show preview
      console.log('\n      Preview:');
      patients.slice(0, 3).forEach((p, i) => {
        console.log(`      ${i+1}. ${p.name} - ${p.gender} - ${p.location || 'No location'}`);
      });

      const processAll = await askQuestion(`      Process all ${patients.length} patients? (y/n): `);
      if (processAll !== 'y') return;

      // Process patients in small batches
      const batchSize = 10;
      for (let i = 0; i < patients.length; i += batchSize) {
        const batch = patients.slice(i, i + batchSize);
        console.log(`      Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(patients.length/batchSize)}...`);
        
        for (const patientData of batch) {
          try {
            await this.processPatient(patientData, doctorInfo, sheetName);
            stats.processed++;
            process.stdout.write('.');
          } catch (error) {
            stats.errors++;
            console.error(`\n      ❌ Error with ${patientData.name}:`, error.message);
          }
        }
        
        // Small delay to prevent overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`\n      ✅ Sheet completed: ${stats.processed} processed, ${stats.errors} errors`);

    } catch (error) {
      console.error(`      ❌ Sheet processing error:`, error.message);
    }
  }

  async processPatient(patientData, doctorInfo, sheetName) {
    const transaction = await sequelize.transaction();
    
    try {
      // Find existing patient
      let patient = await this.findExistingPatient(patientData, transaction);
      
      if (patient) {
        await this.updateExistingPatient(patient, patientData, doctorInfo, transaction);
      } else {
        patient = await this.createNewPatient(patientData, doctorInfo, transaction);
      }
      
      // Create/update CCP record
      await this.createCCPRecord(patient, patientData, doctorInfo, transaction);
      
      // Create medical record if followup completed
      if (this.isFollowupCompleted(patientData.followupStatus)) {
        await this.createMedicalRecord(patient, patientData, doctorInfo, transaction);
      }
      
      await transaction.commit();
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  parseSheetData(jsonData, sheetName, doctorInfo) {
    const patients = [];
    const columnMap = this.detectColumns(jsonData);
    if (!columnMap) return [];
    
    for (let i = columnMap.headerRow + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length === 0) continue;
      
      const patientId = this.cleanValue(row[columnMap.patientId]);
      const name = this.cleanValue(row[columnMap.name]);
      
      if (!patientId || !name || this.isHeaderRow(patientId, name)) continue;
      
      patients.push({
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
        month: this.extractMonth(sheetName),
        year: this.extractYear(sheetName),
        doctorInfo: doctorInfo
      });
    }
    
    return patients;
  }

  detectColumns(jsonData) {
    // Look for the main header row (usually row 2 with PATIENT ID, PATIENT'S NAME, GENDER, etc.)
    for (let i = 0; i < Math.min(5, jsonData.length); i++) {
      const row = jsonData[i];
      if (!row) continue;
      
      let patientIdCol = -1;
      let nameCol = -1;
      
      for (let j = 0; j < row.length; j++) {
        const cell = row[j]?.toString().toLowerCase() || '';
        if (cell.includes('patient') && cell.includes('id')) patientIdCol = j;
        if (cell.includes('patient') && cell.includes('name')) nameCol = j;
      }
      
      if (patientIdCol >= 0 && nameCol >= 0) {
        return {
          headerRow: i,
          patientId: patientIdCol,
          name: nameCol,
          gender: nameCol + 1, // Gender is typically right after name
          age: nameCol + 2, // Age is typically after gender
          contact: this.findColumn(row, ['contact']),
          location: this.findColumn(row, ['location']),
          dateEnrolled: this.findColumn(row, ['date enrolled', 'enrolled']),
          condition: this.findColumn(row, ['condition', 'underlying']),
          followupStatus: this.findColumn(row, ['follow-up status', 'followup status']),
          followupFeedback: this.findColumn(row, ['follow-up feedback', 'followup feedback'])
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

  async findExistingPatient(patientData, transaction) {
    return await Patient.findOne({
      where: {
        [Op.or]: [
          {
            surname: patientData.surname,
            otherNames: patientData.otherNames
          },
          {
            surname: { [Op.iLike]: `%${patientData.surname}%` },
            otherNames: { [Op.iLike]: `%${patientData.otherNames}%` }
          }
        ]
      },
      transaction
    });
  }

  async updateExistingPatient(patient, patientData, doctorInfo, transaction) {
    const updates = {
      isCCPEnrolled: true,
      ccpEnrollmentDate: this.parseDate(patientData.dateEnrolled) || patient.ccpEnrollmentDate || new Date('2025-01-01')
    };
    
    if (patientData.contact) {
      const cleanPhone = this.cleanPhone(patientData.contact);
      if (cleanPhone && cleanPhone !== patient.telephone1) {
        // Check if phone already exists
        const existingPhone = await Patient.findOne({
          where: { telephone1: cleanPhone },
          transaction
        });
        if (!existingPhone || existingPhone.id === patient.id) {
          updates.telephone1 = cleanPhone;
        }
      }
    }
    
    if (patientData.location) {
      updates.residence = patientData.location;
      updates.town = this.extractTown(patientData.location);
    }
    
    await patient.update(updates, { transaction });
  }

  async createNewPatient(patientData, doctorInfo, transaction) {
    const patientNumber = await this.generatePatientNumber(transaction);
    const cleanPhone = this.cleanPhone(patientData.contact) || await this.generateUniquePhone(transaction);
    
    return await Patient.create({
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
      paymentScheme: { type: 'INSURANCE', provider: 'CCP' },
      medicalHistory: patientData.condition ? {
        existingConditions: [patientData.condition],
        allergies: []
      } : { existingConditions: [], allergies: [] },
      isActive: true
    }, { transaction });
  }

  async createCCPRecord(patient, patientData, doctorInfo, transaction) {
    const month = patientData.month;
    const year = patientData.year;
    
    const existingCCP = await CCP.findOne({
      where: { patientId: patient.id, followupMonth: month, followupYear: year },
      transaction
    });
    
    const isCompleted = this.isFollowupCompleted(patientData.followupStatus);
    const ccpData = {
      patientId: patient.id,
      followupMonth: month,
      followupYear: year,
      followupFrequency: '1_MONTH',
      followupType: 'ROUTINE',
      followupMode: 'PHONE_CALL',
      scheduledBy: doctorInfo.id,
      status: isCompleted ? 'COMPLETED' : 'SCHEDULED',
      followupFeedback: patientData.followupFeedback,
      isFollowupCompleted: isCompleted,
      actualFollowupDate: isCompleted ? new Date() : null,
      completedBy: isCompleted ? doctorInfo.id : null
    };
    
    if (existingCCP) {
      await existingCCP.update(ccpData, { transaction });
    } else {
      await CCP.create(ccpData, { transaction });
    }
    
    if (isCompleted) {
      await patient.update({ lastFollowup: new Date() }, { transaction });
    }
  }

  async createMedicalRecord(patient, patientData, doctorInfo, transaction) {
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
      await MedicalRecord.create({
        patientId: patient.id,
        doctorId: doctorInfo.id,
        complaints: 'CCP Follow-up visit',
        diagnosis: patientData.condition || 'Chronic condition follow-up',
        notes: patientData.followupFeedback || 'CCP follow-up completed',
        status: 'COMPLETED'
      }, { transaction });
      
      await patient.update({ lastVisit: new Date() }, { transaction });
    }
  }

  // Helper methods
  shouldSkipSheet(sheetName) {
    const skipKeywords = ['TASK', 'DISCONTINUATION', 'DISCONTINUED', 'SUMMARY'];
    return skipKeywords.some(keyword => sheetName.toUpperCase().includes(keyword));
  }

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
    return id.includes('patient') || nm.includes('name') || id.includes('tag');
  }

  extractSurname(fullName) {
    if (!fullName) return 'Unknown';
    return fullName.trim().split(' ')[0];
  }

  extractOtherNames(fullName) {
    if (!fullName) return 'Unknown';
    const parts = fullName.trim().split(' ');
    return parts.slice(1).join(' ') || 'Unknown';
  }

  normalizeGender(gender) {
    if (!gender) return 'OTHER';
    const g = gender.toString().toLowerCase().trim();
    if (g === 'male' || g === 'm') return 'MALE';
    if (g === 'female' || g === 'f') return 'FEMALE';
    return 'OTHER';
  }

  calculateDateOfBirth(age) {
    if (!age || isNaN(parseInt(age))) return new Date('1990-01-01');
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - parseInt(age);
    return new Date(`${birthYear}-06-15`); // Use mid-year for better accuracy
  }

  cleanPhone(phone) {
    if (!phone) return null;
    const cleaned = phone.toString().replace(/\D/g, '');
    if (cleaned.length < 9) return null;
    
    if (cleaned.startsWith('254') && cleaned.length === 12) return `+${cleaned}`;
    if (cleaned.startsWith('0') && cleaned.length === 10) return `+254${cleaned.substring(1)}`;
    if (cleaned.length === 9) return `+254${cleaned}`;
    return null;
  }

  async generateUniquePhone(transaction) {
    const prefix = '+254700';
    const randomSuffix = Math.floor(Math.random() * 900000) + 100000;
    return `${prefix}${randomSuffix}`;
  }

  async generatePatientNumber(transaction) {
    const lastPatient = await Patient.findOne({
      where: { patientNumber: { [Op.like]: 'ZH%' } },
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

  parseDate(dateStr) {
    if (!dateStr) return null;
    try {
      // Handle Excel serial date numbers
      if (typeof dateStr === 'number' && dateStr > 1000) {
        const excelEpoch = new Date(1900, 0, 1);
        const days = dateStr - 2; // Excel bug: treats 1900 as leap year
        return new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
      }
      
      // Handle string dates
      const dateString = dateStr.toString().trim();
      if (dateString.length === 0) return null;
      
      // Try different date formats
      const formats = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY'];
      for (const format of formats) {
        const parsed = moment(dateString, format, true);
        if (parsed.isValid()) return parsed.toDate();
      }
      
      // Try natural parsing as fallback
      const natural = new Date(dateString);
      if (!isNaN(natural.getTime())) return natural;
      
    } catch (error) {
      console.warn('Date parsing error:', dateStr, error.message);
    }
    return null;
  }

  extractMonth(sheetName) {
    const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 
                    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    for (let i = 0; i < months.length; i++) {
      if (sheetName.toUpperCase().includes(months[i])) return i + 1;
    }
    return new Date().getMonth() + 1;
  }

  extractYear(sheetName) {
    const yearMatch = sheetName.match(/20\d{2}/);
    return yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();
  }

  isFollowupCompleted(status) {
    if (!status) return false;
    const statusStr = status.toString().toUpperCase();
    return statusStr.includes('COMPLETE') || statusStr.includes('DONE') || 
           statusStr.includes('REACHABLE') || statusStr.includes('CONTACTED');
  }
}

async function main() {
  const migrator = new CCPMigrationSafe();
  await migrator.migrate();
}

if (require.main === module) {
  main();
}

module.exports = CCPMigrationSafe;