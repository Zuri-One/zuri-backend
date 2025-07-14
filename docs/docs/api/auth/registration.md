# User Registration

The ZuriHealth HMS API supports different registration endpoints for different user types.

## Patient Registration

Register new patients in the system.

### Endpoint
```http
POST /api/v1/auth/registerPatient
```

### Request Body
```json
{
  "surname": "Doe",
  "otherNames": "John Michael",
  "email": "john.doe@example.com",
  "password": "securepassword123",
  "dateOfBirth": "1990-05-15",
  "gender": "MALE",
  "telephone1": "+254712345678",
  "telephone2": "+254787654321",
  "occupation": "Software Engineer",
  "idType": "NATIONAL_ID",
  "idNumber": "12345678",
  "nationality": "Kenyan",
  "town": "Nairobi",
  "areaOfResidence": "Westlands",
  "postalAddress": "P.O. Box 12345",
  "postalCode": "00100",
  "nextOfKin": {
    "name": "Jane Doe",
    "relationship": "Spouse",
    "phone": "+254798765432"
  },
  "medicalHistory": {
    "existingConditions": ["Hypertension", "Diabetes"],
    "allergies": ["Penicillin", "Peanuts"]
  },
  "insuranceInfo": {
    "scheme": "NHIF",
    "provider": "National Hospital Insurance Fund",
    "membershipNumber": "123456789",
    "principalMember": "John Doe"
  }
}
```

### Required Fields
- `surname`: Patient's last name
- `otherNames`: First and middle names
- `dateOfBirth`: Date of birth (YYYY-MM-DD)
- `gender`: MALE, FEMALE, or OTHER
- `telephone1`: Primary phone number
- `occupation`: Patient's occupation
- `idType`: NATIONAL_ID, PASSPORT, MILITARY_ID, or ALIEN_ID
- `nationality`: Patient's nationality
- `town`: City/town of residence
- `areaOfResidence`: Specific area/neighborhood
- `nextOfKin`: Emergency contact information

### Optional Fields
- `email`: Email address (if provided, password is required)
- `password`: Account password (required if email provided)
- `telephone2`: Secondary phone number
- `postalAddress`: Postal address
- `postalCode`: Postal code
- `idNumber`: ID document number
- `medicalHistory`: Existing conditions and allergies
- `insuranceInfo`: Insurance details

### Response
```json
{
  "success": true,
  "message": "Patient registration successful",
  "data": {
    "patientNumber": "ZH000001",
    "registrationDate": "2024-01-15T10:30:00Z",
    "userId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Example Request
```bash
curl -X POST https://your-server.com/api/v1/auth/registerPatient \
  -H "Content-Type: application/json" \
  -d '{
    "surname": "Doe",
    "otherNames": "John",
    "dateOfBirth": "1990-05-15",
    "gender": "MALE",
    "telephone1": "+254712345678",
    "occupation": "Engineer",
    "idType": "NATIONAL_ID",
    "nationality": "Kenyan",
    "town": "Nairobi",
    "areaOfResidence": "Westlands",
    "nextOfKin": {
      "name": "Jane Doe",
      "relationship": "Spouse",
      "phone": "+254798765432"
    }
  }'
