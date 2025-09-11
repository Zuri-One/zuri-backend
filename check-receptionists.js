require('dotenv').config();
const { sequelize } = require('./src/config/database');
const User = require('./src/models/user.model');

const checkReceptionists = async () => {
  try {
    // Initialize the User model
    User.initModel(sequelize);
    
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Query for receptionists
    const receptionists = await User.findAll({
      where: {
        role: 'RECEPTIONIST',
        isActive: true
      },
      attributes: ['id', 'surname', 'otherNames', 'email', 'telephone1', 'telephone2', 'status', 'createdAt'],
      order: [['createdAt', 'ASC']]
    });

    console.log(`\n📊 Found ${receptionists.length} receptionist(s):\n`);

    if (receptionists.length === 0) {
      console.log('❌ No receptionists found in the system');
    } else {
      receptionists.forEach((receptionist, index) => {
        console.log(`${index + 1}. ${receptionist.surname} ${receptionist.otherNames}`);
        console.log(`   📧 Email: ${receptionist.email || 'Not provided'}`);
        console.log(`   📱 Phone 1: ${receptionist.telephone1}`);
        console.log(`   📱 Phone 2: ${receptionist.telephone2 || 'Not provided'}`);
        console.log(`   📊 Status: ${receptionist.status}`);
        console.log(`   📅 Created: ${receptionist.createdAt.toLocaleDateString()}`);
        console.log('   ' + '-'.repeat(50));
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
};

checkReceptionists();