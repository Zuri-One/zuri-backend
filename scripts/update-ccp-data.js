#!/usr/bin/env node

require('dotenv').config();
const XLSX = require('xlsx');
const { Patient, User, CCP, sequelize } = require('../src/models');
const { Op } = require('sequelize');
const moment = require('moment');

class CCPDataUpdater {
  constructor() {
    this.doctorMapping = {
      'georgina': {
        id: '50ab7923-a67d-4284-8f10-b4c1aa28c9a4',
        file: 'Copy of DR. GEORGINA NYAKA - MADISON & CiC _ CCP 2025.xlsx'
      },
      'antony': {
        id: 'e4839717-1f77-4c45-b7ed-853b95e758ec', 
        file: 'Copy of DR. ANTONY NDUATI - KPLC , MINET & PACIS _ CCP 2025.xlsx'
      },
      'esther': {
        id: '747d9c52-4a3b-4abe-a0c6-e5fe45e348eb',
        file: 'Copy of DR. ESTHER OGEMBO - BRITAM & GA _ CCP 2025.xlsx'
      }
    };
    this.stats = { updated: 0, errors: 0 };
  }

  async updateData() {
    console.log('🔄 Updating CCP patient data to match Excel...\n');

    try {
      // Process each doctor's file
      for (const [doctorKey, doctorInfo] of Object.entries(this.doctorMapping)) {
        console.log(`📋 Processing ${doctorInfo.file}`);
        await this.processDoctorFile(doctorKey, doctorInfo);
      }

      console.log(`\n✅ Update completed: ${this.stats.updated} updated, ${this.stats.errors} errors`);
      
    } catch (error) {
      console.error('❌ Update failed:', error.message);
    } finally {
      await sequelize.close();
    }
  }

  async processDoctorFile(doctorKey, doctorInfo) {
    try {
      const workbook = XLSX.readFile(`./${doctorInfo.file}`);
      const validSheets = workbook.SheetNames.filter(name => 
        !name.toUpperCase().includes('TASK') && 
        !name.toUpperCase().includes('DISCONTINUATION')
      );

      // Process first 3 sheets to update data
      for (let i = 0; i < Math.min(3, validSheets.length); i++) {
        const sheetName = validSheets[i];
        console.log(`   📄 ${sheetName}`);
        
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Find correct columns (based on debug output)
        const columnMap = {
          patientId: 1, // Col 2: PATIENT ID
          name: 4,      // Col 5: PATIENT'S NAME  
          gender: 5,    // Col 6: GENDER
          age: 6,       // Col 7: AGE(YRS)
          contact: 7,   // Col 8: CONTACT
          location: 9,  // Col 10: LOCATION
          condition: 11 // Col 12: KNOWN UNDERLYING CONDITION
        };

        let updated = 0;
        
        // Process data rows (start from row 5 based on debug output)
        for (let row = 4; row < jsonData.length; row++) {
          const rowData = jsonData[row];
          if (!rowData || rowData.length < 10) continue;
          
          const patientName = rowData[columnMap.name]?.toString().trim();
          const gender = rowData[columnMap.gender]?.toString().trim();
          const age = rowData[columnMap.age];
          const contact = rowData[columnMap.contact]?.toString().trim();
          const location = rowData[columnMap.location]?.toString().trim();
          const condition = rowData[columnMap.condition]?.toString().trim();
          
          if (!patientName || patientName.length < 3) continue;
          
          try {
            await this.updatePatientData({
              name: patientName,
              gender: this.normalizeGender(gender),
              age: age,
              contact: contact,
              location: location,
              condition: condition
            });
            updated++;
          } catch (error) {
            this.stats.errors++;
            console.error(`     ❌ Error updating ${patientName}:`, error.message);
          }
        }
        
        console.log(`     Updated: ${updated} patients`);
        this.stats.updated += updated;
      }
      
    } catch (error) {
      console.error(`   ❌ Error processing ${doctorInfo.file}:`, error.message);
    }
  }

  async updatePatientData(data) {
    const transaction = await sequelize.transaction();
    
    try {
      // Find patient by name
      const nameParts = data.name.split(' ');
      const surname = nameParts[0];
      const otherNames = nameParts.slice(1).join(' ') || 'Unknown';
      
      const patient = await Patient.findOne({
        where: {
          [Op.or]: [
            { surname, otherNames },
            { surname: { [Op.iLike]: `%${surname}%` } }
          ]
        },
        transaction
      });

      if (patient) {
        const updates = {};
        
        // Update gender if different
        if (data.gender && data.gender !== patient.sex) {
          updates.sex = data.gender;
        }
        
        // Update age/dateOfBirth if different
        if (data.age && !isNaN(parseInt(data.age))) {
          const newBirthYear = new Date().getFullYear() - parseInt(data.age);
          const newDateOfBirth = new Date(`${newBirthYear}-06-15`);
          const currentBirthYear = patient.dateOfBirth ? new Date(patient.dateOfBirth).getFullYear() : 1990;
          if (Math.abs(newDateOfBirth.getFullYear() - currentBirthYear) > 1) {
            updates.dateOfBirth = newDateOfBirth;
          }
        }
        
        // Update contact if different and valid
        if (data.contact && data.contact !== patient.telephone1) {
          const cleanPhone = this.cleanPhone(data.contact);
          if (cleanPhone) {
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
        
        // Update location if different
        if (data.location && data.location !== patient.residence) {
          updates.residence = data.location;
          updates.town = this.extractTown(data.location);
        }
        
        // Update medical history if condition provided
        if (data.condition) {
          const existingHistory = patient.medicalHistory || { existingConditions: [], allergies: [] };
          const conditions = existingHistory.existingConditions || [];
          if (!conditions.includes(data.condition)) {
            conditions.push(data.condition);
            updates.medicalHistory = { ...existingHistory, existingConditions: conditions };
          }
        }
        
        if (Object.keys(updates).length > 0) {
          await patient.update(updates, { transaction });
        }
      }
      
      await transaction.commit();
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  normalizeGender(gender) {
    if (!gender) return null;
    const g = gender.toString().toLowerCase().trim();
    if (g === 'male' || g === 'm') return 'MALE';
    if (g === 'female' || g === 'f') return 'FEMALE';
    return null;
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

  extractTown(location) {
    if (!location) return 'Not specified';
    const parts = location.split(/[,/-]/);
    return parts[parts.length - 1].trim();
  }
}

async function main() {
  const updater = new CCPDataUpdater();
  await updater.updateData();
}

if (require.main === module) {
  main();
}

module.exports = CCPDataUpdater;