'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create OmaeraMedications table
    await queryInterface.createTable('OmaeraMedications', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      itemCode: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      itemDescription: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      packSize: {
        type: Sequelize.STRING,
        allowNull: true
      },
      taxCode: {
        type: Sequelize.DECIMAL(4, 2),
        allowNull: true,
        defaultValue: 0.00
      },
      originalPrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      currentPrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      lastUpdatedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create PharmacyBills table
    await queryInterface.createTable('PharmacyBills', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      billNumber: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      patientId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Patients',
          key: 'id'
        }
      },
      items: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: []
      },
      subtotal: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      totalTax: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      totalAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('PENDING', 'PAID', 'ESCALATED'),
        allowNull: false,
        defaultValue: 'PENDING'
      },
      paymentMethod: {
        type: Sequelize.STRING,
        allowNull: true
      },
      paymentReference: {
        type: Sequelize.STRING,
        allowNull: true
      },
      paidAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      updatedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Add indexes
    await queryInterface.addIndex('OmaeraMedications', ['itemCode']);
    await queryInterface.addIndex('OmaeraMedications', ['itemDescription']);
    await queryInterface.addIndex('OmaeraMedications', ['isActive']);
    await queryInterface.addIndex('OmaeraMedications', ['currentPrice']);
    
    await queryInterface.addIndex('PharmacyBills', ['billNumber']);
    await queryInterface.addIndex('PharmacyBills', ['patientId']);
    await queryInterface.addIndex('PharmacyBills', ['status']);
    await queryInterface.addIndex('PharmacyBills', ['createdAt']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('PharmacyBills');
    await queryInterface.dropTable('OmaeraMedications');
  }
};