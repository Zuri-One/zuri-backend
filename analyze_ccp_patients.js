// Analyze CCP patient statistics
require('dotenv').config();
const { Patient, User, CCP, sequelize } = require('./src/models');
const { Op } = require('sequelize');

async function analyzeCCPPatients() {
  try {
    console.log('=== CCP PATIENT ANALYSIS ===\n');

    // 1. Total CCP patients count
    const totalCCPPatients = await Patient.count({
      where: { isCCPEnrolled: true }
    });
    console.log(`📊 Total CCP Patients: ${totalCCPPatients}`);

    // 2. Gender distribution
    const genderDistribution = await Patient.findAll({
      where: { isCCPEnrolled: true },
      attributes: [
        'sex',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['sex'],
      raw: true
    });

    console.log('\n👥 Gender Distribution:');
    genderDistribution.forEach(item => {
      console.log(`   ${item.sex}: ${item.count}`);
    });

    // 3. Get all doctors (users with DOCTOR role)
    const doctors = await User.findAll({
      where: { 
        role: 'DOCTOR',
        isActive: true 
      },
      attributes: ['id', 'surname', 'otherNames', 'role']
    });

    console.log(`\n👨‍⚕️ Total Active Doctors: ${doctors.length}`);

    // 4. Distribution per doctor (based on CCP followups)
    const ccpFollowups = await CCP.findAll({
      attributes: [
        'completedBy',
        [sequelize.fn('COUNT', sequelize.col('CCP.id')), 'followupCount'],
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('patientId'))), 'uniquePatients']
      ],
      include: [{
        model: User,
        as: 'completedByUser',
        attributes: ['id', 'surname', 'otherNames', 'role'],
        required: true
      }],
      group: ['completedBy', 'completedByUser.id', 'completedByUser.surname', 'completedByUser.otherNames', 'completedByUser.role'],
      raw: true
    });

    console.log('\n📋 CCP Followups Distribution by Doctor:');
    if (ccpFollowups.length > 0) {
      ccpFollowups.forEach(item => {
        const doctorName = `${item['completedByUser.surname']} ${item['completedByUser.otherNames']}`;
        console.log(`   Dr. ${doctorName}: ${item.uniquePatients} patients, ${item.followupCount} followups`);
      });
    } else {
      console.log('   No CCP followups found with assigned doctors');
    }

    // 5. Additional statistics
    const enrollmentStats = await Patient.findAll({
      where: { 
        isCCPEnrolled: true,
        ccpEnrollmentDate: { [Op.not]: null }
      },
      attributes: [
        [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('ccpEnrollmentDate')), 'enrollmentMonth'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('ccpEnrollmentDate'))],
      order: [[sequelize.fn('DATE_TRUNC', 'month', sequelize.col('ccpEnrollmentDate')), 'DESC']],
      raw: true,
      limit: 6
    });

    console.log('\n📅 Recent CCP Enrollments by Month:');
    enrollmentStats.forEach(item => {
      const month = new Date(item.enrollmentMonth).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      });
      console.log(`   ${month}: ${item.count} patients`);
    });

    // 6. CCP followup completion stats
    const followupStats = await CCP.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    console.log('\n✅ CCP Followup Status Distribution:');
    followupStats.forEach(item => {
      console.log(`   ${item.status}: ${item.count}`);
    });

    // 7. Age distribution of CCP patients
    const ccpPatients = await Patient.findAll({
      where: { isCCPEnrolled: true },
      attributes: ['dateOfBirth'],
      raw: true
    });

    const ageGroups = {
      '18-30': 0,
      '31-45': 0,
      '46-60': 0,
      '61-75': 0,
      '75+': 0
    };

    ccpPatients.forEach(patient => {
      const age = Math.floor((new Date() - new Date(patient.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000));
      if (age <= 30) ageGroups['18-30']++;
      else if (age <= 45) ageGroups['31-45']++;
      else if (age <= 60) ageGroups['46-60']++;
      else if (age <= 75) ageGroups['61-75']++;
      else ageGroups['75+']++;
    });

    console.log('\n🎂 Age Distribution of CCP Patients:');
    Object.entries(ageGroups).forEach(([range, count]) => {
      console.log(`   ${range} years: ${count}`);
    });

    console.log('\n=== ANALYSIS COMPLETE ===');

  } catch (error) {
    console.error('Error analyzing CCP patients:', error);
  } finally {
    await sequelize.close();
  }
}

analyzeCCPPatients();