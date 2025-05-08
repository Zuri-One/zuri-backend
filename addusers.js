// add-users.js
const axios = require('axios');
const fs = require('fs');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:10000';
const BEARER_TOKEN = process.env.BEARER_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjdlZWNhNDQ4LWNhOTItNGYxOS1hZTc0LWY1MGZlMTVkY2QzYyIsInJvbGUiOiJBRE1JTiIsInBlcm1pc3Npb25zIjpbImFsbCJdLCJpYXQiOjE3NDY2MjUzOTksImV4cCI6MTc0NjcxMTc5OX0.GIgy-6O1gB6uiGyPwXR9RcaUniYyZJ_54m7lc3nuBq8';

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
      telephone1: "0722268494",
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
      telephone1: "0796671566",
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
      telephone1: "0705741285",
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
      telephone1: "0701483535",
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
      telephone1: "0795191768",
      gender: "MALE",
      dateOfBirth: "1995-06-01",
      town: "Nairobi",
      areaOfResidence: "Nairobi",
      idType: "NATIONAL_ID",
      idNumber: "32401469",
      nationality: "Kenyan",
      designation: "General Medicine Doctor"
    },
    
    // 6. Doreen Bosibori - Lab Technician
    {
      surname: "Bosibori",
      otherNames: "Doreen",
      email: "lab@zuri.health",
      password: "Password123",
      role: "LAB_TECHNICIAN",
      departmentId: "1e4f468c-4e26-4350-8bce-cb62069ebd55", // Laboratory
      primaryDepartmentId: "1e4f468c-4e26-4350-8bce-cb62069ebd55",
      employeeId: "ZH-DB-2025",
      licenseNumber: "KLT-12345",
      specialization: ["Medical Laboratory"],
      qualification: ["BSc. Medical Laboratory Sciences"],
      telephone1: "0797623652",
      gender: "FEMALE",
      dateOfBirth: "1996-07-26",
      town: "Nairobi",
      areaOfResidence: "Nairobi",
      idType: "NATIONAL_ID",
      idNumber: "33070539",
      nationality: "Kenyan",
      designation: "Laboratory Technician"
    },
    
    // 7. Hudson Vulimu - Lab Technician
    {
      surname: "Vulimu",
      otherNames: "Hudson",
      email: "kamandehudson@gmail.com",
      password: "Password123",
      role: "LAB_TECHNICIAN",
      departmentId: "1e4f468c-4e26-4350-8bce-cb62069ebd55", // Laboratory
      primaryDepartmentId: "1e4f468c-4e26-4350-8bce-cb62069ebd55",
      employeeId: "ZH-HV-2025",
      licenseNumber: "KLT-23456",
      specialization: ["Medical Laboratory"],
      qualification: ["BSc. Medical Laboratory Sciences"],
      telephone1: "0703971845",
      gender: "MALE",
      dateOfBirth: "1995-06-26",
      town: "Nairobi",
      areaOfResidence: "Nairobi",
      idType: "NATIONAL_ID",
      idNumber: "31871555",
      nationality: "Kenyan",
      designation: "Laboratory Technician"
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
      telephone1: "0792823276",
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
      telephone1: "0798520758",
      gender: "FEMALE",
      dateOfBirth: "2000-02-02",
      town: "Nairobi",
      areaOfResidence: "Nairobi",
      idType: "NATIONAL_ID",
      idNumber: "40123456",
      nationality: "Nigerian",
      designation: "Triage Nurse"
    },
    
    // 10. Brian Kimono - Doctor
    {
      surname: "Kimono",
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
      telephone1: "0703316232",
      gender: "MALE",
      dateOfBirth: "2001-09-12",
      town: "Nairobi",
      areaOfResidence: "Nairobi",
      idType: "NATIONAL_ID",
      idNumber: "38620117",
      nationality: "Kenyan",
      designation: "General Medicine Doctor"
    }
  ];
  
  console.log(`🚀 Starting registration of ${users.length} users...`);
  console.log(`📡 API URL: ${API_BASE_URL}/api/v1/auth/register`);
  console.log('\n');
  
  // Process users sequentially with a delay to prevent server overload
  for (const [index, user] of users.entries()) {
    try {
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