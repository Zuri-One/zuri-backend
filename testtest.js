// update-users.js
const axios = require('axios');
const fs = require('fs');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:10000';
const BEARER_TOKEN = process.env.BEARER_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjdlZWNhNDQ4LWNhOTItNGYxOS1hZTc0LWY1MGZlMTVkY2QzYyIsInJvbGUiOiJBRE1JTiIsInBlcm1pc3Npb25zIjpbImFsbCJdLCJpYXQiOjE3NDczMTg3MTQsImV4cCI6MTc0NzQwNTExNH0.JEHC16bQ178H0fzL10wkoTnaHRP_fg5jVrX6RUZhR_I';

// Helper function to log responses
const logResponse = (name, action, response, error = null) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    user: name,
    action: action,
    success: !error,
    data: error ? null : response.data,
    error: error ? (error.response ? error.response.data : error.message) : null,
    status: error ? (error.response ? error.response.status : 'ERROR') : response.status
  };
  
  console.log(`${logEntry.success ? '✅' : '❌'} ${name} - ${action}: ${logEntry.success ? 'Success' : 'Failed'}`);
  
  // Append to log file
  fs.appendFileSync('user-updates.log', JSON.stringify(logEntry, null, 2) + ',\n');
};

// Format phone number to include country code with + prefix
const formatPhoneNumber = (phone, country = 'Kenya') => {
  if (!phone) return null;
  
  // Already has + prefix
  if (phone.startsWith('+')) return phone;
  
  // Remove any leading zeros
  let cleanNumber = phone.replace(/^0+/, '');
  
  // Add country code based on country
  if (country === 'Kenya') {
    return `+254${cleanNumber}`;
  } else if (country === 'Uganda') {
    return `+256${cleanNumber}`;
  } else if (country === 'Nigeria') {
    return `+234${cleanNumber}`;
  }
  
  // Default to Kenya if country not specified
  return `+254${cleanNumber}`;
};

// Generate random date of birth (between 25-45 years ago)
const generateRandomDOB = () => {
  const today = new Date();
  const minAge = 25;
  const maxAge = 45;
  const randomYears = Math.floor(Math.random() * (maxAge - minAge + 1)) + minAge;
  const randomMonth = Math.floor(Math.random() * 12);
  const randomDay = Math.floor(Math.random() * 28) + 1; // Avoid edge cases with month lengths
  
  const dob = new Date(today.getFullYear() - randomYears, randomMonth, randomDay);
  return dob.toISOString().split('T')[0]; // YYYY-MM-DD format
};

// Generate random ID number (8 digits for Kenya, 9 digits for Uganda, 11 digits for Nigeria)
const generateRandomID = (country = 'Kenya') => {
  let digits = 8; // Default for Kenya
  
  if (country === 'Uganda') {
    digits = 9;
  } else if (country === 'Nigeria') {
    digits = 11;
  }
  
  let id = '';
  for (let i = 0; i < digits; i++) {
    id += Math.floor(Math.random() * 10);
  }
  return id;
};

// Function to find a user by email
const findUserByEmail = async (email) => {
  try {
    console.log(`🔍 Looking up user: ${email}`);
    
    const headers = {
      'Authorization': `Bearer ${BEARER_TOKEN}`
    };
    
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/users/search?email=${encodeURIComponent(email)}`,
      { headers }
    );
    
    if (response.data && response.data.data && response.data.data.length > 0) {
      return response.data.data[0];
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Error finding user: ${error.message}`);
    return null;
  }
};

