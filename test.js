// add-users.js
const axios = require('axios');
const fs = require('fs');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:10000';
const BEARER_TOKEN = process.env.BEARER_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjdlZWNhNDQ4LWNhOTItNGYxOS1hZTc0LWY1MGZlMTVkY2QzYyIsInJvbGUiOiJBRE1JTiIsInBlcm1pc3Npb25zIjpbImFsbCJdLCJpYXQiOjE3NDczMTg3MTQsImV4cCI6MTc0NzQwNTExNH0.JEHC16bQ178H0fzL10wkoTnaHRP_fg5jVrX6RUZhR_I';

// Helper function to log responses
const logResponse = (name, response, error = null) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    user: name,
    success: !error,
    data: error ? null : response.data,
    error: error ? (error.response ? error.response.data : error.message) : null,
    status: error ? (error.response ? error.response.status : 'ERROR') : response.status
  };
  
  console.log(`${logEntry.success ? '✅' : '❌'} ${name}: ${logEntry.success ? 'Success' : 'Failed'}`);
  
  // Append to log file
  fs.appendFileSync('user-registration.log', JSON.stringify(logEntry, null, 2) + ',\n');
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

// Check if user exists and delete if necessary
const checkAndDeleteUser = async (email) => {
  try {
    console.log(`🔍 Checking if user exists: ${email}`);
    
    const headers = {
      'Authorization': `Bearer ${BEARER_TOKEN}`
    };
    
    // First, try to find the user by email
    const findResponse = await axios.get(
      `${API_BASE_URL}/api/v1/users/search?email=${encodeURIComponent(email)}`,
      { headers }
    );
    
    if (findResponse.data && findResponse.data.data && findResponse.data.data.length > 0) {
      const userId = findResponse.data.data[0].id;
      console.log(`🔍 Found existing user with ID: ${userId}`);
      
      // Delete the user
      console.log(`🗑️ Deleting user with ID: ${userId}`);
      const deleteResponse = await axios.delete(
        `${API_BASE_URL}/api/v1/users/${userId}`,
        { headers }
      );
      
      console.log(`✅ User deleted successfully: ${email}`);
      return true;
    }
    
    console.log(`✅ No existing user found with email: ${email}`);
    return false;
  } catch (error) {
    console.error(`❌ Error checking/deleting user: ${error.message}`);
    return false;
  }
};

