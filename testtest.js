// list-users.js
require('dotenv').config();
const { User, Department } = require('./src/models');

async function listAllUsers() {
  try {
    console.log('Fetching all users from database...');
    
    const users = await User.findAll({
      attributes: [
        'id', 
        'email', 
        'surname', 
        'otherNames',
        'role',
        'employeeId',
        'telephone1',
        'gender',
        'dateOfBirth',
        'nationality',
        'licenseNumber',
        'departmentId',
        'primaryDepartmentId',
        'status',
        'isActive',
        'createdAt'
      ],
      include: [
        {
          model: Department,
          as: 'assignedDepartment',
          attributes: ['id', 'name', 'code']
        },
        {
          model: Department,
          as: 'primaryDepartment',
          attributes: ['id', 'name', 'code']
        }
      ],
      order: [
        ['role', 'ASC'],
        ['createdAt', 'DESC']
      ]
    });
    
    // Group users by role
    const usersByRole = {};
    users.forEach(user => {
      const userData = user.toJSON();
      if (!usersByRole[userData.role]) {
        usersByRole[userData.role] = [];
      }
      usersByRole[userData.role].push(userData);
    });
    
    // Print summary
    console.log('\n===== USER SUMMARY =====');
    console.log(`Total users: ${users.length}`);
    Object.keys(usersByRole).forEach(role => {
      console.log(`${role}: ${usersByRole[role].length} users`);
    });
    
    // Print detailed users grouped by role
    Object.keys(usersByRole).sort().forEach(role => {
      console.log(`\n===== ${role} USERS =====`);
      usersByRole[role].forEach((user, index) => {
        console.log(`\n${index + 1}. ${user.surname} ${user.otherNames}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Employee ID: ${user.employeeId || 'N/A'}`);
        console.log(`   Phone: ${user.telephone1 || 'N/A'}`);
        console.log(`   Department: ${user.assignedDepartment ? user.assignedDepartment.name : 'N/A'}`);
        console.log(`   Primary Department: ${user.primaryDepartment ? user.primaryDepartment.name : 'N/A'}`);
        console.log(`   Status: ${user.status} (${user.isActive ? 'Active' : 'Inactive'})`);
        console.log(`   Created: ${user.createdAt}`);
      });
    });
    
  } catch (error) {
    console.error('Error fetching users:', error);
  } finally {
    process.exit();
  }
}

listAllUsers();