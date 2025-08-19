const { Patient, User, CCP, sequelize } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');

const log = (message, data = null) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    service: 'ccp-import-controller',
    message
  };
  
  if (data) {
    logEntry.data = data;
  }
  
  console.log(JSON.stringify(logEntry));
};

class CCPImportController {
  constructor() {
    log('CCPImportController constructor called');
    
    // CRITICAL FIX: Bind the main method to preserve 'this' context in Express routes
    this.importCCPData = this.importCCPData.bind(this);
    
    // Cache for generated phone numbers to avoid duplicates within the same import
    this.usedPhoneNumbers = new Set();
    
    // Verify that helper methods are available
    const helperMethods = [
      'extractSurname', 'extractOtherNames', 'normalizeGender', 
      'calculateDateOfBirth', 'cleanPhone', 'extractTown',
      'parseInsurance', 'parseDate', 'normalizeFrequency',
      'normalizeFollowupStatus', 'isFollowupCompleted', 'normalizeFollowupMode'
    ];
    
    helperMethods.forEach(method => {
      log(`Helper method ${method} type:`, { type: typeof this[method] });
    });

    log('Main method binding check', {
      importCCPDataBound: typeof this.importCCPData === 'function'
    });
  }

  async importCCPData(req, res, next) {
    log('Starting importCCPData method');
    log('Controller context check', { 
      hasThis: !!this,
      thisType: typeof this,
      extractSurnameType: typeof this.extractSurname,
      isExtractSurnameFunction: typeof this.extractSurname === 'function'
    });

    // Reset phone number cache for new import
    this.usedPhoneNumbers.clear();

    // Additional safety check
    if (!this || typeof this.extractSurname !== 'function') {
      const error = new Error('Controller context lost - this is undefined or missing helper methods');
      log('CRITICAL ERROR: Context lost', { 
        hasThis: !!this,
        extractSurnameType: typeof this?.extractSurname
      });
      return res.status(500).json({
        success: false,
        message: 'Internal server error - controller context lost',
        imported: 0,
        skipped: 0
      });
    }

    let transaction = await sequelize.transaction();
    
    try {
      const { data, attendingDoctor } = req.body;
      
      log('Request body received', { 
        hasData: !!data,
        attendingDoctor,
        dataType: typeof data,
        dataKeys: data ? Object.keys(data) : []
      });
      
      log('Starting CCP data import', { 
        attendingDoctor, 
        sheetsCount: Object.keys(data).length,
        totalPatients: Object.values(data).reduce((sum, patients) => sum + patients.length, 0)
      });

      // Get attending doctor with exact mapping
      const doctorMap = {
        'georgina': 'georgina@zuri.health',
        'antony': 'antony@zuri.health', 
        'esther': 'esther@zuri.health'
      };
      
      const email = doctorMap[attendingDoctor.toLowerCase()] || attendingDoctor;
      log('Doctor email mapping', { originalDoctor: attendingDoctor, mappedEmail: email });
      
      const doctor = await User.findOne({
        where: { 
          [Op.or]: [
            { email: email },
            { surname: { [Op.iLike]: `%${attendingDoctor}%` } },
            { otherNames: { [Op.iLike]: `%${attendingDoctor}%` } }
          ],
          role: 'DOCTOR',
          isActive: true
        },
        transaction
      });

      if (!doctor) {
        log('Doctor not found', { attendingDoctor, email });
        throw new Error(`Doctor ${attendingDoctor} not found`);
      }

      log('Doctor found', { doctorId: doctor.id, doctorEmail: doctor.email });

      let importedCount = 0;
      let skippedCount = 0;
      let updatedCount = 0;
      const errors = [];

      // Process each sheet
      for (const [sheetName, patients] of Object.entries(data)) {
        log(`Processing sheet: ${sheetName}`, { 
          patientCount: patients.length,
          samplePatient: patients.length > 0 ? patients[0] : null
        });

        for (let i = 0; i < patients.length; i++) {
          const patientData = patients[i];
          
          try {
            log(`Processing patient ${i + 1}/${patients.length}`, { 
              patientId: patientData.patientId,
              patientName: patientData.name,
              hasErrors: !!(patientData.errors && patientData.errors.length > 0)
            });

            // Context check before using helper methods
            log('Context check before helper method calls', {
              hasThis: !!this,
              extractSurnameAvailable: typeof this.extractSurname === 'function',
              patientDataName: patientData.name
            });

            // Skip if has validation errors
            if (patientData.errors && patientData.errors.length > 0) {
              log('Skipping patient due to validation errors', { 
                patientId: patientData.patientId, 
                errors: patientData.errors 
              });
              skippedCount++;
              errors.push(`${patientData.patientId}: ${patientData.errors.join(', ')}`);
              continue;
            }

            // Extract patient details
            let surname, otherNames, cleanedPhone;
            
            try {
              surname = this.extractSurname(patientData.name);
              log('Successfully extracted surname', { surname, originalName: patientData.name });
            } catch (error) {
              log('Error extracting surname', { error: error.message, name: patientData.name });
              surname = 'Unknown';
            }

            try {
              otherNames = this.extractOtherNames(patientData.name);
              log('Successfully extracted other names', { otherNames, originalName: patientData.name });
            } catch (error) {
              log('Error extracting other names', { error: error.message, name: patientData.name });
              otherNames = 'Unknown';
            }

            try {
              cleanedPhone = await this.cleanPhone(patientData.contact, transaction);
              log('Successfully cleaned phone', { cleanedPhone, originalContact: patientData.contact });
            } catch (error) {
              log('Error cleaning phone', { error: error.message, contact: patientData.contact });
              cleanedPhone = await this.generateUniquePhone(transaction);
            }

            // ENHANCED PATIENT EXISTENCE CHECK
            let patient = await this.findExistingPatient(patientData, surname, otherNames, cleanedPhone, transaction);

            log('Patient existence check', { 
              patientId: patientData.patientId,
              existingPatient: !!patient,
              existingPatientId: patient ? patient.id : null,
              searchCriteria: {
                patientNumber: patientData.patientId,
                surname,
                otherNames,
                phone: cleanedPhone
              }
            });

            if (!patient) {
              // Create new patient
              log('Creating new patient', { patientId: patientData.patientId });
              patient = await this.createPatient(patientData, doctor.id, transaction, cleanedPhone, surname, otherNames);
              log('Created new patient', { 
                patientId: patient.id, 
                patientNumber: patient.patientNumber,
                surname: patient.surname,
                otherNames: patient.otherNames
              });
              importedCount++;
            } else {
              // Update existing patient
              log('Updating existing patient', { 
                patientId: patient.id, 
                patientNumber: patient.patientNumber 
              });
              await this.updatePatient(patient, patientData, transaction, cleanedPhone);
              log('Updated existing patient', { 
                patientId: patient.id, 
                patientNumber: patient.patientNumber 
              });
              updatedCount++;
            }

            // Create or update CCP record
            log('Creating/updating CCP record', { 
              patientId: patient.id,
              followupData: {
                followupFrequency: patientData.followupFrequency,
                followupStatus: patientData.followupStatus,
                nextFollowup: patientData.nextFollowup
              }
            });
            
            await this.createCCPRecord(patient, patientData, doctor.id, transaction);
            
            log('Successfully processed patient', { 
              patientId: patientData.patientId,
              totalImported: importedCount,
              totalUpdated: updatedCount
            });

          } catch (error) {
            log('Error processing patient', { 
              patientId: patientData.patientId, 
              error: error.message,
              stack: error.stack,
              patientData: patientData
            });
            
            // Handle transaction rollback gracefully
            if (error.message.includes('current transaction is aborted') || 
                error.message.includes('duplicate key value violates unique constraint')) {
              log('Transaction error detected, rolling back and restarting');
              
              try {
                await transaction.rollback();
              } catch (rollbackError) {
                log('Rollback error (expected)', { error: rollbackError.message });
              }
              
              // Start new transaction for remaining patients
              transaction = await sequelize.transaction();
              log('New transaction started');
            }
            
            errors.push(`${patientData.patientId}: ${error.message}`);
            skippedCount++;
          }
        }
      }

      await transaction.commit();
      log('Transaction committed successfully');

      log('CCP import completed', { 
        imported: importedCount,
        updated: updatedCount, 
        skipped: skippedCount, 
        errors: errors.length 
      });

      res.json({
        success: true,
        message: 'Import completed successfully',
        imported: importedCount,
        updated: updatedCount,
        skipped: skippedCount,
        errors: errors.slice(0, 10) // Return first 10 errors
      });

    } catch (error) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        log('Rollback error in catch', { error: rollbackError.message });
      }
      