```

## Admin Registration

Register new admin users (requires admin privileges).

### Endpoint
```http
POST /api/v1/auth/register-admin
```

### Authentication Required
```http
Authorization: Bearer <admin_jwt_token>
```

### Request Body
```json
{
  "surname": "Smith",
  "otherNames": "Admin John",
  "email": "admin@hospital.com",
  "password": "securepassword123",
  "employeeId": "EMP001",
  "telephone1": "+254712345678",
  "telephone2": "+254787654321",
  "gender": "MALE",
  "dateOfBirth": "1985-03-20",
  "postalAddress": "P.O. Box 54321",
  "postalCode": "00200",
  "town": "Nairobi",
  "areaOfResidence": "Karen",
  "idType": "NATIONAL_ID",
  "idNumber": "87654321",
  "nationality": "Kenyan",
  "designation": "System Administrator"
}
```

### Required Fields
- `surname`: Admin's last name
- `otherNames`: First and middle names
- `email`: Email address
- `password`: Account password
- `employeeId`: Unique employee identifier
- `telephone1`: Primary phone number
- `gender`: MALE, FEMALE, or OTHER
- `dateOfBirth`: Date of birth
- `town`: City/town
- `areaOfResidence`: Area of residence
- `idType`: ID document type
- `nationality`: Nationality

### Response
```json
{
  "success": true,
  "message": "Admin registration successful",
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "employeeId": "EMP001",
    "email": "admin@hospital.com"
  }
}
```

## General User Registration

General registration endpoint for various user types.

### Endpoint
```http
POST /api/v1/auth/register
```

### Request Body
```json
{
  "name": "Dr. Jane Smith",
  "email": "jane.smith@hospital.com",
  "password": "securepassword123",
  "role": "DOCTOR",
  "gender": "FEMALE",
  "bloodGroup": "O+",
  "contactNumber": "+254712345678"
}
```

### User Roles
- `ADMIN`: System administrator
- `DOCTOR`: Medical doctor
- `NURSE`: Registered nurse
- `PATIENT`: Hospital patient
- `LAB_TECHNICIAN`: Laboratory technician
- `PHARMACIST`: Pharmacy staff
- `RECEPTIONIST`: Front desk staff

### Response
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "registrationId": "REG001"
  }
}
```

## Email Verification

After registration, users may need to verify their email address.

### Verification with Token
```http
GET /api/v1/auth/verify-email/{token}
```

### Verification with Code
```http
POST /api/v1/auth/verify-email-code
```

Request body:
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

### Resend Verification
```http
POST /api/v1/auth/resend-verification
```

Request body:
```json
{
  "email": "user@example.com"
}
```

## Error Handling

### Validation Errors
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email is required",
      "code": "REQUIRED"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters",
      "code": "MIN_LENGTH"
    }
  ]
}
```

### Duplicate Email
```json
{
  "success": false,
  "message": "Email already exists",
  "error": {
    "code": "CONFLICT",
    "details": "An account with this email already exists"
  }
}
```

### Invalid Employee ID
```json
{
  "success": false,
  "message": "Employee ID already exists",
  "error": {
    "code": "CONFLICT",
    "details": "This employee ID is already in use"
  }
}
```

## Best Practices

### 1. Input Validation
Always validate input on the client side before sending:

```javascript
function validatePatientRegistration(data) {
  const errors = [];
  
  if (!data.surname) errors.push('Surname is required');
  if (!data.otherNames) errors.push('Other names are required');
  if (!data.dateOfBirth) errors.push('Date of birth is required');
  if (!data.telephone1) errors.push('Phone number is required');
  
  // Validate phone number format
  const phoneRegex = /^\+254[0-9]{9}$/;
  if (data.telephone1 && !phoneRegex.test(data.telephone1)) {
    errors.push('Invalid phone number format');
  }
  
  return errors;
}
```

### 2. Password Strength
Implement password strength validation:

```javascript
function validatePassword(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  if (password.length < minLength) {
    return 'Password must be at least 8 characters long';
  }
  
  if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
    return 'Password must contain uppercase, lowercase, and numbers';
  }
  
  return null; // Valid password
}
```

### 3. Handle Registration Flow
```javascript
async function registerPatient(patientData) {
  try {
    // Validate input
    const validationErrors = validatePatientRegistration(patientData);
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(', '));
    }
    
    // Register patient
    const response = await fetch('/api/v1/auth/registerPatient', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(patientData)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message);
    }
    
    // Handle successful registration
    console.log('Patient registered:', result.data.patientNumber);
    
    // If email provided, prompt for verification
    if (patientData.email) {
      showEmailVerificationPrompt(patientData.email);
    }
    
    return result;
    
  } catch (error) {
    console.error('Registration failed:', error.message);
    throw error;
  }
}
```

## Next Steps

After successful registration:
1. [Login](./login.md) to obtain JWT token
2. [Verify email](./login.md#email-verification) if email was provided
3. Complete profile setup if required
4. Begin using the system based on assigned role