// Function to update a user
const updateUser = async (userId, updateData) => {
  try {
    console.log(`📝 Updating user ID: ${userId}`);
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${BEARER_TOKEN}`
    };
    
    const response = await axios.put(
      `${API_BASE_URL}/api/v1/users/${userId}`,
      updateData,
      { headers }
    );
    
    return response;
  } catch (error) {
    console.error(`❌ Error updating user: ${error.message}`);
    throw error;
  }
};

// Function to create a new user
const createUser = async (userData) => {
  try {
    console.log(`➕ Creating new user: ${userData.email}`);
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${BEARER_TOKEN}`
    };
    
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/auth/register`,
      userData,
      { headers }
    );
    
    return response;
  } catch (error) {
    console.error(`❌ Error creating user: ${error.message}`);
    throw error;
  }
};

// Function to send password reset link
const sendPasswordResetLink = async (email) => {
  try {
    console.log(`📧 Sending password reset link to: ${email}`);
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/auth/forgot-password`,
      { email },
      { headers }
    );
    
    return response;
  } catch (error) {
    console.error(`❌ Error sending reset link: ${error.message}`);
    throw error;
  }
};

// Main function to process user updates
const processUsers = async () => {
  // Initialize log file
  fs.writeFileSync('user-updates.log', '[\n');
  
  // Users to be updated or created
  const usersToProcess = [
    // 1. Cynthia Mwihaki - Update Triage Nurse
    {
      action: "update",
      email: "cynthia@zuri.health",
      userData: {
        surname: "Mwihaki",
        otherNames: "Cynthia",
        telephone1: formatPhoneNumber("0722268494"),
        gender: "FEMALE",
        dateOfBirth: "1994-06-23",
        departmentId: "725380c2-0120-4e90-a9e6-72120c035cf0", // Triage department
        primaryDepartmentId: "725380c2-0120-4e90-a9e6-72120c035cf0",
        employeeId: "ZH-CM-2025",
        town: "Nairobi",
        areaOfResidence: "Nairobi",
        idType: "NATIONAL_ID",
        idNumber: "30711427",
        nationality: "Kenyan",
        designation: "Triage Nurse"
      }
    },
    
    // 2. Santa Odoyo - Update Triage Nurse
    {
      action: "update",
      email: "santaseps@gmail.com",
      userData: {
        surname: "Odoyo",
        otherNames: "Santa",
        telephone1: formatPhoneNumber("0796671566"),
        gender: "FEMALE",
        dateOfBirth: "1998-03-09",
        departmentId: "725380c2-0120-4e90-a9e6-72120c035cf0", // Triage department
        primaryDepartmentId: "725380c2-0120-4e90-a9e6-72120c035cf0",
        employeeId: "ZH-SO-2025",
        town: "Nairobi",
        areaOfResidence: "Nairobi",
        idType: "NATIONAL_ID",
        idNumber: "34476319",
        nationality: "Kenyan",
        designation: "Triage Nurse"
      }
    },
    
    // 3. Malcolm Mwai - Update Triage Nurse
    {
      action: "update",
      email: "malcolm@zuri.health",
      userData: {
        surname: "Mwai",
        otherNames: "Malcolm",
        telephone1: formatPhoneNumber("0705741285"),
        gender: "MALE",
        dateOfBirth: "1997-07-02",
        departmentId: "725380c2-0120-4e90-a9e6-72120c035cf0", // Triage department
        primaryDepartmentId: "725380c2-0120-4e90-a9e6-72120c035cf0",
        employeeId: "ZH-MM-2025",
        town: "Nairobi",
        areaOfResidence: "Nairobi",
        idType: "NATIONAL_ID",
        idNumber: "33565702",
        nationality: "Kenyan",
        designation: "Triage Nurse - Nutrition"
      }
    },
    
    // 4. Lillian Masika - Update Doctor
    {
      action: "update",
      email: "lillian.masika@zuri.health",
      userData: {
        surname: "Masika",
        otherNames: "Lillian",
        telephone1: formatPhoneNumber("0701483535"),
        gender: "FEMALE",
        dateOfBirth: "1997-02-15",
        departmentId: "bd09f836-4145-44cf-b8ca-79029f639198", // General Medicine
        primaryDepartmentId: "bd09f836-4145-44cf-b8ca-79029f639198",
        employeeId: "ZH-LM-2025",
        licenseNumber: "KMD-12345",
        specialization: ["General Medicine"],
        qualification: ["MD"],
        town: "Nairobi",
        areaOfResidence: "Nairobi",
        idType: "NATIONAL_ID",
        idNumber: "30602928",
        nationality: "Kenyan",
        designation: "General Medicine Doctor"
      }
    },
    
    // 5. Antony Ndegwa - Update Doctor
    {
      action: "update",
      email: "antony@zuri.health",
      userData: {
        surname: "Ndegwa",
        otherNames: "Antony",
        telephone1: formatPhoneNumber("0795191768"),
        gender: "MALE",
        dateOfBirth: "1995-06-01",
        departmentId: "bd09f836-4145-44cf-b8ca-79029f639198", // General Medicine
        primaryDepartmentId: "bd09f836-4145-44cf-b8ca-79029f639198",
        employeeId: "ZH-AN-2025",
        licenseNumber: "KMD-23456",
        specialization: ["General Medicine"],
        qualification: ["MD"],
        town: "Nairobi",
        areaOfResidence: "Nairobi",
        idType: "NATIONAL_ID",
        idNumber: "32401469",
        nationality: "Kenyan",
        designation: "General Medicine Doctor"
      }
    },
    
    // 6. Doreen Bosibori - Update Lab Technologist
    {
      action: "update",
      email: "lab@zuri.health",
      userData: {
        surname: "Bosibori",
        otherNames: "Doreen",
        telephone1: formatPhoneNumber("0797623652"),
        gender: "FEMALE",
        dateOfBirth: "1996-07-26",
        departmentId: "1e4f468c-4e26-4350-8bce-cb62069ebd55", // Laboratory
        primaryDepartmentId: "1e4f468c-4e26-4350-8bce-cb62069ebd55",
        employeeId: "ZH-DB-2025",
        licenseNumber: "KLT-12345",
        specialization: ["Medical Laboratory"],
        qualification: ["BSc. Medical Laboratory Sciences"],
        town: "Nairobi",
        areaOfResidence: "Nairobi",
        idType: "NATIONAL_ID",
        idNumber: "33070539",
        nationality: "Kenyan",
        designation: "Laboratory Technologist"
      }
    },
    
    // 7. Hudson Vulimu - Update Lab Technologist
    {
      action: "update",
      email: "kamandehudson@gmail.com",
      userData: {
        surname: "Vulimu",
        otherNames: "Hudson",
        telephone1: formatPhoneNumber("0703971845"),
        gender: "MALE",
        dateOfBirth: "1995-06-26",
        departmentId: "1e4f468c-4e26-4350-8bce-cb62069ebd55", // Laboratory
        primaryDepartmentId: "1e4f468c-4e26-4350-8bce-cb62069ebd55",
        employeeId: "ZH-HV-2025",
        licenseNumber: "KLT-23456",
        specialization: ["Medical Laboratory"],
        qualification: ["BSc. Medical Laboratory Sciences"],
        town: "Nairobi",
        areaOfResidence: "Nairobi",
        idType: "NATIONAL_ID",
        idNumber: "31871555",
        nationality: "Kenyan",
        designation: "Laboratory Technologist"
      }
    },
    
    // 8. Winner Kathomi - Update Receptionist
    {
      action: "update",
      email: "kathomiwinner8@gmail.com",
      userData: {
        surname: "Kathomi",
        otherNames: "Winner",
        telephone1: formatPhoneNumber("0792823276"),
        gender: "FEMALE",
        dateOfBirth: "1998-12-09",
        departmentId: "328c72ad-7689-4cdb-9995-77c2d54f3775", // Reception
        primaryDepartmentId: "328c72ad-7689-4cdb-9995-77c2d54f3775",
        employeeId: "ZH-WK-2025",
        town: "Nairobi",
        areaOfResidence: "Nairobi",
        idType: "NATIONAL_ID",
        idNumber: "35822622",
        nationality: "Kenyan",
        designation: "Receptionist"
      }
    },
    
    // 9. Joy John - Update Triage Nurse (Nigerian)
    {
      action: "update",
      email: "joy@zuri.health",
      userData: {
        surname: "John",
        otherNames: "Joy",
        telephone1: formatPhoneNumber("0798520758"),
        gender: "FEMALE",
        dateOfBirth: "2000-02-02",
        departmentId: "725380c2-0120-4e90-a9e6-72120c035cf0", // Triage department
        primaryDepartmentId: "725380c2-0120-4e90-a9e6-72120c035cf0",
        employeeId: "ZH-JJ-2025",
        town: "Nairobi",
        areaOfResidence: "Nairobi",
        idType: "NATIONAL_ID",
        idNumber: "40123456",
        nationality: "Nigerian",
        designation: "Triage Nurse"
      }
    },
    
    // 10. Brian Kimondo - Update Doctor
    {
      action: "update",
      email: "bkimondo60@gmail.com",
      userData: {
        surname: "Kimondo",
        otherNames: "Brian",
        telephone1: formatPhoneNumber("0703316232"),
        gender: "MALE",
        dateOfBirth: "2001-09-12",
        departmentId: "bd09f836-4145-44cf-b8ca-79029f639198", // General Medicine
        primaryDepartmentId: "bd09f836-4145-44cf-b8ca-79029f639198",
        employeeId: "ZH-BK-2025",
        licenseNumber: "KMD-34567",
        specialization: ["General Medicine"],
        qualification: ["MD"],
        town: "Nairobi",
        areaOfResidence: "Nairobi",
        idType: "NATIONAL_ID",
        idNumber: "38620117",
        nationality: "Kenyan",
        designation: "General Medicine Doctor"
      }
    },
    
    // 11. Daphine Kamau - Update Customer Care (fix email & add more details)
    {
      action: "update",
      email: "customercareke@zuri.health", // Find by current email
      userData: {
        surname: "Kamau",
        otherNames: "Daphine",
        email: "daphinekamau2018@gmail.com", // Update to new email
        telephone1: formatPhoneNumber("0790441059"),
        gender: "FEMALE",
        dateOfBirth: "1999-07-21",
        departmentId: "328c72ad-7689-4cdb-9995-77c2d54f3775", // Reception
        primaryDepartmentId: "328c72ad-7689-4cdb-9995-77c2d54f3775",
        employeeId: "ZH-DK-2025",
        town: "Nairobi",
        areaOfResidence: "Nairobi",
        idType: "NATIONAL_ID",
        idNumber: "37013633",
        nationality: "Kenyan",
        designation: "Customer Care Representative"
      }
    },
    
    // 12. Rose Mutua - Update Customer Care
    {
      action: "update",
      email: "customercareke1@zuri.health", 
      userData: {
        surname: "Mutua",
        otherNames: "Rose",
        telephone1: formatPhoneNumber("0799713631"),
        gender: "FEMALE",
        dateOfBirth: generateRandomDOB(),
        departmentId: "328c72ad-7689-4cdb-9995-77c2d54f3775", // Reception
        primaryDepartmentId: "328c72ad-7689-4cdb-9995-77c2d54f3775",
        employeeId: "ZH-RM-2025",
        town: "Nairobi",
        areaOfResidence: "Nairobi",
        idType: "NATIONAL_ID",
        idNumber: generateRandomID(),
        nationality: "Kenyan",
        designation: "Customer Care Representative"
      }
    },
    
    // 13. Georgina Nyaka - Update Doctor
    {
      action: "update",
      email: "georgina@zuri.health",
      userData: {
        surname: "Nyaka",
        otherNames: "Georgina",
        telephone1: formatPhoneNumber("0703229202"),
        gender: "FEMALE",
        dateOfBirth: generateRandomDOB(),
        departmentId: "bd09f836-4145-44cf-b8ca-79029f639198", // Medical department
        primaryDepartmentId: "bd09f836-4145-44cf-b8ca-79029f639198",
        employeeId: "ZH-GN-2025",
        licenseNumber: "KMD-" + Math.floor(10000 + Math.random() * 90000),
        specialization: ["General Medicine"],
        qualification: ["MD"],
        town: "Nairobi",
        areaOfResidence: "Nairobi",
        idType: "NATIONAL_ID",
        idNumber: generateRandomID(),
        nationality: "Kenyan",
        designation: "Medical Doctor"
      }
    },
    
    // 14. Barbara Tarno - Update Doctor
    {
      action: "update",
      email: "barbara@zuri.health",
      userData: {
        surname: "Tarno",
        otherNames: "Barbara",
        telephone1: formatPhoneNumber("0717700049"),
        telephone2: formatPhoneNumber("0731700049"), // WhatsApp number
        gender: "FEMALE",
        dateOfBirth: generateRandomDOB(),
        departmentId: "bd09f836-4145-44cf-b8ca-79029f639198", // Medical department
        primaryDepartmentId: "bd09f836-4145-44cf-b8ca-79029f639198",
        employeeId: "ZH-BT-2025",
        licenseNumber: "KMD-" + Math.floor(10000 + Math.random() * 90000),
        specialization: ["General Medicine"],
        qualification: ["MD"],
        town: "Nairobi",
        areaOfResidence: "Nairobi",
        idType: "NATIONAL_ID",
        idNumber: generateRandomID(),
        nationality: "Kenyan",
        designation: "Medical Doctor"
      }
    },
    
    // 15. David Wambiri - Update Nurse
    {
      action: "update",
      email: "isaacw@identifyafrica.io",
      userData: {
        surname: "Wambiri",
        otherNames: "David",
        telephone1: formatPhoneNumber("0765489992"),
        gender: "MALE",
        dateOfBirth: "1998-08-06",
        departmentId: "725380c2-0120-4e90-a9e6-72120c035cf0", // Triage department
        primaryDepartmentId: "725380c2-0120-4e90-a9e6-72120c035cf0",
        employeeId: "ZH-DW-2025",
        town: "Nairobi",
        areaOfResidence: "Nairobi",
        idType: "NATIONAL_ID",
        idNumber: generateRandomID(),
        nationality: "Kenyan",
        designation: "Triage Nurse",
        specialization: ["Triage Nursing", "Emergency Care"]
      }
    },
    
    // 16. Erick Onyango Ngolo - Update Doctor
    {
      action: "update",
      email: "ngolo@zuri.health",
      userData: {
        surname: "Ngolo",
        otherNames: "Erick Onyango",
        telephone1: formatPhoneNumber("0708159270"),
        gender: "MALE",
        dateOfBirth: "1996-05-28",
        departmentId: "bd09f836-4145-44cf-b8ca-79029f639198", // General Medicine
        primaryDepartmentId: "bd09f836-4145-44cf-b8ca-79029f639198",
        employeeId: "ZH-EON-2025",
        licenseNumber: "KMD-" + Math.floor(10000 + Math.random() * 90000),
        specialization: ["General Medicine"],
        qualification: ["MD"],
        town: "Nairobi",
        areaOfResidence: "Nairobi",
        idType: "NATIONAL_ID",
        idNumber: "33233245",
        nationality: "Kenyan",
        designation: "General Medicine Doctor"
      }
    },
    
    // 17. Irene Muthoni - Update Doctor
    {
      action: "update",
      email: "irene@zuri.health",
      userData: {
        surname: "Muthoni",
        otherNames: "Irene",
        telephone1: formatPhoneNumber("0723877226"),
        gender: "FEMALE",
        dateOfBirth: generateRandomDOB(),
        departmentId: "bd09f836-4145-44cf-b8ca-79029f639198", // General Medicine
        primaryDepartmentId: "bd09f836-4145-44cf-b8ca-79029f639198",
        employeeId: "ZH-IM-2025",
        licenseNumber: "KMD-" + Math.floor(10000 + Math.random() * 90000),
        specialization: ["General Medicine"],
        qualification: ["MD"],
        town: "Nairobi",
        areaOfResidence: "Nairobi",
        idType: "NATIONAL_ID",
        idNumber: generateRandomID(),
        nationality: "Kenyan",
        designation: "General Medicine Doctor"
      }
    },
    
    // 18. Sally Masika - Update Pharmacist
    {
      action: "update",
      email: "sally.masika@zuri.health",
      userData: {
        surname: "Masika",
        otherNames: "Sally",
        telephone1: formatPhoneNumber("0723239335"),
        gender: "FEMALE",
        dateOfBirth: "1991-05-16",
        departmentId: "0bdcccf4-cc88-44e6-b066-4856b02157b3", // Pharmacy department
        primaryDepartmentId: "0bdcccf4-cc88-44e6-b066-4856b02157b3",
        employeeId: "ZH-SM-2025",
        licenseNumber: "KPH-" + Math.floor(10000 + Math.random() * 90000),
        specialization: ["Pharmacy"],
        qualification: ["BPharm"],
        town: "Nairobi",
        areaOfResidence: "Nairobi",
        idType: "NATIONAL_ID",
        idNumber: "28194583",
        nationality: "Kenyan",
        designation: "Pharmacist"
      }
    },
    
    // 19. Abigael Mwangi - Update Pharmacist
    {
      action: "update",
      email: "abigael@zuri.health",
      userData: {
        surname: "Mwangi",
        otherNames: "Abigael",
        telephone1: formatPhoneNumber("0723833689"),
        gender: "FEMALE",
        dateOfBirth: "1991-11-24",
        departmentId: "0bdcccf4-cc88-44e6-b066-4856b02157b3", // Pharmacy department
        primaryDepartmentId: "0bdcccf4-cc88-44e6-b066-4856b02157b3",
        employeeId: "ZH-AM-2025",
        licenseNumber: "KPH-" + Math.floor(10000 + Math.random() * 90000),
        specialization: ["Pharmacy"],
        qualification: ["BPharm"],
        town: "Nairobi",
        areaOfResidence: "Nairobi",
        idType: "NATIONAL_ID",
        idNumber: "29112793",
        nationality: "Kenyan",
        designation: "Pharmacist"
      }
    },
    
    // 20. Esther Ogembo - Update Doctor
    {
      action: "update",
      email: "esther@zuri.health",
      userData: {
        surname: "Ogembo",
        otherNames: "Esther",
        telephone1: formatPhoneNumber("0701432231"),
        gender: "FEMALE",
        dateOfBirth: "1992-02-22",
        departmentId: "bd09f836-4145-44cf-b8ca-79029f639198", // Medical department
        primaryDepartmentId: "bd09f836-4145-44cf-b8ca-79029f639198",
        employeeId: "ZH-EO-2025",
        licenseNumber: "KMD-" + Math.floor(10000 + Math.random() * 90000),
        specialization: ["General Medicine"],
        qualification: ["MD"],
        town: "Nairobi",
        areaOfResidence: "Nairobi",
        idType: "NATIONAL_ID",
        idNumber: "28737344",
        nationality: "Kenyan",
        designation: "General Medicine Doctor"
      }
    },
    
    // ===== NEW USERS (5) =====
    
    // 1. Flavia Bagatya - Create New Doctor (Ugandan)
    {
      action: "create",
      userData: {
        surname: "Bagatya",
        otherNames: "Flavia",
        email: "flavia@zuri.health",
        password: "Password123",
        role: "DOCTOR",
        departmentId: "bd09f836-4145-44cf-b8ca-79029f639198", // Medical department
        primaryDepartmentId: "bd09f836-4145-44cf-b8ca-79029f639198",
        employeeId: "ZH-FB-2025",
        licenseNumber: "UMD-" + Math.floor(10000 + Math.random() * 90000),
        specialization: ["General Medicine"],
        qualification: ["MD"],
        telephone1: "+256773658244", // Already has country code
        gender: "FEMALE",
        dateOfBirth: generateRandomDOB(),
        town: "Kampala",
        areaOfResidence: "Kampala",
        idType: "NATIONAL_ID",
        idNumber: generateRandomID("Uganda"),
        nationality: "Ugandan",
        designation: "Medical Doctor"
      }
    },
    
    // 2. Dennis Ombese Mandere - Create New Mental Health Specialist
    {
      action: "create",
      userData: {
        surname: "Mandere",
        otherNames: "Dennis Ombese",
        email: "Dennisombese88@gmail.com",
        password: "Password123",
        role: "DOCTOR",
        departmentId: "bd09f836-4145-44cf-b8ca-79029f639198", // General Medicine
        primaryDepartmentId: "bd09f836-4145-44cf-b8ca-79029f639198",
        employeeId: "ZH-DOM-2025",
        licenseNumber: "KMD-" + Math.floor(10000 + Math.random() * 90000),
        specialization: ["Mental Health & Wellness"],
        qualification: ["MD", "MSc. Mental Health"],
        telephone1: formatPhoneNumber("0719440456"),
        gender: "MALE",
        dateOfBirth: generateRandomDOB(),
        town: "Nairobi",
        areaOfResidence: "Nairobi",
        idType: "NATIONAL_ID",
        idNumber: generateRandomID(),
        nationality: "Kenyan",
        designation: "Mental Health Specialist"
      }
    },
    
    // 3. Dr Ijeoma Utah - Create New Nigerian Doctor
    {
      action: "create",
      userData: {
        surname: "Utah",
        otherNames: "Ijeoma",
        email: "Ijeoma@zuri.health",
        password: "Password123",
        role: "DOCTOR",
        departmentId: "bd09f836-4145-44cf-b8ca-79029f639198", // General Medicine
        primaryDepartmentId: "bd09f836-4145-44cf-b8ca-79029f639198",
        employeeId: "ZH-IU-2025",
        licenseNumber: "NMD-" + Math.floor(10000 + Math.random() * 90000),
        specialization: ["General Medicine"],
        qualification: ["MD"],
        telephone1: "+2348033746422", // Already has country code
        gender: "FEMALE",
        dateOfBirth: generateRandomDOB(),
        town: "Lagos",
        areaOfResidence: "Lagos",
        idType: "NATIONAL_ID",
        idNumber: generateRandomID("Nigeria"),
        nationality: "Nigerian",
        designation: "Medical Doctor"
      }
    },
    
    // 4. Miriam Wambui Maina - Create New Lab Technologist
    {
      action: "create",
      userData: {
        surname: "Maina",
        otherNames: "Miriam Wambui",
        email: "miriamwambui094@gmail.com",
        password: "Password123",
        role: "LAB_TECHNICIAN", // Keep role as LAB_TECHNICIAN for database compatibility
        departmentId: "1e4f468c-4e26-4350-8bce-cb62069ebd55", // Laboratory
        primaryDepartmentId: "1e4f468c-4e26-4350-8bce-cb62069ebd55",
        employeeId: "ZH-MWM-2025",
        licenseNumber: "KLT-" + Math.floor(10000 + Math.random() * 90000),
        specialization: ["Medical Laboratory"],
        qualification: ["BSc. Medical Laboratory Sciences"],
        telephone1: formatPhoneNumber(("0" + (700000000 + Math.floor(Math.random() * 99999999)).toString()).substring(0, 10)),
        gender: "FEMALE",
        dateOfBirth: generateRandomDOB(),
        town: "Nairobi",
        areaOfResidence: "Nairobi",
        idType: "NATIONAL_ID",
        idNumber: generateRandomID(),
        nationality: "Kenyan",
        designation: "Laboratory Technologist"
      }
    },
    
    // 5. Dana Kemuma Nyangaresi - Create New Nurse
    {
      action: "create",
      userData: {
        surname: "Nyangaresi",
        otherNames: "Dana Kemuma",
        email: "danakemuma@gmail.com",
        password: "Password123",
        role: "NURSE",
        departmentId: "725380c2-0120-4e90-a9e6-72120c035cf0", // Triage department
        primaryDepartmentId: "725380c2-0120-4e90-a9e6-72120c035cf0",
        employeeId: "ZH-DKN-2025",
        telephone1: formatPhoneNumber("0745277329"),
        gender: "FEMALE",
        dateOfBirth: generateRandomDOB(),
        town: "Nairobi",
        areaOfResidence: "Nairobi",
        idType: "NATIONAL_ID",
        idNumber: generateRandomID(),
        nationality: "Kenyan",
        designation: "Nurse"
      }
    }
  ];
  
  console.log(`🚀 Starting processing of ${usersToProcess.length} users...`);
  
  const resetPasswordsList = [];
  
  // Process users sequentially
  for (const [index, userInfo] of usersToProcess.entries()) {
    try {
      console.log(`\nProcessing ${index + 1}/${usersToProcess.length}: ${userInfo.action === "create" ? userInfo.userData.email : userInfo.email}`);
      
      if (userInfo.action === "update") {
        // Find user by email first
        const user = await findUserByEmail(userInfo.email);
        
        if (user) {
          console.log(`Found user with ID: ${user.id}`);
          
          // Update user
          const response = await updateUser(user.id, userInfo.userData);
          logResponse(`${user.otherNames} ${user.surname}`, "update", response);
          
          // Add to password reset list
          resetPasswordsList.push(userInfo.userData.email || userInfo.email);
        } else {
          console.log(`⚠️ User not found: ${userInfo.email}`);
        }
      } else if (userInfo.action === "create") {
        // Create new user
        try {
          const response = await createUser(userInfo.userData);
          logResponse(`${userInfo.userData.otherNames} ${userInfo.userData.surname}`, "create", response);
          
          // Add to password reset list
          resetPasswordsList.push(userInfo.userData.email);
        } catch (error) {
          // Check if this is a duplicate error
          if (error.response && error.response.data && error.response.data.error && 
              error.response.data.error.includes("email already exists")) {
            console.log(`⚠️ Email already exists: ${userInfo.userData.email}. Will send password reset anyway.`);
            resetPasswordsList.push(userInfo.userData.email);
          } else {
            throw error;
          }
        }
      }
      
      // Add delay between operations
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Error processing user: ${error.message}`);
      if (error.response) {
        console.error(`Response status: ${error.response.status}`);
        console.error('Response data:', error.response.data);
      }
    }
  }
  
  // Send password reset links to everyone
  console.log("\n🔑 Sending password reset links to all processed users...");
  
  for (const [index, email] of resetPasswordsList.entries()) {
    try {
      console.log(`Sending password reset ${index + 1}/${resetPasswordsList.length}: ${email}`);
      
      const response = await sendPasswordResetLink(email);
      logResponse(email, "password reset", response);
      
      // Add small delay between reset requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      logResponse(email, "password reset", null, error);
    }
  }
  
  // Close log file
  fs.appendFileSync('user-updates.log', '\n]');
  
  // Print summary
  console.log('\n✅ User updates completed!');
  console.log(`🔄 Updated ${usersToProcess.filter(u => u.action === "update").length} existing users`);
  console.log(`➕ Added ${usersToProcess.filter(u => u.action === "create").length} new users`);
  console.log(`📧 Sent ${resetPasswordsList.length} password reset emails`);
  console.log('📋 Check user-updates.log for detailed results');
};

// Execute the script
processUsers().catch(err => {
  console.error('Script execution failed:', err);
  process.exit(1);
});