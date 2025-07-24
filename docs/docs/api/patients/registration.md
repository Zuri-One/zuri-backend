# Patient Registration

Complete guide to registering patients in the ZuriHealth HMS system.

## Patient Registration Endpoint

**Endpoint**: `POST /api/v1/auth/registerPatient`

**Authentication**: Not required for patient registration

## Request Body

### Required Fields
```json
{
  "surname": "Doe",
  "otherNames": "John Michael",
  "dateOfBirth": "1990-05-15",
  "sex": "MALE",
  "telephone1": "+254712345678",
  "idType": "NATIONAL_ID",
  "nationality": "Kenyan",
  "town": "Nairobi",
  "residence": "Westlands",
  "paymentScheme": {
    "type": "NHIF",
    "memberNumber": "123456789"
  }
}
```

### Complete Request Body Example
```json
{
  "surname": "Doe",
  "otherNames": "John Michael",
  "email": "john.doe@example.com",
  "password": "securepassword123",
  "dateOfBirth": "1990-05-15",
  "sex": "MALE",
  "telephone1": "+254712345678",
  "telephone2": "+254787654321",
  "postalAddress": "P.O. Box 12345",
  "postalCode": "00100",
  "occupation": "Software Engineer",
  "idType": "NATIONAL_ID",
  "idNumber": "12345678",
  "nationality": "Kenyan",
  "town": "Nairobi",
  "residence": "Westlands",
  "nextOfKin": {
    "name": "Jane Doe",
    "relationship": "Spouse",
    "contact": "+254798765432"
  },
  "paymentScheme": {
    "type": "NHIF",
    "memberNumber": "123456789",
    "provider": "National Hospital Insurance Fund",
    "principalMember": "John Doe"
  },
  "isEmergency": false,
  "registrationNotes": "Walk-in registration",
  "isCCPEnrolled": false,
  "ccpEnrollmentDate": null
}
```

## Field Specifications

### Personal Information
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `surname` | String | ✅ | Patient's last name |
| `otherNames` | String | ✅ | First and middle names |
| `dateOfBirth` | Date | ✅ | Format: YYYY-MM-DD |
| `sex` | Enum | ✅ | MALE, FEMALE, OTHER |

### Contact Information
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `telephone1` | String | ✅ | Primary phone (+254712345678) |
| `telephone2` | String | ❌ | Secondary phone |
| `email` | String | ❌ | Email address |
| `password` | String | ❌* | Required if email provided |
| `postalAddress` | String | ❌ | Postal address |
| `postalCode` | String | ❌ | Postal code |

### Location Information
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `town` | String | ✅ | City/town of residence |
| `residence` | String | ✅ | Specific area/neighborhood |
| `nationality` | String | ✅ | Patient's nationality |

### Identification
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `idType` | Enum | ✅ | NATIONAL_ID, PASSPORT, MILITARY_ID, ALIEN_ID |
| `idNumber` | String | ❌ | ID document number |

### Emergency Contact
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `nextOfKin` | Object | ❌ | Emergency contact information |
| `nextOfKin.name` | String | ❌* | Required if nextOfKin provided |
| `nextOfKin.relationship` | String | ❌* | Required if nextOfKin provided |
| `nextOfKin.contact` | String | ❌* | Required if nextOfKin provided |

### Payment Information
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `paymentScheme` | Object | ✅ | Payment/insurance information |
| `paymentScheme.type` | String | ✅ | NHIF, Private, Cash, etc. |
| `paymentScheme.memberNumber` | String | ❌ | Insurance member number |
| `paymentScheme.provider` | String | ❌ | Insurance provider name |
| `paymentScheme.principalMember` | String | ❌ | Principal member name |

### Additional Information
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `occupation` | String | ❌ | Patient's occupation |
| `isEmergency` | Boolean | ❌ | Emergency registration flag |
| `registrationNotes` | String | ❌ | Additional notes |
| `isCCPEnrolled` | Boolean | ❌ | Chronic Care Program enrollment |
| `ccpEnrollmentDate` | Date | ❌ | CCP enrollment date |

## Response Examples

### Successful Registration
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "patientNumber": "ZH000001",
    "registrationDate": "2024-01-15T10:30:00Z",
    "patientId": "550e8400-e29b-41d4-a716-446655440000",
    "patientInfo": {
      "name": "John Michael Doe",
      "sex": "MALE",
      "dateOfBirth": "1990-05-15",
      "nationality": "Kenyan",
      "contact": "+254712345678"
    }
  }
}
```

### Registration with Email
```json
{
  "success": true,
  "message": "Registration successful. Please check your email for verification instructions.",
  "data": {
    "patientNumber": "ZH000002",
    "registrationDate": "2024-01-15T10:30:00Z",
    "patientId": "550e8400-e29b-41d4-a716-446655440001"
  }
}
```

## Error Responses

### Missing Required Fields
```json
{
  "success": false,
  "message": "Missing required fields: surname, dateOfBirth, telephone1",
  "error": {
    "code": "MISSING_REQUIRED_FIELDS",
    "fields": ["surname", "dateOfBirth", "telephone1"]
  }
}
```

### Duplicate Phone Number
```json
{
  "success": false,
  "message": "Phone number already registered",
  "error": {
    "code": "DUPLICATE_PHONE"
  }
}
```

### Duplicate Email
```json
{
  "success": false,
  "message": "Email already registered",
  "error": {
    "code": "DUPLICATE_EMAIL"
  }
}
```

### Invalid Next of Kin
```json
{
  "success": false,
  "message": "If next of kin information is provided, name, relationship and contact number are all required",
  "error": {
    "code": "INVALID_NEXT_OF_KIN"
  }
}
```

### Validation Errors
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "sex",
      "message": "Sex must be MALE, FEMALE, or OTHER",
      "code": "INVALID_ENUM"
    },
    {
      "field": "telephone1",
      "message": "Invalid phone number format",
      "code": "INVALID_FORMAT"
    }
  ]
}
```

