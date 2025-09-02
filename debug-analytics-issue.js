require('dotenv').config();
const { DepartmentQueue, Patient, Department, User, LabTest, sequelize } = require('./src/models');
const { Op } = require('sequelize');

async function debugAnalyticsIssue() {
  try {
    console.log('🔍 COMPREHENSIVE ANALYTICS DEBUG');
    console.log('='.repeat(60));

    // 1. Check all lab tests by status
    console.log('\n1. LAB TESTS BY STATUS:');
    const testsByStatus = await LabTest.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('LabTest.id')), 'count']
      ],
      group: ['status'],
      raw: true
    });
    
    console.log('Status breakdown:');
    testsByStatus.forEach(status => {
      console.log(`  ${status.status}: ${status.count}`);
    });

    // 2. Get all PENDING tests with details
    console.log('\n2. DETAILED PENDING TESTS:');
    const pendingTests = await LabTest.findAll({
      where: { status: 'PENDING' },
      attributes: ['id', 'patientId', 'testType', 'status', 'createdAt'],
      include: [{
        model: Patient,
        as: 'patient',
        attributes: ['id', 'patientNumber', 'surname', 'otherNames']
      }],
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`Total PENDING tests: ${pendingTests.length}`);
    pendingTests.forEach((test, i) => {
      console.log(`  ${i+1}. ID: ${test.id.slice(0,8)}..., Patient: ${test.patient?.patientNumber}, Type: ${test.testType}, Created: ${test.createdAt.toISOString().slice(0,10)}`);
    });

    // 3. Check lab department and queue
    console.log('\n3. LAB DEPARTMENT & QUEUE:');
    const labDept = await Department.findOne({ where: { code: 'LAB' } });
    console.log(`Lab Department ID: ${labDept?.id}`);
    
    if (labDept) {
      const queueEntries = await DepartmentQueue.findAll({
        where: {
          departmentId: labDept.id,
          status: { [Op.in]: ['WAITING', 'IN_PROGRESS'] }
        },
        attributes: ['id', 'patientId', 'status', 'queueNumber', 'createdAt'],
        include: [{
          model: Patient,
          attributes: ['id', 'patientNumber', 'surname', 'otherNames']
        }]
      });
      
      console.log(`Physical queue entries: ${queueEntries.length}`);
      queueEntries.forEach((entry, i) => {
        console.log(`  ${i+1}. Patient: ${entry.Patient?.patientNumber}, Status: ${entry.status}, Queue#: ${entry.queueNumber}`);
      });
    }

    // 4. Check for any relationships between queue and tests
    console.log('\n4. QUEUE-TEST RELATIONSHIPS:');
    const testsWithQueue = await LabTest.findAll({
      where: { status: 'PENDING' },
      attributes: ['id', 'patientId', 'queueEntryId', 'testType'],
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['patientNumber']
        },
        {
          model: DepartmentQueue,
          as: 'queueEntry',
          attributes: ['id', 'status', 'departmentId'],
          required: false
        }
      ]
    });
    
    console.log('Pending tests with queue relationships:');
    testsWithQueue.forEach((test, i) => {
      console.log(`  ${i+1}. Patient: ${test.patient?.patientNumber}, QueueEntry: ${test.queueEntryId ? 'YES' : 'NO'}, QueueStatus: ${test.queueEntry?.status || 'N/A'}`);
    });

    // 5. Simulate analytics query exactly
    console.log('\n5. ANALYTICS SIMULATION:');
    
    // Total tests
    const totalTests = await LabTest.count();
    console.log(`Total tests in DB: ${totalTests}`);
    
    // Status aggregation (exactly like analytics)
    const statusAgg = await LabTest.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('LabTest.id')), 'count']
      ],
      group: ['status'],
      raw: true
    });
    
    console.log('Analytics status aggregation result:');
    statusAgg.forEach(item => {
      console.log(`  ${item.status}: ${item.count}`);
    });
    
    const pendingCount = statusAgg.find(s => s.status === 'PENDING')?.count || 0;
    console.log(`\n📊 ANALYTICS PENDING COUNT: ${pendingCount}`);

    // 6. Check if there are any duplicate or phantom records
    console.log('\n6. DATA INTEGRITY CHECK:');
    
    // Check for duplicate test IDs
    const duplicateCheck = await sequelize.query(`
      SELECT id, COUNT(*) as count 
      FROM "LabTests" 
      GROUP BY id 
      HAVING COUNT(*) > 1
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log(`Duplicate test IDs: ${duplicateCheck.length}`);
    
    // Check for orphaned records
    const orphanedTests = await LabTest.findAll({
      where: { patientId: null },
      attributes: ['id', 'testType', 'status']
    });
    
    console.log(`Orphaned tests (no patient): ${orphanedTests.length}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Debug complete');

  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    process.exit(0);
  }
}

debugAnalyticsIssue();