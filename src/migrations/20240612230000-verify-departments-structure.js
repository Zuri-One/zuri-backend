// migrations/20240612230000-verify-departments-structure.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get current table structure
    const tableInfo = await queryInterface.sequelize.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'departments';`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const existingColumns = tableInfo.map(col => col.column_name);
    console.log('Existing columns:', existingColumns);

    // Define columns to add
    const columnsToAdd = {
      operatingHours: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      location: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'Main Building' // Temporary default for existing rows
      },
      capacity: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      headOfDepartmentId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      contactExtension: {
        type: Sequelize.STRING,
        allowNull: true
      },
      emergencyContact: {
        type: Sequelize.STRING,
        allowNull: true
      },
      resources: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {}
      }
    };

    // Add missing columns
    for (const [columnName, columnDef] of Object.entries(columnsToAdd)) {
      if (!existingColumns.includes(columnName.toLowerCase())) {
        console.log(`Adding column: ${columnName}`);
        await queryInterface.addColumn('departments', columnName, columnDef)
          .catch(error => {
            console.log(`Error adding ${columnName}:`, error.message);
          });
      }
    }

    // Add any missing indexes
    const indexesToAdd = [
      ['type', false],
      ['isActive', false]
    ];

    for (const [columnName, isUnique] of indexesToAdd) {
      await queryInterface.addIndex('departments', [columnName], { unique: isUnique })
        .catch(error => {
          console.log(`Error adding index for ${columnName}:`, error.message);
        });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const columnsToRemove = [
      'operatingHours',
      'location',
      'capacity',
      'headOfDepartmentId',
      'contactExtension',
      'emergencyContact',
      'resources',
      'metadata'
    ];

    for (const columnName of columnsToRemove) {
      await queryInterface.removeColumn('departments', columnName)
        .catch(() => {});
    }
  }
};