// Create users one by one
const createUsers = async () => {
  // Initialize log file
  fs.writeFileSync('user-registration.log', '[\n');
  
  // Common headers
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${BEARER_TOKEN}`
  };
  
  const users = [
    // 1. Cynthia Mwihaki - Triage Nurse
    {
      surname: "Mwihaki",
      otherNames: "Cynthia",
      email: "cynthia@zuri.health",
      password: "Password123",
      role: "NURSE",
      departmentId: "725380c2-0120-4e90-a9e6-72120c035cf0", // Triage department
      primaryDepartmentId: "725380c2-0120-4e90-a9e6-72120c035cf0",
      employeeId: "ZH-CM-2025",
      telephone1: formatPhoneNumber("0722268494"),
      gender: "FEMALE",
      dateOfBirth: "1994-06-23",
      town: "Nairobi",
      areaOfResidence: "Nairobi",
      idType: "NATIONAL_ID",
      idNumber: "30711427",
      nationality: "Kenyan",
      designation: "Triage Nurse"
    },
    
    // 2. Santa Odoyo - Triage Nurse
    {
      surname: "Odoyo",
      otherNames: "Santa",
      email: "santaseps@gmail.com",
      password: "Password123",
      role: "NURSE",
      departmentId: "725380c2-0120-4e90-a9e6-72120c035cf0", // Triage department
      primaryDepartmentId: "725380c2-0120-4e90-a9e6-72120c035cf0",
      employeeId: "ZH-SO-2025",
      telephone1: formatPhoneNumber("0796671566"),
      gender: "FEMALE",
      dateOfBirth: "1998-03-09",
      town: "Nairobi",
      areaOfResidence: "Nairobi",
      idType: "NATIONAL_ID",
      idNumber: "34476319",
      nationality: "Kenyan",
      designation: "Triage Nurse"
    },
    
    // 3. Malcolm Mwai - Triage Nurse
    {
      surname: "Mwai",
      otherNames: "Malcolm",
      email: "malcolm@zuri.health",
      password: "Password123",
      role: "NURSE",
      departmentId: "725380c2-0120-4e90-a9e6-72120c035cf0", // Triage department
      primaryDepartmentId: "725380c2-0120-4e90-a9e6-72120c035cf0",
      employeeId: "ZH-MM-2025",
      telephone1: formatPhoneNumber("0705741285"),
      gender: "MALE",
      dateOfBirth: "1997-07-02",
      town: "Nairobi",
      areaOfResidence: "Nairobi",
      idType: "NATIONAL_ID",
      idNumber: "33565702",
      nationality: "Kenyan",
      designation: "Triage Nurse - Nutrition"
    },
    
    // 4. Lillian Masika - Doctor
    {
      surname: "Masika",
      otherNames: "Lillian",
      email: "Lillian.masika@zuri.health",
      password: "Password123",
      role: "DOCTOR",
      departmentId: "bd09f836-4145-44cf-b8ca-79029f639198", // General Medicine
      primaryDepartmentId: "bd09f836-4145-44cf-b8ca-79029f639198",
      employeeId: "ZH-LM-2025",
      licenseNumber: "KMD-12345",
      specialization: ["General Medicine"],
      qualification: ["MD"],
      telephone1: formatPhoneNumber("0701483535"),
      gender: "FEMALE",
      dateOfBirth: "1997-02-15",
      town: "Nairobi",
      areaOfResidence: "Nairobi",
      idType: "NATIONAL_ID",
      idNumber: "30602928",
      nationality: "Kenyan",
      designation: "General Medicine Doctor"
    },
    
    // 5. Antony Ndegwa - Doctor
    {
      surname: "Ndegwa",
      otherNames: "Antony",
      email: "antony@zuri.health",
      password: "Password123",
      role: "DOCTOR",
      departmentId: "bd09f836-4145-44cf-b8ca-79029f639198", // General Medicine
      primaryDepartmentId: "bd09f836-4145-44cf-b8ca-79029f639198",
      employeeId: "ZH-AN-2025",
      licenseNumber: "KMD-23456",
      specialization: ["General Medicine"],
      qualification: ["MD"],
      telephone1: formatPhoneNumber("0795191768"),
      gender: "MALE",
      dateOfBirth: "1995-06-01",
      town: "Nairobi",
      areaOfResidence: "Nairobi",
      idType: "NATIONAL_ID",
      idNumber: "32401469",
      nationality: "Kenyan",
      designation: "General Medicine Doctor"
    },
    
    // 6. Doreen Bosibori - Lab Technologist
    {
      surname: "Bosibori",
      otherNames: "Doreen",
      email: "lab@zuri.health",
      password: "Password123",
      role: "LAB_TECHNICIAN", // Keep role as LAB_TECHNICIAN for database compatibility
      departmentId: "1e4f468c-4e26-4350-8bce-cb62069ebd55", // Laboratory
      primaryDepartmentId: "1e4f468c-4e26-4350-8bce-cb62069ebd55",
      employeeId: "ZH-DB-2025",
      licenseNumber: "KLT-12345",
      specialization: ["Medical Laboratory"],
      qualification: ["BSc. Medical Laboratory Sciences"],
      telephone1: formatPhoneNumber("0797623652"),
      gender: "FEMALE",
      dateOfBirth: "1996-07-26",
      town: "Nairobi",
      areaOfResidence: "Nairobi",
      idType: "NATIONAL_ID",
      idNumber: "33070539",
      nationality: "Kenyan",
      designation: "Laboratory Technologist"
    },
    
    // 7. Hudson Vulimu - Lab Technologist
    {
      surname: "Vulimu",
      otherNames: "Hudson",
      email: "kamandehudson@gmail.com",
      password: "Password123",
      role: "LAB_TECHNICIAN", // Keep role as LAB_TECHNICIAN for database compatibility
      departmentId: "1e4f468c-4e26-4350-8bce-cb62069ebd55", // Laboratory
      primaryDepartmentId: "1e4f468c-4e26-4350-8bce-cb62069ebd55",
      employeeId: "ZH-HV-2025",
      licenseNumber: "KLT-23456",
      specialization: ["Medical Laboratory"],
      qualification: ["BSc. Medical Laboratory Sciences"],
      telephone1: formatPhoneNumber("0703971845"),
      gender: "MALE",
      dateOfBirth: "1995-06-26",
      town: "Nairobi",
      areaOfResidence: "Nairobi",
      idType: "NATIONAL_ID",
      idNumber: "31871555",
      nationality: "Kenyan",
      designation: "Laboratory Technologist"
    },
    
    // 8. Winner Kathomi - Receptionist
    {
      surname: "Kathomi",
      otherNames: "Winner",
      email: "kathomiwinner8@gmail.com",
      password: "Password123",
      role: "RECEPTIONIST",
      departmentId: "328c72ad-7689-4cdb-9995-77c2d54f3775", // Reception
      primaryDepartmentId: "328c72ad-7689-4cdb-9995-77c2d54f3775",
      employeeId: "ZH-WK-2025",
      telephone1: formatPhoneNumber("0792823276"),
      gender: "FEMALE",
      dateOfBirth: "1998-12-09",
      town: "Nairobi",
      areaOfResidence: "Nairobi",
      idType: "NATIONAL_ID",
      idNumber: "35822622",
      nationality: "Kenyan",
      designation: "Receptionist"
    },
    
    // 9. Joy John - Triage Nurse (Nigerian)
    {
      surname: "John",
      otherNames: "Joy",
      email: "joy@zuri.health",
      password: "Password123",
      role: "NURSE",
      departmentId: "725380c2-0120-4e90-a9e6-72120c035cf0", // Triage department
      primaryDepartmentId: "725380c2-0120-4e90-a9e6-72120c035cf0",
      employeeId: "ZH-JJ-2025",
      telephone1: formatPhoneNumber("0798520758"),
      gender: "FEMALE",
      dateOfBirth: "2000-02-02",
      town: "Nairobi",
      areaOfResidence: "Nairobi",
      idType: "NATIONAL_ID",
      idNumber: "40123456",
      nationality: "Nigerian",
      designation: "Triage Nurse"
    },
    
    // 10. Brian Kimondo - Doctor
    {
      surname: "Kimondo",
      otherNames: "Brian",
      email: "bkimondo60@gmail.com",
      password: "Password123",
      role: "DOCTOR",
      departmentId: "bd09f836-4145-44cf-b8ca-79029f639198", // General Medicine
      primaryDepartmentId: "bd09f836-4145-44cf-b8ca-79029f639198",
      employeeId: "ZH-BK-2025",
      licenseNumber: "KMD-34567",
      specialization: ["General Medicine"],
      qualification: ["MD"],
      telephone1: formatPhoneNumber("0703316232"),
      gender: "MALE",
      dateOfBirth: "2001-09-12",
      town: "Nairobi",
      areaOfResidence: "Nairobi",
      idType: "NATIONAL_ID",
      idNumber: "38620117",
      nationality: "Kenyan",
      designation: "General Medicine Doctor"
    },
    
    // 11. Rose Mutua - Customer Care
    {
      surname: "Mutua",
      otherNames: "Rose",
      email: "customercareke1@zuri.health", // Added separate email to avoid conflict
      password: "Password123",
      role: "RECEPTIONIST",
      departmentId: "328c72ad-7689-4cdb-9995-77c2d54f3775", // Reception
      primaryDepartmentId: "328c72ad-7689-4cdb-9995-77c2d54f3775",
      employeeId: "ZH-RM-2025",
      telephone1: formatPhoneNumber("0799713631"),
      gender: "FEMALE",
      dateOfBirth: generateRandomDOB(),
      town: "Nairobi",
      areaOfResidence: "Nairobi",
      idType: "NATIONAL_ID",
      idNumber: generateRandomID(),
      nationality: "Kenyan",
      designation: "Customer Care Representative"
    },
    
    // 12. Daphine Kamau - Customer Care
    {
      surname: "Kamau",
      otherNames: "Daphine",
      email: "daphinekamau2018@gmail.com", // Updated with correct email
      password: "Password123",
      role: "RECEPTIONIST",
      departmentId: "328c72ad-7689-4cdb-9995-77c2d54f3775", // Reception
      primaryDepartmentId: "328c72ad-7689-4cdb-9995-77c2d54f3775",
      employeeId: "ZH-DK-2025",
      telephone1: formatPhoneNumber("0790441059"),
      gender: "FEMALE",
      dateOfBirth: "1999-07-21", // Added actual DOB from data
      town: "Nairobi",
      areaOfResidence: "Nairobi",
      idType: "NATIONAL_ID",
      idNumber: "37013633", // Added actual ID from data
      nationality: "Kenyan",
      designation: "Customer Care Representative"
    },
    
    // 13. Flavia Bagatya - Doctor (Ugandan)
    {
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
    },
    
    // 14. Dennis Ombese Mandere - Mental Health
    {
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
    },
    
    // 15. Georgina Nyaka - Doctor
    {
      surname: "Nyaka",
      otherNames: "Georgina",
      email: "georgina@zuri.health",
      password: "Password123",
      role: "DOCTOR",
      departmentId: "bd09f836-4145-44cf-b8ca-79029f639198", // Medical department
      primaryDepartmentId: "bd09f836-4145-44cf-b8ca-79029f639198",
      employeeId: "ZH-GN-2025",
      licenseNumber: "KMD-" + Math.floor(10000 + Math.random() * 90000),
      specialization: ["General Medicine"],
      qualification: ["MD"],
      telephone1: formatPhoneNumber("0703229202"),
      gender: "FEMALE",
      dateOfBirth: generateRandomDOB(),
      town: "Nairobi",
      areaOfResidence: "Nairobi",
      idType: "NATIONAL_ID",
      idNumber: generateRandomID(),
      nationality: "Kenyan",
      designation: "Medical Doctor"
    },
    
    // 16. Barbara Tarno - Doctor
    {
      surname: "Tarno",
      otherNames: "Barbara",
      email: "barbara@zuri.health",
      password: "Password123",
      role: "DOCTOR",
      departmentId: "bd09f836-4145-44cf-b8ca-79029f639198", // Medical department
      primaryDepartmentId: "bd09f836-4145-44cf-b8ca-79029f639198",
      employeeId: "ZH-BT-2025",
      licenseNumber: "KMD-" + Math.floor(10000 + Math.random() * 90000),
      specialization: ["General Medicine"],
      qualification: ["MD"],
      telephone1: formatPhoneNumber("0717700049"),
      telephone2: formatPhoneNumber("0731700049"), // WhatsApp number
      gender: "FEMALE",
      dateOfBirth: generateRandomDOB(),
      town: "Nairobi",
      areaOfResidence: "Nairobi",
      idType: "NATIONAL_ID",
      idNumber: generateRandomID(),
      nationality: "Kenyan",
      designation: "Medical Doctor"
    },
    
    // 17. Miriam Wambui Maina - Lab Technologist
    {
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
    },
    
    // 18. Dana Kemuma Nyangaresi - Nurse
    {
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
    },
    
    // 19. Esther Ogembo - Doctor
    {
      surname: "Ogembo",
      otherNames: "Esther",
      email: "esther@zuri.health",
      password: "Password123",
      role: "DOCTOR",
      departmentId: "bd09f836-4145-44cf-b8ca-79029f639198", // Medical department
      primaryDepartmentId: "bd09f836-4145-44cf-b8ca-79029f639198",
      employeeId: "ZH-EO-2025",
      licenseNumber: "KMD-" + Math.floor(10000 + Math.random() * 90000),
      specialization: ["General Medicine"],
      qualification: ["MD"],
      telephone1: formatPhoneNumber("0701432231"),
      gender: "FEMALE",
      dateOfBirth: "1992-02-22", // Using actual date from data
      town: "Nairobi",
      areaOfResidence: "Nairobi",
      idType: "NATIONAL_ID",
      idNumber: "28737344", // Using actual ID from data
      nationality: "Kenyan",
      designation: "General Medicine Doctor"
    },
    
    // 20. David Wambiri - Nurse
    {
      surname: "Wambiri",
      otherNames: "David",
      email: "isaacw@identifyafrica.io",
      password: "Password123",
      role: "NURSE",
      departmentId: "725380c2-0120-4e90-a9e6-72120c035cf0", // Triage department
      primaryDepartmentId: "725380c2-0120-4e90-a9e6-72120c035cf0",
      employeeId: "ZH-DW-2025",
      telephone1: formatPhoneNumber("0765489992"),
      gender: "MALE",
      dateOfBirth: "1998-08-06", // Using approximate date from data
      town: "Nairobi",
      areaOfResidence: "Nairobi",
      idType: "NATIONAL_ID",
      idNumber: generateRandomID(),
      nationality: "Kenyan",
      designation: "Triage Nurse",
      specialization: ["Triage Nursing", "Emergency Care"]
    },
    
    // 21. Erick Onyango Ngolo - Doctor
    {
      surname: "Ngolo",
      otherNames: "Erick Onyango",
      email: "ngolo@zuri.health",
      password: "Password123",
      role: "DOCTOR",
      departmentId: "bd09f836-4145-44cf-b8ca-79029f639198", // General Medicine
      primaryDepartmentId: "bd09f836-4145-44cf-b8ca-79029f639198",
      employeeId: "ZH-EON-2025",
      licenseNumber: "KMD-" + Math.floor(10000 + Math.random() * 90000),
      specialization: ["General Medicine"],
      qualification: ["MD"],
      telephone1: formatPhoneNumber("0708159270"),
      gender: "MALE",
      dateOfBirth: "1996-05-28", // Using date from data
      town: "Nairobi",
      areaOfResidence: "Nairobi",
      idType: "NATIONAL_ID",
      idNumber: "33233245", // Using ID from data
      nationality: "Kenyan",
      designation: "General Medicine Doctor"
    },
    
    // 22. Dr Ijeoma Utah - Nigerian Doctor
    {
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
    },
    
    // 23. Irene Muthoni - Doctor
    {
      surname: "Muthoni",
      otherNames: "Irene",
      email: "irene@zuri.health",
      password: "Password123",
      role: "DOCTOR",
      departmentId: "bd09f836-4145-44cf-b8ca-79029f639198", // General Medicine
      primaryDepartmentId: "bd09f836-4145-44cf-b8ca-79029f639198",
      employeeId: "ZH-IM-2025",
      licenseNumber: "KMD-" + Math.floor(10000 + Math.random() * 90000),
      specialization: ["General Medicine"],
      qualification: ["MD"],
      telephone1: formatPhoneNumber("0723877226"),
      gender: "FEMALE",
      dateOfBirth: generateRandomDOB(),
      town: "Nairobi",
      areaOfResidence: "Nairobi",
      idType: "NATIONAL_ID",
      idNumber: generateRandomID(),
      nationality: "Kenyan",
      designation: "General Medicine Doctor"
    },
    
    // 24. Sally Masika - Pharmacist
    {
      surname: "Masika",
      otherNames: "Sally",
      email: "sally.masika@zuri.health",
      password: "Password123",
      role: "PHARMACIST",
      departmentId: "0bdcccf4-cc88-44e6-b066-4856b02157b3", // Pharmacy department
      primaryDepartmentId: "0bdcccf4-cc88-44e6-b066-4856b02157b3",
      employeeId: "ZH-SM-2025",
      licenseNumber: "KPH-" + Math.floor(10000 + Math.random() * 90000),
      specialization: ["Pharmacy"],
      qualification: ["BPharm"],
      telephone1: formatPhoneNumber("0723239335"),
      gender: "FEMALE",
      dateOfBirth: "1991-05-16", // Using actual date from data
      town: "Nairobi",
      areaOfResidence: "Nairobi",
      idType: "NATIONAL_ID",
      idNumber: "28194583", // Using actual ID from data
      nationality: "Kenyan",
      designation: "Pharmacist"
    },
    
    // 25. Abigael Mwangi - Pharmacist
    {
      surname: "Mwangi",
      otherNames: "Abigael",
      email: "abigael@zuri.health",
      password: "Password123",
      role: "PHARMACIST",
      departmentId: "0bdcccf4-cc88-44e6-b066-4856b02157b3", // Pharmacy department
      primaryDepartmentId: "0bdcccf4-cc88-44e6-b066-4856b02157b3",
      employeeId: "ZH-AM-2025",
      licenseNumber: "KPH-" + Math.floor(10000 + Math.random() * 90000),
      specialization: ["Pharmacy"],
      qualification: ["BPharm"],
      telephone1: formatPhoneNumber("0723833689"),
      gender: "FEMALE",
      dateOfBirth: "1991-11-24", // Using actual date from data
      town: "Nairobi",
      areaOfResidence: "Nairobi",
      idType: "NATIONAL_ID",
      idNumber: "29112793", // Using actual ID from data
      nationality: "Kenyan",
      designation: "Pharmacist"
    }
  ];
  
  console.log(`🚀 Starting registration of ${users.length} users...`);
  console.log(`📡 API URL: ${API_BASE_URL}/api/v1/auth/register`);
  console.log('\n');
  
  // Process users sequentially with a delay to prevent server overload
  for (const [index, user] of users.entries()) {
    try {
      // First check if user exists and delete if necessary
      await checkAndDeleteUser(user.email);
      
      console.log(`Processing ${index + 1}/${users.length}: ${user.otherNames} ${user.surname} (${user.role})`);
      
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/auth/register`,
        user,
        { headers }
      );
      
      logResponse(`${user.otherNames} ${user.surname}`, response);
      
      // Add delay between requests to prevent rate limiting
      if (index < users.length - 1) {
        console.log(`Waiting 2 seconds before next request...\n`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      logResponse(`${user.otherNames} ${user.surname}`, null, error);
      console.error(`Error details: ${error.message}`);
      if (error.response) {
        console.error(`Response status: ${error.response.status}`);
        console.error('Response data:', error.response.data);
      }
      console.log('\n');
    }
  }
  
  // Close log file
  fs.appendFileSync('user-registration.log', '\n]');
  console.log('\n✅ User registration process completed!');
  console.log('📋 Check user-registration.log for detailed results.');
};

// Execute the script
createUsers().catch(err => {
  console.error('Script execution failed:', err);
  process.exit(1);
});