## Patient Number Generation

Patient numbers are automatically generated with the format: `ZH` + 6-digit sequential number

**Examples**:
- First patient: `ZH000001`
- Second patient: `ZH000002`
- 1000th patient: `ZH001000`

## CCP Enrollment Logic

The Chronic Care Program (CCP) enrollment follows smart logic:

1. **Explicit Date**: If `ccpEnrollmentDate` is provided, use that date
2. **Auto Date**: If `isCCPEnrolled` is true but no date provided, use current date
3. **No Enrollment**: If `isCCPEnrolled` is false or not provided, no enrollment

## Email Verification

If email and password are provided:
1. Verification email sent automatically
2. Patient must verify email to activate account
3. 24-hour verification token expiry

## Integration Examples

### JavaScript Registration
```javascript
class PatientRegistration {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }
  
  async registerPatient(patientData) {
    // Validate required fields
    const requiredFields = [
      'surname', 'otherNames', 'dateOfBirth', 'sex', 
      'telephone1', 'idType', 'nationality', 'town', 
      'residence', 'paymentScheme'
    ];
    
    const missingFields = requiredFields.filter(field => !patientData[field]);
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
    
    // Validate next of kin if provided
    if (patientData.nextOfKin && Object.keys(patientData.nextOfKin).length > 0) {
      const nokRequired = ['name', 'relationship', 'contact'];
      const nokMissing = nokRequired.filter(field => !patientData.nextOfKin[field]);
      if (nokMissing.length > 0) {
        throw new Error(`Next of kin missing: ${nokMissing.join(', ')}`);
      }
    }
    
    const response = await fetch(`${this.baseURL}/auth/registerPatient`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(patientData)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Registration failed');
    }
    
    return result;
  }
  
  validatePhoneNumber(phone) {
    const phoneRegex = /^\+254[0-9]{9}$/;
    return phoneRegex.test(phone);
  }
  
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// Usage
const registration = new PatientRegistration('https://your-server.com/api/v1');

const patientData = {
  surname: "Doe",
  otherNames: "John",
  dateOfBirth: "1990-05-15",
  sex: "MALE",
  telephone1: "+254712345678",
  idType: "NATIONAL_ID",
  nationality: "Kenyan",
  town: "Nairobi",
  residence: "Westlands",
  paymentScheme: {
    type: "NHIF",
    memberNumber: "123456789"
  }
};

try {
  const result = await registration.registerPatient(patientData);
  console.log('Patient registered:', result.data.patientNumber);
} catch (error) {
  console.error('Registration failed:', error.message);
}
```

### Python Registration
```python
import requests
import re
from datetime import datetime

class PatientRegistration:
    def __init__(self, base_url):
        self.base_url = base_url
    
    def register_patient(self, patient_data):
        # Validate required fields
        required_fields = [
            'surname', 'otherNames', 'dateOfBirth', 'sex',
            'telephone1', 'idType', 'nationality', 'town',
            'residence', 'paymentScheme'
        ]
        
        missing_fields = [field for field in required_fields if not patient_data.get(field)]
        if missing_fields:
            raise ValueError(f"Missing required fields: {', '.join(missing_fields)}")
        
        # Validate phone number
        if not self.validate_phone_number(patient_data['telephone1']):
            raise ValueError("Invalid phone number format")
        
        # Validate email if provided
        if patient_data.get('email') and not self.validate_email(patient_data['email']):
            raise ValueError("Invalid email format")
        
        response = requests.post(
            f'{self.base_url}/auth/registerPatient',
            json=patient_data
        )
        
        result = response.json()
        
        if not response.ok:
            raise Exception(result.get('message', 'Registration failed'))
        
        return result
    
    def validate_phone_number(self, phone):
        pattern = r'^\+254[0-9]{9}$'
        return re.match(pattern, phone) is not None
    
    def validate_email(self, email):
        pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
        return re.match(pattern, email) is not None

# Usage
registration = PatientRegistration('https://your-server.com/api/v1')

patient_data = {
    'surname': 'Doe',
    'otherNames': 'John',
    'dateOfBirth': '1990-05-15',
    'sex': 'MALE',
    'telephone1': '+254712345678',
    'idType': 'NATIONAL_ID',
    'nationality': 'Kenyan',
    'town': 'Nairobi',
    'residence': 'Westlands',
    'paymentScheme': {
        'type': 'NHIF',
        'memberNumber': '123456789'
    }
}

try:
    result = registration.register_patient(patient_data)
    print(f"Patient registered: {result['data']['patientNumber']}")
except Exception as e:
    print(f"Registration failed: {e}")
```

## Best Practices

### Data Collection
1. **Minimal Required**: Only collect essential information initially
2. **Progressive Enhancement**: Allow updating profile later
3. **Validation**: Validate all inputs on client and server
4. **Privacy**: Handle personal data according to privacy laws

### User Experience
1. **Clear Forms**: Use clear labels and validation messages
2. **Step-by-Step**: Consider multi-step registration for complex forms
3. **Auto-Complete**: Use browser auto-complete where appropriate
4. **Mobile Friendly**: Ensure forms work well on mobile devices

### Security
1. **Input Sanitization**: Sanitize all inputs
2. **Rate Limiting**: Implement registration rate limiting
3. **Duplicate Prevention**: Check for duplicates before processing
4. **Audit Logging**: Log all registration attempts

### Integration
1. **Error Handling**: Handle all error scenarios gracefully
2. **Retry Logic**: Implement retry for network failures
3. **Validation**: Client-side validation for better UX
4. **Feedback**: Provide clear feedback during registration process