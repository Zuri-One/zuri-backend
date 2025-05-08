// add-all-users.js
require('dotenv').config();
const { User, Department } = require('./src/models');
const crypto = require('crypto');
const sendEmail = require('./src/utils/email.util');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

// Utility function to generate a random date of birth between 1995-1999
const generateRandomDOB = () => {
  const start = new Date('1995-01-01');
  const end = new Date('1999-12-31');
  const randomDate = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return randomDate.toISOString().split('T')[0];
};

// Utility function to generate a random ID number (8 digits)
const generateRandomID = () => {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
};

// Function to create a user and send welcome email
const createUser = async (userData) => {
  try {
    console.log(`\n📋 Processing user: ${userData.otherNames} ${userData.surname}`);
    
    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { email: userData.email.toLowerCase() },
          { employeeId: userData.employeeId }
        ]
      }
    });

    if (existingUser) {
      console.log(`⚠️ User with email ${userData.email} or employee ID ${userData.employeeId} already exists. Skipping.`);
      return null;
    }

    // Create the user
    console.log(`Creating user with role: ${userData.role}, department: ${userData.departmentId}`);
    const user = await User.create({
      ...userData,
      email: userData.email.toLowerCase(),
      isEmailVerified: true,
      isActive: true,
      status: 'active',
      joiningDate: new Date()
    });

    console.log(`✅ User created successfully: ${user.id}`);

    // Generate reset token for password setup
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Update user with reset token
    user.resetPasswordToken = hashedResetToken;
    user.resetPasswordExpires = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours
    await user.save();

    // Create password reset URL
    const resetUrl = `${process.env.BACKEND_URL}/api/v1/auth/reset-password-form?token=${resetToken}&setup=true`;

    // Fetch department name
    let departmentName = 'Not assigned';
    try {
      if (user.departmentId) {
        const department = await Department.findByPk(user.departmentId);
        if (department) {
          departmentName = department.name;
        }
      }
    } catch (error) {
      console.error(`Error fetching department: ${error.message}`);
    }

    // Send welcome email
    console.log(`📧 Sending welcome email to ${user.email}...`);
    
    await sendEmail({
      to: user.email,
      subject: 'Welcome to Zuri Health - Set Your Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Zuri Health!</h2>
          <p>Dear ${user.surname} ${user.otherNames},</p>
          <p>Your staff account has been successfully created with the following details:</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Employee ID:</strong> ${user.employeeId}</p>
            <p><strong>Role:</strong> ${user.role}</p>
            <p><strong>Department:</strong> ${departmentName}</p>
          </div>
          
          <p>To set up your password and access the system, please click the button below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Set Your Password</a>
          </div>
          
          <p>This link will expire in 72 hours for security reasons.</p>
          
          <p>You can access the Zuri Health Management System at: <a href="${process.env.FRONTEND_URL}">${process.env.FRONTEND_URL}</a></p>
          
          <p>If you have any questions or need assistance, please contact your system administrator.</p>
          <p>Best regards,<br>Zuri Health Team</p>
        </div>
      `
    });
    
    console.log(`✅ Welcome email sent to ${user.email}`);
    return user;
  } catch (error) {
    console.error(`❌ Error creating user: ${error.message}`);
    if (error.errors) {
      error.errors.forEach(err => console.error(`  - ${err.message}`));
    }
    return null;
  }
};

// Main function to add all users
const addAllUsers = async () => {
  try {
    console.log('🚀 Starting user creation process...');
    
    // First, fetch all departments to get IDs
    console.log('📚 Fetching departments...');
    const departments = await Department.findAll();
    
    // Create a map of department name to ID for easier lookup
    const departmentMap = {};
    departments.forEach(dept => {
      departmentMap[dept.name.toLowerCase()] = dept.id;
      // Also add code mapping for easier lookup
      if (dept.code) {
        departmentMap[dept.code.toLowerCase()] = dept.id;
      }
    });
    
    console.log('Department map created:');
    Object.keys(departmentMap).forEach(key => {
      console.log(`  - ${key}: ${departmentMap[key]}`);
    });

    // Helper function to find department ID
    const findDepartmentId = (departmentInfo) => {
      if (!departmentInfo) return null;
      
      // Try exact match
      const deptLower = departmentInfo.toLowerCase();
      if (departmentMap[deptLower]) return departmentMap[deptLower];
      
      // Try partial matches
      for (const [key, value] of Object.entries(departmentMap)) {
        if (deptLower.includes(key) || key.includes(deptLower)) {
          return value;
        }
      }
      
      // Special mappings
      if (deptLower.includes('triage')) return departmentMap['triage-001'] || departmentMap['triage'];
      if (deptLower.includes('gen') && deptLower.includes('med')) return departmentMap['gen_med'];
      if (deptLower.includes('lab')) return departmentMap['lab'] || departmentMap['laboratory'];
      if (deptLower.includes('recep')) return departmentMap['recp-001'] || departmentMap['reception'];
      if (deptLower.includes('pharm')) return departmentMap['phar'] || departmentMap['pharmacy'];
      if (deptLower.includes('med')) return departmentMap['gen_med'] || departmentMap['medical'];
      
      // Default to General Medicine if no match found
      return departmentMap['gen_med'] || null;
    };

    // Define users data
    const usersData = [
      // 1. Cynthia Mwihaki
      {
        surname: 'Mwihaki',
        otherNames: 'Cynthia',
        email: 'cynthia@zuri.health',
        password: 'Password123',
        role: 'NURSE',
        departmentId: findDepartmentId('triage'),
        employeeId: 'ZH-CM-2025',
        telephone1: '0722268494',
        gender: 'FEMALE',
        dateOfBirth: '1994-06-23',
        town: 'Nairobi',
        areaOfResidence: 'Nairobi',
        idType: 'NATIONAL_ID',
        idNumber: '30711427',
        nationality: 'Kenyan',
        licenseNumber: 'KNL-' + Math.floor(10000 + Math.random() * 90000),
        designation: 'Triage Nurse'
      },
      
      // 2. Santa Odoyo
      {
        surname: 'Odoyo',
        otherNames: 'Santa',
        email: 'santaseps@gmail.com',
        password: 'Password123',
        role: 'NURSE',
        departmentId: findDepartmentId('triage'),
        employeeId: 'ZH-SO-2025',
        telephone1: '0796671566',
        gender: 'FEMALE',
        dateOfBirth: '1998-03-09',
        town: 'Nairobi',
        areaOfResidence: 'Nairobi',
        idType: 'NATIONAL_ID',
        idNumber: '34476319',
        nationality: 'Kenyan',
        licenseNumber: 'KNL-' + Math.floor(10000 + Math.random() * 90000),
        designation: 'Triage Nurse'
      },
      
      // 3. Malcolm Mwai
      {
        surname: 'Mwai',
        otherNames: 'Malcolm',
        email: 'malcolm@zuri.health',
        password: 'Password123',
        role: 'NURSE',
        departmentId: findDepartmentId('triage'),
        employeeId: 'ZH-MM-2025',
        telephone1: '0705741285',
        gender: 'MALE',
        dateOfBirth: '1997-07-02',
        town: 'Nairobi',
        areaOfResidence: 'Nairobi',
        idType: 'NATIONAL_ID',
        idNumber: '33565702',
        nationality: 'Kenyan',
        licenseNumber: 'KNL-' + Math.floor(10000 + Math.random() * 90000),
        designation: 'Triage Nurse - Nutrition'
      },
      
      // 4. Lillian Masika
      {
        surname: 'Masika',
        otherNames: 'Lillian',
        email: 'Lillian.masika@zuri.health',
        password: 'Password123',
        role: 'DOCTOR',
        departmentId: findDepartmentId('gen_med'),
        employeeId: 'ZH-LM-2025',
        licenseNumber: 'KMD-' + Math.floor(10000 + Math.random() * 90000),
        specialization: ["General Medicine"],
        qualification: ["MD"],
        telephone1: '0701483535',
        gender: 'FEMALE',
        dateOfBirth: '1997-02-15',
        town: 'Nairobi',
        areaOfResidence: 'Nairobi',
        idType: 'NATIONAL_ID',
        idNumber: '30602928',
        nationality: 'Kenyan',
        designation: 'General Medicine Doctor'
      },
      
      // 5. Antony Ndegwa
      {
        surname: 'Ndegwa',
        otherNames: 'Antony',
        email: 'antony@zuri.health',
        password: 'Password123',
        role: 'DOCTOR',
        departmentId: findDepartmentId('gen_med'),
        employeeId: 'ZH-AN-2025',
        licenseNumber: 'KMD-' + Math.floor(10000 + Math.random() * 90000),
        specialization: ["General Medicine"],
        qualification: ["MD"],
        telephone1: '0795191768',
        gender: 'MALE',
        dateOfBirth: '1995-06-01',
        town: 'Nairobi',
        areaOfResidence: 'Nairobi',
        idType: 'NATIONAL_ID',
        idNumber: '32401469',
        nationality: 'Kenyan',
        designation: 'General Medicine Doctor'
      },
      
      // 6. Doreen Bosibori
      {
        surname: 'Bosibori',
        otherNames: 'Doreen',
        email: 'lab@zuri.health',
        password: 'Password123',
        role: 'LAB_TECHNICIAN',
        departmentId: findDepartmentId('lab'),
        employeeId: 'ZH-DB-2025',
        licenseNumber: 'KLT-' + Math.floor(10000 + Math.random() * 90000),
        specialization: ["Medical Laboratory"],
        qualification: ["BSc. Medical Laboratory Sciences"],
        telephone1: '0797623652',
        gender: 'FEMALE',
        dateOfBirth: '1996-07-26',
        town: 'Nairobi',
        areaOfResidence: 'Nairobi',
        idType: 'NATIONAL_ID',
        idNumber: '33070539',
        nationality: 'Kenyan',
        designation: 'Laboratory Technician'
      },
      
      // 7. Hudson Vulimu
      {
        surname: 'Vulimu',
        otherNames: 'Hudson',
        email: 'kamandehudson@gmail.com',
        password: 'Password123',
        role: 'LAB_TECHNICIAN',
        departmentId: findDepartmentId('lab'),
        employeeId: 'ZH-HV-2025',
        licenseNumber: 'KLT-' + Math.floor(10000 + Math.random() * 90000),
        specialization: ["Medical Laboratory"],
        qualification: ["BSc. Medical Laboratory Sciences"],
        telephone1: '0703971845',
        gender: 'MALE',
        dateOfBirth: '1995-06-26',
        town: 'Nairobi',
        areaOfResidence: 'Nairobi',
        idType: 'NATIONAL_ID',
        idNumber: '31871555',
        nationality: 'Kenyan',
        designation: 'Laboratory Technician'
      },
      
      // 8. Winner Kathomi
      {
        surname: 'Kathomi',
        otherNames: 'Winner',
        email: 'kathomiwinner8@gmail.com',
        password: 'Password123',
        role: 'RECEPTIONIST',
        departmentId: findDepartmentId('reception'),
        employeeId: 'ZH-WK-2025',
        telephone1: '0792823276',
        gender: 'FEMALE',
        dateOfBirth: '1998-12-09',
        town: 'Nairobi',
        areaOfResidence: 'Nairobi',
        idType: 'NATIONAL_ID',
        idNumber: '35822622',
        nationality: 'Kenyan',
        designation: 'Receptionist'
      },
      
      // 9. Joy John
      {
        surname: 'John',
        otherNames: 'Joy',
        email: 'joy@zuri.health',
        password: 'Password123',
        role: 'NURSE',
        departmentId: findDepartmentId('triage'),
        employeeId: 'ZH-JJ-2025',
        licenseNumber: 'KNL-' + Math.floor(10000 + Math.random() * 90000),
        telephone1: '0798520758',
        gender: 'FEMALE',
        dateOfBirth: '2000-02-02',
        town: 'Nairobi',
        areaOfResidence: 'Nairobi',
        idType: 'NATIONAL_ID',
        idNumber: generateRandomID(),
        nationality: 'Nigerian',
        designation: 'Triage Nurse'
      },
      
      // 10. Brian Kimondo
      {
        surname: 'Kimondo',
        otherNames: 'Brian',
        email: 'bkimondo60@gmail.com',
        password: 'Password123',
        role: 'DOCTOR',
        departmentId: findDepartmentId('gen_med'),
        employeeId: 'ZH-BK-2025',
        licenseNumber: 'KMD-' + Math.floor(10000 + Math.random() * 90000),
        specialization: ["General Medicine"],
        qualification: ["MD"],
        telephone1: '0703316232',
        gender: 'MALE',
        dateOfBirth: '2001-09-12',
        town: 'Nairobi',
        areaOfResidence: 'Nairobi',
        idType: 'NATIONAL_ID',
        idNumber: '38620117',
        nationality: 'Kenyan',
        designation: 'General Medicine Doctor'
      },
      
      // 11. Irene Muthoni
      {
        surname: 'Muthoni',
        otherNames: 'Irene',
        email: 'irene@zuri.health',
        password: 'Password123',
        role: 'DOCTOR',
        departmentId: findDepartmentId('gen_med'),
        employeeId: 'ZH-IM-2025',
        licenseNumber: 'KMD-' + Math.floor(10000 + Math.random() * 90000),
        specialization: ["General Medicine"],
        qualification: ["MD"],
        telephone1: '0723877226',
        gender: 'FEMALE',
        dateOfBirth: generateRandomDOB(),
        town: 'Nairobi',
        areaOfResidence: 'Nairobi',
        idType: 'NATIONAL_ID',
        idNumber: generateRandomID(),
        nationality: 'Kenyan',
        designation: 'General Medicine Doctor'
      },
      
      // 12. Esther Ogembo
      {
        surname: 'Ogembo',
        otherNames: 'Esther',
        email: 'esther@zuri.health',
        password: 'Password123',
        role: 'DOCTOR',
        departmentId: findDepartmentId('gen_med'),
        employeeId: 'ZH-EO-2025',
        licenseNumber: 'KMD-' + Math.floor(10000 + Math.random() * 90000),
        specialization: ["General Medicine"],
        qualification: ["MD"],
        telephone1: '0701432231',
        gender: 'FEMALE',
        dateOfBirth: '1992-02-22',
        town: 'Nairobi',
        areaOfResidence: 'Nairobi',
        idType: 'NATIONAL_ID',
        idNumber: '28737344',
        nationality: 'Kenyan',
        designation: 'General Medicine Doctor'
      },
      
      // 13. Erick Onyango Ngolo
      {
        surname: 'Ngolo',
        otherNames: 'Erick Onyango',
        email: 'ngolo@zuri.health',
        password: 'Password123',
        role: 'DOCTOR',
        departmentId: findDepartmentId('gen_med'),
        employeeId: 'ZH-EN-2025',
        licenseNumber: 'KMD-' + Math.floor(10000 + Math.random() * 90000),
        specialization: ["General Medicine"],
        qualification: ["MD"],
        telephone1: '0708159270',
        gender: 'MALE',
        dateOfBirth: '1996-05-28',
        town: 'Nairobi',
        areaOfResidence: 'Nairobi',
        idType: 'NATIONAL_ID',
        idNumber: '33233245',
        nationality: 'Kenyan',
        designation: 'General Medicine Doctor'
      },
      
      // 14. Georgina Nyaka
      {
        surname: 'Nyaka',
        otherNames: 'Georgina',
        email: 'georgina@zuri.health',
        password: 'Password123',
        role: 'DOCTOR',
        departmentId: findDepartmentId('gen_med'),
        employeeId: 'ZH-GN-2025',
        licenseNumber: 'KMD-' + Math.floor(10000 + Math.random() * 90000),
        specialization: ["General Medicine"],
        qualification: ["MD"],
        telephone1: '0703229202',
        gender: 'FEMALE',
        dateOfBirth: generateRandomDOB(),
        town: 'Nairobi',
        areaOfResidence: 'Nairobi',
        idType: 'NATIONAL_ID',
        idNumber: generateRandomID(),
        nationality: 'Kenyan',
        designation: 'Medical Doctor'
      },
      
      // 15. Barbara Tarno
      {
        surname: 'Tarno',
        otherNames: 'Barbara',
        email: 'barbara@zuri.health',
        password: 'Password123',
        role: 'DOCTOR',
        departmentId: findDepartmentId('gen_med'),
        employeeId: 'ZH-BT-2025',
        licenseNumber: 'KMD-' + Math.floor(10000 + Math.random() * 90000),
        specialization: ["General Medicine"],
        qualification: ["MD"],
        telephone1: '0717700049',
        gender: 'FEMALE',
        dateOfBirth: generateRandomDOB(),
        town: 'Nairobi',
        areaOfResidence: 'Nairobi',
        idType: 'NATIONAL_ID',
        idNumber: generateRandomID(),
        nationality: 'Kenyan',
        designation: 'Senior Medical Manager'
      },
      
      // 16. Abigael Mwangi
      {
        surname: 'Mwangi',
        otherNames: 'Abigael',
        email: 'abigael@zuri.health',
        password: 'Password123',
        role: 'PHARMACIST',
        departmentId: findDepartmentId('pharmacy'),
        employeeId: 'ZH-AM-2025',
        licenseNumber: 'KPH-' + Math.floor(10000 + Math.random() * 90000),
        specialization: ["Pharmacy"],
        qualification: ["BPharm"],
        telephone1: '0723833689',
        gender: 'FEMALE',
        dateOfBirth: '1991-11-24',
        town: 'Nairobi',
        areaOfResidence: 'Nairobi',
        idType: 'NATIONAL_ID',
        idNumber: '29112793',
        nationality: 'Kenyan',
        designation: 'Pharmacist'
      },
      
      // 17. Sally Masika
      {
        surname: 'Masika',
        otherNames: 'Sally',
        email: 'sally.masika@zuri.health',
        password: 'Password123',
        role: 'PHARMACIST',
        departmentId: findDepartmentId('pharmacy'),
        employeeId: 'ZH-SM-2025',
        licenseNumber: 'KPH-' + Math.floor(10000 + Math.random() * 90000),
        specialization: ["Pharmacy"],
        qualification: ["BPharm"],
        telephone1: '0723239335',
        gender: 'FEMALE',
        dateOfBirth: '1991-05-16',
        town: 'Nairobi',
        areaOfResidence: 'Nairobi',
        idType: 'NATIONAL_ID',
        idNumber: '28194583',
        nationality: 'Kenyan',
        designation: 'Pharmacist'
      }
    ];

    // Process users sequentially
    console.log(`🔄 Processing ${usersData.length} users...`);
    
    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      users: []
    };
    
    for (const [index, userData] of usersData.entries()) {
      console.log(`\n== Processing user ${index + 1}/${usersData.length}: ${userData.otherNames} ${userData.surname} ==`);
      try {
        const user = await createUser(userData);
        if (user) {
          results.success++;
          results.users.push({
            name: `${userData.otherNames} ${userData.surname}`,
            email: userData.email,
            result: 'SUCCESS'
          });
        } else {
          results.skipped++;
          results.users.push({
            name: `${userData.otherNames} ${userData.surname}`,
            email: userData.email,
            result: 'SKIPPED'
          });
        }
      } catch (error) {
        console.error(`Error processing user ${userData.email}: ${error.message}`);
        results.failed++;
        results.users.push({
          name: `${userData.otherNames} ${userData.surname}`,
          email: userData.email,
          result: 'FAILED',
          error: error.message
        });
      }
      
      // Add delay between users to prevent rate limiting
      if (index < usersData.length - 1) {
        console.log('Waiting 2 seconds before next user...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Print summary
    console.log('\n=== USER CREATION SUMMARY ===');
    console.log(`Total users processed: ${usersData.length}`);
    console.log(`✅ Successfully created: ${results.success}`);
    console.log(`⚠️ Skipped: ${results.skipped}`);
    console.log(`❌ Failed: ${results.failed}`);
    
    console.log('\nUser details:');
    results.users.forEach(user => {
      console.log(`- ${user.name} (${user.email}): ${user.result}`);
    });
    
    return results;
  } catch (error) {
    console.error(`❌ Fatal error: ${error.message}`);
    throw error;
  } finally {
    // Close database connection
    const { sequelize } = require('./src/models');
    await sequelize.close();
    console.log('Database connection closed.');
  }
};

// Run the script
console.log('==== ZURI HEALTH USER CREATION SCRIPT ====');
console.log(`Started at: ${new Date().toISOString()}`);
console.log('=======================================\n');

addAllUsers()
  .then(() => {
    console.log('\n=======================================');
    console.log(`Completed at: ${new Date().toISOString()}`);
    console.log('==== SCRIPT EXECUTION COMPLETED ====');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script execution failed:', error);
    process.exit(1);
  });