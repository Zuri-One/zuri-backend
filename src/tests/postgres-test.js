// src/tests/postgres-test.js
require('dotenv').config();
const { connectDB, sequelize } = require('../config/database');
const models = require('../models');

const testConnection = async () => {
  try {
    console.log('\n🔄 Testing PostgreSQL connection...');
    
    // Test connection
    await connectDB();
    console.log('✅ Database connected successfully');

    // Test query
    const users = await models.User.findAll({
      attributes: ['id', 'name', 'email', 'role']
    });
    
    console.log('\n📊 Existing users:', users.map(user => ({
      name: user.name,
      email: user.email,
      role: user.role
    })));

    // Try login with seeded doctor account
    const doctor = await models.User.findOne({
      where: { email: 'doctor@zurihealth.com' }
    });
    console.log('\n👨‍⚕️ Doctor account exists:', !!doctor);

    await sequelize.close();
    console.log('\n✅ All connection tests passed');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
};

testConnection();