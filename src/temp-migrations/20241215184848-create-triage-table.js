// migrations/YYYYMMDDHHMMSS-create-triage-table.js
module.exports = {
    up: async (queryInterface, Sequelize) => {
      await queryInterface.createTable('Triages', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        patientId: {
          type: Sequelize.UUID,
          references: { model: 'Users', key: 'id' }
        },
        assessedBy: {
          type: Sequelize.UUID,
          references: { model: 'Users', key: 'id' }
        },
        assessmentDateTime: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW
        },
        category: {
          type: Sequelize.ENUM('RED', 'YELLOW', 'GREEN', 'BLACK')
        },
        chiefComplaint: Sequelize.TEXT,
        vitalSigns: Sequelize.JSONB,
        consciousness: {
          type: Sequelize.ENUM('ALERT', 'VERBAL', 'PAIN', 'UNRESPONSIVE')
        },
        symptoms: Sequelize.JSONB,
        medicalHistory: Sequelize.JSONB,
        physicalAssessment: Sequelize.JSONB,
        priorityScore: Sequelize.INTEGER,
        recommendedAction: {
          type: Sequelize.ENUM('IMMEDIATE_TREATMENT', 'URGENT_CARE', 'STANDARD_CARE', 'REFERRAL', 'DISCHARGE')
        },
        referredToDepartment: {
          type: Sequelize.UUID,
          references: { model: 'Departments', key: 'id' }
        },
        notes: Sequelize.TEXT,
        alerts: Sequelize.JSONB,
        reassessmentRequired: Sequelize.BOOLEAN,
        reassessmentInterval: Sequelize.INTEGER,
        status: {
          type: Sequelize.ENUM('IN_PROGRESS', 'COMPLETED', 'REASSESSED', 'TRANSFERRED'),
          defaultValue: 'IN_PROGRESS'
        },
        createdAt: Sequelize.DATE,
        updatedAt: Sequelize.DATE
      });
    },
  
    down: async (queryInterface) => {
      await queryInterface.dropTable('Triages');
    }
  };