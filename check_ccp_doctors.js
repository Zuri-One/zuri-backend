require('dotenv').config();
const { Patient, User, CCP, sequelize } = require('./src/models');

async function checkCCPDoctors() {
  try {
    console.log('=== CCP DOCTOR DISTRIBUTION ANALYSIS ===\n');

    // 1. Check CCP records by scheduledBy (who created the CCP records)
    const scheduledByStats = await CCP.findAll({
      attributes: [
        'scheduledBy',
        [sequelize.fn('COUNT', sequelize.col('CCP.id')), 'followupCount'],
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('patientId'))), 'uniquePatients']
      ],
      include: [{
        model: User,
        as: 'scheduler',
        attributes: ['id', 'surname', 'otherNames', 'email'],
        required: true
      }],
      group: ['scheduledBy', 'scheduler.id', 'scheduler.surname', 'scheduler.otherNames', 'scheduler.email'],
      raw: true
    });

    console.log('📋 CCP Records by Scheduled Doctor:');
    scheduledByStats.forEach(stat => {
      const doctorName = `${stat['scheduler.surname']} ${stat['scheduler.otherNames']}`;
      console.log(`   Dr. ${doctorName} (${stat['scheduler.email']}): ${stat.uniquePatients} patients, ${stat.followupCount} followups`);
    });

    // 2. Check our target doctors specifically
    console.log('\n🎯 Target Doctors Analysis:');
    const targetDoctors = [
      { id: '50ab7923-a67d-4284-8f10-b4c1aa28c9a4', name: 'Dr. Georgina Nyaka' },
      { id: 'e4839717-1f77-4c45-b7ed-853b95e758ec', name: 'Dr. Antony Ndegwa' },
      { id: '747d9c52-4a3b-4abe-a0c6-e5fe45e348eb', name: 'Dr. Esther Ogembo' }
    ];

    for (const doctor of targetDoctors) {
      const ccpCount = await CCP.count({
        where: { scheduledBy: doctor.id }
      });
      
      const patientCount = await CCP.count({
        where: { scheduledBy: doctor.id },
        distinct: true,
        col: 'patientId'
      });

      console.log(`   ${doctor.name}: ${patientCount} patients, ${ccpCount} followups`);
    }

    // 3. Check recent CCP records to see what's happening
    console.log('\n📅 Recent CCP Records (last 10):');
    const recentCCPs = await CCP.findAll({
      include: [{
        model: User,
        as: 'scheduler',
        attributes: ['surname', 'otherNames', 'email']
      }, {
        model: Patient,
        as: 'patient',
        attributes: ['patientNumber', 'surname', 'otherNames']
      }],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    recentCCPs.forEach((ccp, index) => {
      console.log(`   ${index + 1}. Patient: ${ccp.patient.surname} ${ccp.patient.otherNames}`);
      console.log(`      Scheduled by: Dr. ${ccp.scheduler.surname} ${ccp.scheduler.otherNames}`);
      console.log(`      Month/Year: ${ccp.followupMonth}/${ccp.followupYear}`);
      console.log(`      Status: ${ccp.status}`);
      console.log('');
    });

    // 4. Check total CCP records
    const totalCCPs = await CCP.count();
    console.log(`📊 Total CCP Records: ${totalCCPs}`);

    // 5. Check enrollment dates
    const enrollmentStats = await Patient.findAll({
      where: { 
        isCCPEnrolled: true,
        ccpEnrollmentDate: { [sequelize.Op.not]: null }
      },
      attributes: [
        [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('ccpEnrollmentDate')), 'month'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('ccpEnrollmentDate'))],
      order: [[sequelize.fn('DATE_TRUNC', 'month', sequelize.col('ccpEnrollmentDate')), 'DESC']],
      raw: true,
      limit: 12
    });

    console.log('\n📅 CCP Enrollments by Month:');
    enrollmentStats.forEach(stat => {
      const month = new Date(stat.month).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      });
      console.log(`   ${month}: ${stat.count} patients`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkCCPDoctors();