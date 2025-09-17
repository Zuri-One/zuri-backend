'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // First, add the gender column
      await queryInterface.addColumn('Users', 'gender', {
        type: Sequelize.STRING,
        allowNull: true
      });

      // Then update all existing users to have 'MALE' as gender
      await queryInterface.sequelize.query(
        `UPDATE "Users" SET gender = 'MALE' WHERE gender IS NULL;`
      );

      // Add blood_group column if it doesn't exist
      await queryInterface.addColumn('Users', 'bloodGroup', {
        type: Sequelize.STRING,
        allowNull: true
      });

    } catch (error) {
      console.error('Migration Error:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // Revert the changes
    await queryInterface.removeColumn('Users', 'gender');
    await queryInterface.removeColumn('Users', 'bloodGroup');
  }
};