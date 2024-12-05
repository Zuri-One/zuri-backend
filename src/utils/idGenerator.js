// utils/idGenerator.js

const { User } = require('../models');
const { Op } = require('sequelize');

class IDGenerator {
  static async generateStaffId(department, role) {
    const year = new Date().getFullYear().toString().slice(-2);
    const deptCode = department.code.slice(0, 3).toUpperCase();
    const roleCode = this.getRoleCode(role);
    
    // Get last ID for this combination
    const lastUser = await User.findOne({
      where: {
        staffId: {
          [Op.like]: `${deptCode}${roleCode}${year}%`
        }
      },
      order: [['staffId', 'DESC']]
    });

    let sequence = '001';
    if (lastUser && lastUser.staffId) {
      const lastSequence = parseInt(lastUser.staffId.slice(-3));
      sequence = (lastSequence + 1).toString().padStart(3, '0');
    }

    return `${deptCode}${roleCode}${year}${sequence}`;
  }

  static async generatePatientId() {
    const year = new Date().getFullYear().toString().slice(-2);
    const prefix = 'PAT';
    
    // Get last patient ID
    const lastPatient = await User.findOne({
      where: {
        role: 'PATIENT',
        staffId: {
          [Op.like]: `${prefix}${year}%`
        }
      },
      order: [['staffId', 'DESC']]
    });

    let sequence = '00001';
    if (lastPatient && lastPatient.staffId) {
      const lastSequence = parseInt(lastPatient.staffId.slice(-5));
      sequence = (lastSequence + 1).toString().padStart(5, '0');
    }

    return `${prefix}${year}${sequence}`;
  }

  static getRoleCode(role) {
    const roleCodes = {
      'DOCTOR': 'DOC',
      'NURSE': 'NUR',
      'RECEPTIONIST': 'REC',
      'LAB_TECHNICIAN': 'LAB',
      'PHARMACIST': 'PHR',
      'RADIOLOGIST': 'RAD',
      'PHYSIOTHERAPIST': 'PHY',
      'CARDIOLOGIST': 'CAR',
      'NEUROLOGIST': 'NEU',
      'PEDIATRICIAN': 'PED',
      'PSYCHIATRIST': 'PSY',
      'SURGEON': 'SUR',
      'ANESTHESIOLOGIST': 'ANE',
      'EMERGENCY_PHYSICIAN': 'EMG',
      'WARD_MANAGER': 'WMG',
      'BILLING_STAFF': 'BIL'
    };
    
    return roleCodes[role] || 'STF';
  }
}

module.exports = IDGenerator;