      log('CCP import failed - transaction rolled back', { 
        error: error.message, 
        stack: error.stack 
      });
      
      res.status(500).json({
        success: false,
        message: error.message,
        imported: 0,
        updated: 0,
        skipped: 0
      });
    }
  }

  // ENHANCED: Find existing patient with multiple criteria
  async findExistingPatient(patientData, surname, otherNames, cleanedPhone, transaction) {
    try {
      // Priority 1: Find by patient number
      if (patientData.patientId) {
        const byPatientNumber = await Patient.findOne({
          where: { patientNumber: patientData.patientId },
          transaction
        });
        if (byPatientNumber) {
          log('Found patient by patient number', { 
            patientId: byPatientNumber.id,
            patientNumber: byPatientNumber.patientNumber 
          });
          return byPatientNumber;
        }
      }

      // Priority 2: Find by exact name match
      const byExactName = await Patient.findOne({
        where: {
          surname: surname,
          otherNames: otherNames
        },
        transaction
      });
      if (byExactName) {
        log('Found patient by exact name match', { 
          patientId: byExactName.id,
          surname: byExactName.surname,
          otherNames: byExactName.otherNames
        });
        return byExactName;
      }

      // Priority 3: Find by phone number (only if it's not a dummy number)
      if (cleanedPhone && !cleanedPhone.startsWith('070') && !cleanedPhone.includes('000000')) {
        const byPhone = await Patient.findOne({
          where: { telephone1: cleanedPhone },
          transaction
        });
        if (byPhone) {
          log('Found patient by phone number', { 
            patientId: byPhone.id,
            phone: byPhone.telephone1
          });
          return byPhone;
        }
      }

      // Priority 4: Find by similar name (fuzzy match)
      const bySimilarName = await Patient.findOne({
        where: {
          [Op.or]: [
            {
              [Op.and]: [
                { surname: { [Op.iLike]: `%${surname}%` } },
                { otherNames: { [Op.iLike]: `%${otherNames}%` } }
              ]
            },
            {
              [Op.and]: [
                { surname: { [Op.iLike]: `%${otherNames}%` } },
                { otherNames: { [Op.iLike]: `%${surname}%` } }
              ]
            }
          ]
        },
        transaction
      });
      if (bySimilarName) {
        log('Found patient by similar name', { 
          patientId: bySimilarName.id,
          foundSurname: bySimilarName.surname,
          foundOtherNames: bySimilarName.otherNames,
          searchSurname: surname,
          searchOtherNames: otherNames
        });
        return bySimilarName;
      }

      log('No existing patient found');
      return null;

    } catch (error) {
      log('Error in findExistingPatient', { 
        error: error.message,
        patientData: {
          patientId: patientData.patientId,
          surname,
          otherNames,
          phone: cleanedPhone
        }
      });
      return null;
    }
  }

  // ENHANCED: Generate unique phone numbers
  async generateUniquePhone(transaction) {
    let attempts = 0;
    const maxAttempts = 100;
    
    while (attempts < maxAttempts) {
      // Generate random phone number
      const prefix = '070';
      const randomSuffix = Math.floor(Math.random() * 9000000) + 1000000; // 7-digit number
      const phoneNumber = `${prefix}${randomSuffix}`;
      
      // Check if it's already used in this import session
      if (this.usedPhoneNumbers.has(phoneNumber)) {
        attempts++;
        continue;
      }
      
      // Check if it exists in database
      try {
        const existingPatient = await Patient.findOne({
          where: { telephone1: phoneNumber },
          transaction
        });
        
        if (!existingPatient) {
          this.usedPhoneNumbers.add(phoneNumber);
          log('Generated unique phone number', { phoneNumber, attempts: attempts + 1 });
          return phoneNumber;
        }
      } catch (error) {
        log('Error checking phone uniqueness', { error: error.message, phoneNumber });
      }
      
      attempts++;
    }
    
    // Fallback to timestamp-based number if random generation fails
    const timestamp = Date.now().toString().slice(-7);
    const fallbackPhone = `070${timestamp}`;
    this.usedPhoneNumbers.add(fallbackPhone);
    log('Generated fallback phone number', { phoneNumber: fallbackPhone });
    return fallbackPhone;
  }

  async createPatient(patientData, doctorId, transaction, cleanedPhone, surname, otherNames) {
    log('Creating patient started', { 
      patientId: patientData.patientId,
      doctorId: doctorId
    });

    try {
      const patientNumber = await this.generatePatientNumber(transaction);
      log('Generated patient number', { patientNumber });

      // Use pre-extracted data
      const sex = this.normalizeGender(patientData.gender);
      const dateOfBirth = this.calculateDateOfBirth(patientData.age);
      const town = this.extractTown(patientData.location);
      const paymentScheme = this.parseInsurance(patientData.insurance);
      const ccpEnrollmentDate = this.parseDate(patientData.dateEnrolled) || new Date();

      log('Extracted patient data', {
        surname, otherNames, sex, dateOfBirth, telephone1: cleanedPhone, town, paymentScheme, ccpEnrollmentDate
      });
      
      const patientCreateData = {
        patientNumber,
        surname,
        otherNames,
        sex,
        dateOfBirth,
        telephone1: cleanedPhone,
        residence: patientData.location || 'Not specified',
        town,
        nationality: 'Kenyan',
        occupation: 'Not specified',
        isCCPEnrolled: true,
        ccpEnrollmentDate,
        idType: 'NATIONAL_ID',
        idNumber: 'CCP-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        status: patientData.enrollmentStatus === 'ACTIVE' ? 'WAITING' : 'INACTIVE',
        paymentScheme,
        medicalHistory: patientData.condition ? { conditions: [patientData.condition] } : {},
        isActive: true,
        registrationId: doctorId
      };

      log('Creating patient with data', { patientCreateData });

      const patient = await Patient.create(patientCreateData, { transaction });

      log('Patient created successfully', { 
        patientId: patient.id,
        patientNumber: patient.patientNumber
      });

      return patient;

    } catch (error) {
      log('Error in createPatient', { 
        error: error.message, 
        stack: error.stack,
        patientData: patientData
      });
      throw error;
    }
  }

  async updatePatient(patient, patientData, transaction, cleanedPhone) {
    log('Updating patient started', { 
      patientId: patient.id,
      patientNumber: patient.patientNumber
    });

    try {
      const updates = {
        isCCPEnrolled: true,
        ccpEnrollmentDate: this.parseDate(patientData.dateEnrolled) || patient.ccpEnrollmentDate || new Date(),
        status: patientData.enrollmentStatus === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'
      };

      // Update contact if provided and different (and not a dummy number)
      if (cleanedPhone && cleanedPhone !== patient.telephone1 && 
          !cleanedPhone.startsWith('070') && !cleanedPhone.includes('000000')) {
        updates.telephone1 = cleanedPhone;
        log('Updating phone number', { 
          oldPhone: patient.telephone1, 
          newPhone: updates.telephone1 
        });
      }

      // Update location if provided
      if (patientData.location && patientData.location !== patient.residence) {
        updates.residence = patientData.location;
        updates.town = this.extractTown(patientData.location);
        log('Updating location', { 
          oldResidence: patient.residence, 
          newResidence: updates.residence,
          newTown: updates.town
        });
      }

      // Update insurance if provided
      if (patientData.insurance) {
        updates.paymentScheme = this.parseInsurance(patientData.insurance);
        log('Updating insurance', { 
          oldScheme: patient.paymentScheme, 
          newScheme: updates.paymentScheme 
        });
      }

      // Update medical history if condition provided
      if (patientData.condition) {
        const existingHistory = patient.medicalHistory || {};
        const conditions = existingHistory.conditions || [];
        if (!conditions.includes(patientData.condition)) {
          conditions.push(patientData.condition);
          updates.medicalHistory = { ...existingHistory, conditions };
          log('Adding medical condition', { 
            newCondition: patientData.condition, 
            allConditions: conditions 
          });
        }
      }

      log('Applying patient updates', { updates });
      await patient.update(updates, { transaction });
      
      log('Patient updated successfully', { 
        patientId: patient.id,
        patientNumber: patient.patientNumber
      });

      return patient;

    } catch (error) {
      log('Error in updatePatient', { 
        error: error.message, 
        stack: error.stack,
        patientId: patient.id
      });
      throw error;
    }
  }

  async createCCPRecord(patient, patientData, doctorId, transaction) {
    log('Creating CCP record started', { 
      patientId: patient.id,
      doctorId: doctorId
    });

    try {
      const followupDate = this.parseDate(patientData.nextFollowup);
      const dueDate = this.parseDate(patientData.dueFollowupDate);
      const refillDate = this.parseDate(patientData.refillDate);
      const month = patientData.month || new Date().getMonth() + 1;
      const year = patientData.year || new Date().getFullYear();

      log('Parsed CCP dates', { 
        followupDate, dueDate, refillDate, month, year 
      });

      // Check if CCP record already exists for this month/year
      const existingCCP = await CCP.findOne({
        where: {
          patientId: patient.id,
          followupMonth: month,
          followupYear: year
        },
        transaction
      });

      log('Existing CCP check', { 
        hasExisting: !!existingCCP,
        existingId: existingCCP ? existingCCP.id : null
      });

      const ccpData = {
        patientId: patient.id,
        followupMonth: month,
        followupYear: year,
        followupFrequency: this.normalizeFrequency(patientData.followupFrequency),
        nextFollowupDate: followupDate,
        dueFollowupDate: dueDate,
        followupType: 'ROUTINE',
        followupMode: this.normalizeFollowupMode(patientData.followupStatus),
        scheduledBy: doctorId,
        status: this.normalizeFollowupStatus(patientData.followupStatus),
        followupFeedback: patientData.followupFeedback,
        previousFollowupFeedback: patientData.previousFeedback,
        labTestsPerformed: patientData.labTest ? [{ test: patientData.labTest, date: patientData.labDate }] : [],
        medicationsPrescribed: patientData.medicationPrescribed ? [patientData.medicationPrescribed] : [],
        medicationDispenseStatus: patientData.dispenseStatus,
        refillFrequency: patientData.refillFrequency,
        nextRefillDate: refillDate,
        isFollowupCompleted: this.isFollowupCompleted(patientData.followupStatus),
        actualFollowupDate: this.isFollowupCompleted(patientData.followupStatus) ? new Date() : null,
        completedBy: this.isFollowupCompleted(patientData.followupStatus) ? doctorId : null
      };

      log('CCP data prepared', { ccpData });

      if (existingCCP) {
        await existingCCP.update(ccpData, { transaction });
        log('Updated existing CCP record', { ccpId: existingCCP.id });
      } else {
        const newCCP = await CCP.create(ccpData, { transaction });
        log('Created new CCP record', { ccpId: newCCP.id });
      }

    } catch (error) {
      log('Error in createCCPRecord', { 
        error: error.message, 
        stack: error.stack,
        patientId: patient.id
      });
      throw error;
    }
  }

  async generatePatientNumber(transaction) {
    log('Generating patient number');

    try {
      const lastPatient = await Patient.findOne({
        where: {
          patientNumber: {
            [Op.like]: 'ZH%'
          }
        },
        order: [['patientNumber', 'DESC']],
        transaction
      });

      let patientNumber;
      if (!lastPatient) {
        patientNumber = 'ZH000001';
      } else {
        const lastNumber = parseInt(lastPatient.patientNumber.replace('ZH', ''));
        const nextNumber = (lastNumber + 1).toString().padStart(6, '0');
        patientNumber = `ZH${nextNumber}`;
      }

      log('Generated patient number', { 
        patientNumber, 
        lastPatientNumber: lastPatient ? lastPatient.patientNumber : 'none' 
      });

      return patientNumber;

    } catch (error) {
      log('Error generating patient number', { 
        error: error.message, 
        stack: error.stack 
      });
      throw error;
    }
  }

  // UPDATED: Phone cleaning with unique generation
  cleanPhone = async (phone, transaction) => {
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
    
    // Check if this phone number already exists
    try {
      const existingPatient = await Patient.findOne({
        where: { telephone1: formattedPhone },
        transaction
      });
      
      if (existingPatient) {
        log('Phone number already exists, generating unique one', { 
          existingPhone: formattedPhone,
          existingPatientId: existingPatient.id 
        });
        return await this.generateUniquePhone(transaction);
      }
    } catch (error) {
      log('Error checking phone uniqueness, generating new one', { error: error.message });
      return await this.generateUniquePhone(transaction);
    }
    
    return formattedPhone;
  }

  // All other helper methods remain the same...
  extractSurname = (fullName) => {
    if (!fullName) return 'Unknown';
    return fullName.trim().split(' ')[0];
  }

  extractOtherNames = (fullName) => {
    if (!fullName) return 'Unknown';
    const parts = fullName.trim().split(' ');
    return parts.slice(1).join(' ') || 'Unknown';
  }

  normalizeGender = (gender) => {
    if (!gender) return 'OTHER';
    const g = gender.toString().toUpperCase();
    if (g.includes('F') || g.includes('FEMALE')) return 'FEMALE';
    if (g.includes('M') || g.includes('MALE')) return 'MALE';
    return 'OTHER';
  }

  calculateDateOfBirth = (age) => {
    log('Calculating date of birth', { age });
    if (!age) {
      log('No age provided, using default 1990-01-01');
      return new Date('1990-01-01');
    }
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - parseInt(age);
    const dateOfBirth = new Date(`${birthYear}-01-01`);
    log('Calculated date of birth', { age, birthYear, dateOfBirth });
    return dateOfBirth;
  }

  extractTown = (location) => {
    log('Extracting town', { location });
    if (!location) {
      log('No location provided, returning Not specified');
      return 'Not specified';
    }
    const parts = location.split(',');
    const town = parts[parts.length - 1].trim();
    log('Extracted town', { location, parts, town });
    return town;
  }

  parseInsurance = (insurance) => {
    log('Parsing insurance', { insurance });
    if (!insurance) {
      log('No insurance provided, returning CASH');
      return { type: 'CASH', provider: null };
    }
    
    const insuranceStr = insurance.toString().toUpperCase();
    let result;
    if (insuranceStr.includes('NHIF')) {
      result = { type: 'NHIF', provider: 'NHIF' };
    } else if (insuranceStr.includes('INSURANCE') || insuranceStr.includes('COVER')) {
      result = { type: 'INSURANCE', provider: insurance };
    } else {
      result = { type: 'CASH', provider: null };
    }
    log('Parsed insurance', { original: insurance, result });
    return result;
  }

  parseDate = (dateStr) => {
    log('Parsing date', { dateStr, type: typeof dateStr });
    if (!dateStr) {
      log('No date string provided, returning null');
      return null;
    }
    
    try {
      // Handle Excel serial date numbers
      if (typeof dateStr === 'number') {
        log('Parsing Excel serial date number');
        const excelEpoch = new Date(1900, 0, 1);
        const days = dateStr - 2;
        const result = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
        log('Parsed Excel date', { dateStr, result });
        return result;
      }
      
      // Try various date formats
      const formats = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY'];
      for (const format of formats) {
        const parsed = moment(dateStr, format, true);
        if (parsed.isValid()) {
          const result = parsed.toDate();
          log('Parsed date with moment', { dateStr, format, result });
          return result;
        }
      }
      
      // Try natural parsing
      const natural = new Date(dateStr);
      if (!isNaN(natural.getTime())) {
        log('Parsed date naturally', { dateStr, result: natural });
        return natural;
      }
    } catch (error) {
      log('Date parsing error', { dateStr, error: error.message });
    }
    
    log('Unable to parse date, returning null', { dateStr });
    return null;
  }

  normalizeFrequency = (frequency) => {
    log('Normalizing frequency', { frequency });
    if (!frequency) {
      log('No frequency provided, returning 1_MONTH');
      return '1_MONTH';
    }
    
    const freq = frequency.toString().toUpperCase();
    let result;
    if (freq.includes('WEEK')) {
      result = '1_WEEK';
    } else if (freq.includes('2') && freq.includes('MONTH')) {
      result = '2_MONTHS';
    } else if (freq.includes('3') && freq.includes('MONTH')) {
      result = '3_MONTHS';
    } else if (freq.includes('6') && freq.includes('MONTH')) {
      result = '6_MONTHS';
    } else if (freq.includes('MONTH')) {
      result = '1_MONTH';
    } else {
      result = '1_MONTH';
    }
    
    log('Normalized frequency', { original: frequency, result });
    return result;
  }

  normalizeFollowupStatus = (status) => {
    log('Normalizing followup status', { status });
    if (!status) {
      log('No status provided, returning SCHEDULED');
      return 'SCHEDULED';
    }
    
    const statusStr = status.toString().toUpperCase();
    let result;
    if (statusStr.includes('COMPLETE') || statusStr.includes('DONE')) {
      result = 'COMPLETED';
    } else if (statusStr.includes('CANCEL')) {
      result = 'CANCELLED';
    } else if (statusStr.includes('RESCHEDULE')) {
      result = 'RESCHEDULED';
    } else if (statusStr.includes('PROGRESS')) {
      result = 'IN_PROGRESS';
    } else {
      result = 'SCHEDULED';
    }
    
    log('Normalized followup status', { original: status, result });
    return result;
  }

  isFollowupCompleted = (status) => {
    log('Checking if followup completed', { status });
    if (!status) {
      log('No status provided, returning false');
      return false;
    }
    const statusStr = status.toString().toUpperCase();
    const result = statusStr.includes('COMPLETE') || statusStr.includes('DONE') || statusStr.includes('REACHABLE');
    log('Followup completion check', { status, result });
    return result;
  }

  normalizeFollowupMode = (status) => {
    log('Normalizing followup mode', { status });
    if (!status) {
      log('No status provided, returning IN_PERSON');
      return 'IN_PERSON';
    }
    const statusStr = status.toString().toUpperCase();
    let result;
    if (statusStr.includes('PHONE') || statusStr.includes('CALL') || statusStr.includes('CONTACTED')) {
      result = 'PHONE_CALL';
    } else if (statusStr.includes('SMS') || statusStr.includes('TEXT')) {
      result = 'SMS';
    } else {
      result = 'IN_PERSON';
    }
    log('Normalized followup mode', { original: status, result });
    return result;
  }
}

log('Creating CCPImportController instance');
const controllerInstance = new CCPImportController();
log('CCPImportController instance created', { 
  hasExtractSurname: typeof controllerInstance.extractSurname === 'function',
  hasImportMethod: typeof controllerInstance.importCCPData === 'function'
});

module.exports = controllerInstance;