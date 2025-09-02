require('dotenv').config();
const { DepartmentQueue, Patient, Department, User, LabTest } = require('./src/models');
const { Op } = require('sequelize');

async function debugLabQueue() {
  try {
    console.log('🔍 DEBUGGING LAB QUEUE DATA');
    console.log('='.repeat(50));

    // 1. Check all pending lab tests
    console.log('\n1. ALL PENDING LAB TESTS:');
    const allPendingTests = await LabTest.findAll({
      where: { status: 'PENDING' },
      attributes: ['id', 'patientId', 'testType', 'status', 'createdAt'],
      include: [{
        model: Patient,
        as: 'patient',
        attributes: ['id', 'patientNumber', 'surname', 'otherNames']
      }]
    });
    
    console.log(`Total pending tests: ${allPendingTests.length}`);
    allPendingTests.forEach((test, i) => {
      console.log(`  ${i+1}. Test ID: ${test.id}, Patient: ${test.patient?.patientNumber} (${test.patient?.surname}), Type: ${test.testType}`);
    });

    // 2. Check patients in lab queue
    console.log('\n2. PATIENTS IN LAB QUEUE:');
    const labDepartment = await Department.findOne({ where: { code: 'LAB' } });
    
    if (!labDepartment) {
      console.log('❌ No LAB department found');
      return;
    }

    const queueEntries = await DepartmentQueue.findAll({
      where: {
        departmentId: labDepartment.id,
        status: { [Op.in]: ['WAITING', 'IN_PROGRESS'] }
      },
      attributes: ['id', 'patientId', 'status', 'queueNumber'],
      include: [{
        model: Patient,
        attributes: ['id', 'patientNumber', 'surname', 'otherNames']
      }]
    });

    console.log(`Patients in lab queue: ${queueEntries.length}`);
    queueEntries.forEach((entry, i) => {
      console.log(`  ${i+1}. Queue ID: ${entry.id}, Patient: ${entry.Patient?.patientNumber} (${entry.Patient?.surname}), Status: ${entry.status}`);
    });

    // 3. Check overlap
    console.log('\n3. OVERLAP ANALYSIS:');
    const patientsInQueueIds = queueEntries.map(entry => entry.patientId);
    const pendingTestPatientIds = allPendingTests.map(test => test.patientId);
    
    console.log('Patient IDs in queue:', patientsInQueueIds);
    console.log('Patient IDs with pending tests:', pendingTestPatientIds);
    
    const overlap = pendingTestPatientIds.filter(id => patientsInQueueIds.includes(id));
    const filteredTests = allPendingTests.filter(test => !patientsInQueueIds.includes(test.patientId));
    
    console.log(`Overlapping patients: ${overlap.length}`);
    console.log(`Tests after filtering: ${filteredTests.length}`);
    
    if (overlap.length > 0) {
      console.log('Overlapping patient IDs:', overlap);
    }

    // 4. Final result simulation
    console.log('\n4. FINAL LAB QUEUE RESULT:');
    console.log(`Physical queue entries: ${queueEntries.length}`);
    console.log(`Virtual entries (filtered pending tests): ${filteredTests.length}`);
    console.log(`Total lab queue items: ${queueEntries.length + filteredTests.length}`);

    console.log('\n='.repeat(50));
    console.log('✅ Debug complete');

  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    process.exit(0);
  }
}

debugLabQueue();