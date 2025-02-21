const { Umzug, SequelizeStorage } = require('umzug');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');

class MigrationManager {
  constructor(sequelize, models) {
    this.sequelize = sequelize;
    this.models = models;
    this.migrationsPath = path.join(__dirname, '../migrations');
    
    // Create migrations directory if it doesn't exist
    if (!fs.existsSync(this.migrationsPath)) {
      fs.mkdirSync(this.migrationsPath, { recursive: true });
    }

    this.umzug = new Umzug({
      migrations: {
        path: this.migrationsPath,
        params: [sequelize.getQueryInterface(), sequelize],
        pattern: /\.js$/
      },
      context: sequelize.getQueryInterface(),
      storage: new SequelizeStorage({ sequelize }),
      logger: console
    });
  }

  // Compare model attributes with database schema
  async compareWithDatabase(modelName) {
    const model = this.models[modelName];
    if (!model) return null;

    const tableInfo = await this.sequelize.getQueryInterface()
      .describeTable(model.tableName || _.snakeCase(modelName));
    
    const modelAttributes = model.rawAttributes;
    const differences = {
      newColumns: {},
      modifiedColumns: {},
      removedColumns: {}
    };

    // Find new and modified columns
    Object.entries(modelAttributes).forEach(([attrName, attrDef]) => {
      const dbColumn = tableInfo[attrName];
      if (!dbColumn) {
        differences.newColumns[attrName] = attrDef;
      } else {
        // Compare type, allowNull, defaultValue, etc.
        const isDifferent = this.compareColumnDefinitions(dbColumn, attrDef);
        if (isDifferent) {
          differences.modifiedColumns[attrName] = attrDef;
        }
      }
    });

    // Find removed columns
    Object.keys(tableInfo).forEach(columnName => {
      if (!modelAttributes[columnName]) {
        differences.removedColumns[columnName] = tableInfo[columnName];
      }
    });

    return differences;
  }

  compareColumnDefinitions(dbColumn, modelColumn) {
    // Convert Sequelize type to database type for comparison
    const modelType = this.sequelize.getQueryInterface()
      .queryGenerator.attributeToSQL(modelColumn).type;

    return dbColumn.type !== modelType ||
           dbColumn.allowNull !== modelColumn.allowNull ||
           dbColumn.defaultValue !== modelColumn.defaultValue;
  }

  async generateMigration(modelName, differences) {
    if (!differences) return;

    const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
    const fileName = `${timestamp}-update-${_.kebabCase(modelName)}.js`;
    const filePath = path.join(this.migrationsPath, fileName);

    const migrationContent = `
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    ${this.generateUpMigration(modelName, differences)}
  },

  async down(queryInterface, Sequelize) {
    ${this.generateDownMigration(modelName, differences)}
  }
};`;

    fs.writeFileSync(filePath, migrationContent);
    console.log(`Created migration: ${fileName}`);
  }

  generateUpMigration(modelName, differences) {
    const commands = [];
    const tableName = this.models[modelName].tableName || _.snakeCase(modelName);

    // Add new columns
    Object.entries(differences.newColumns).forEach(([columnName, definition]) => {
      commands.push(`
    await queryInterface.addColumn('${tableName}', '${columnName}', 
      ${JSON.stringify(definition, null, 2)});`);
    });

    // Modify existing columns
    Object.entries(differences.modifiedColumns).forEach(([columnName, definition]) => {
      commands.push(`
    await queryInterface.changeColumn('${tableName}', '${columnName}', 
      ${JSON.stringify(definition, null, 2)});`);
    });

    // Remove columns
    Object.keys(differences.removedColumns).forEach(columnName => {
      commands.push(`
    await queryInterface.removeColumn('${tableName}', '${columnName}');`);
    });

    return commands.join('\n');
  }

  generateDownMigration(modelName, differences) {
    const commands = [];
    const tableName = this.models[modelName].tableName || _.snakeCase(modelName);

    // Reverse the changes
    Object.keys(differences.newColumns).forEach(columnName => {
      commands.push(`
    await queryInterface.removeColumn('${tableName}', '${columnName}');`);
    });

    Object.entries(differences.removedColumns).forEach(([columnName, definition]) => {
      commands.push(`
    await queryInterface.addColumn('${tableName}', '${columnName}', 
      ${JSON.stringify(definition, null, 2)});`);
    });

    return commands.join('\n');
  }

  async checkAndGenerateMigrations() {
    for (const modelName of Object.keys(this.models)) {
      if (modelName === 'sequelize') continue;

      try {
        const differences = await this.compareWithDatabase(modelName);
        if (differences && (
          Object.keys(differences.newColumns).length > 0 ||
          Object.keys(differences.modifiedColumns).length > 0 ||
          Object.keys(differences.removedColumns).length > 0
        )) {
          await this.generateMigration(modelName, differences);
        }
      } catch (error) {
        console.error(`Error checking model ${modelName}:`, error);
      }
    }
  }

  async runMigrations() {
    try {
      await this.checkAndGenerateMigrations();
      await this.umzug.up();
      console.log('Migrations executed successfully');
    } catch (error) {
      console.error('Migration error:', error);
      throw error;
    }
  }

  async revertLastMigration() {
    try {
      await this.umzug.down();
      console.log('Last migration reverted successfully');
    } catch (error) {
      console.error('Migration reversion error:', error);
      throw error;
    }
  }
}

module.exports = MigrationManager;