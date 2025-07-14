# Patient Management API

The Patient Management API provides comprehensive functionality for managing patient information, registration, search, and health data access.

## Base Endpoint
```
/api/v1/patient/
```

## Overview

The patient management system supports:
- Patient registration and profile management
- Search and lookup functionality
- CCP (Chronic Care Program) enrollment
- Health metrics tracking
- Appointment history access
- Test results viewing
- Consent management

## Authentication & Authorization

All patient endpoints require authentication via JWT token:

```http
Authorization: Bearer <jwt_token>
```

### Role-Based Access

Different roles have different access levels:

- **ADMIN**: Full access to all patient data
- **DOCTOR**: Access to assigned patients and medical records
- **NURSE**: Access to patients under care
- **RECEPTIONIST**: Registration and basic patient information
- **PATIENT**: Own health information only
- **LAB_TECHNICIAN**: Patient info for lab tests
- **PHARMACIST**: Patient info for medication dispensing

## Core Endpoints

### Patient Registration
- `POST /api/v1/auth/registerPatient` - Register new patient
- `GET /api/v1/patient/registrations` - Get registration records

### Patient Search & Lookup
- `GET /api/v1/patient/all` - List all patients (paginated)
- `GET /api/v1/patient/search` - Search patients by criteria
- `GET /api/v1/patient/details/{identifier}` - Get patient details

### Patient Dashboard
- `GET /api/v1/patient/dashboard` - Patient dashboard data
- `GET /api/v1/patient/appointments/history` - Appointment history
- `GET /api/v1/patient/test-results` - Lab test results
- `GET /api/v1/patient/health-metrics` - Health metrics

### CCP Program
- `PATCH /api/v1/patient/{id}/ccp-enrollment` - Toggle CCP enrollment
- `GET /api/v1/patient/ccp/patients` - Get CCP enrolled patients

### Patient Consent
- `POST /api/v1/patient/{patientId}/request-access` - Request patient access
- `POST /api/v1/patient/consent/response/{token}` - Handle consent response
- `GET /api/v1/patient/{patientId}/access-status` - Check access status

### Emergency Management
- `PATCH /api/v1/patient/{id}/emergency` - Update emergency status

## Common Response Formats

### Patient List Response
```json
{
  "success": true,
  "data": {
    "patients": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "patientNumber": "ZH000001",
        "fullName": "John Doe",
        "age": 34,
        "sex": "MALE",
        "contact": "+254712345678",
        "status": "active"
      }
    ],
    "pagination": {
      "total": 150,
      "pages": 15,
      "page": 1,
      "limit": 10
    }
  }
}
```

### Patient Details Response
```json
{
  "success": true,
  "data": {
    "personalInfo": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "patientNumber": "ZH000001",
      "surname": "Doe",
      "otherNames": "John Michael",
      "fullName": "John Michael Doe",
      "sex": "MALE",
      "dateOfBirth": "1990-05-15",
      "age": 34,
      "nationality": "Kenyan",
      "occupation": "Software Engineer"
    },
    "contactInfo": {
      "telephone1": "+254712345678",
      "telephone2": "+254787654321",
      "email": "john.doe@example.com",
      "residence": "Westlands",
      "town": "Nairobi",
      "postalAddress": "P.O. Box 12345",
      "postalCode": "00100"
    },
    "identification": {
      "idType": "NATIONAL_ID",
      "idNumber": "12345678"
    },
    "emergencyContact": {
      "name": "Jane Doe",
      "relationship": "Spouse",
      "phone": "+254798765432"
    },
    "medicalInfo": {
      "medicalHistory": {
        "existingConditions": ["Hypertension"],
        "allergies": ["Penicillin"]
      },
      "insuranceInfo": {
        "scheme": "NHIF",
        "provider": "National Hospital Insurance Fund",
        "membershipNumber": "123456789"
      }
    },
    "status": {
      "isEmergency": false,
      "isRevisit": true,
      "currentStatus": "active",
      "isActive": true,
      "isCCPEnrolled": false
    },
    "registrationInfo": {
      "registeredOn": "2024-01-15T10:30:00Z",
      "registrationNotes": "Walk-in registration",
      "lastUpdated": "2024-01-20T14:22:00Z",
      "paymentScheme": {
        "type": "NHIF",
        "details": "Active membership"
      }
    }
  }
}
```

## Search Functionality

### Search Parameters
The search endpoint supports multiple search criteria:

```http
GET /api/v1/patient/search?searchTerm=+254712345678
GET /api/v1/patient/search?searchTerm=ZH000001
GET /api/v1/patient/search?searchTerm=john.doe@example.com
```

### Search Response
```json
{
  "success": true,
  "count": 1,
  "patients": [
    {
      "personalInfo": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "patientNumber": "ZH000001",
        "fullName": "John Michael Doe",
        "sex": "MALE",
        "age": 34
      },
      "contactInfo": {
        "telephone1": "+254712345678",
        "email": "john.doe@example.com"
      }
    }
  ]
}
```

## Pagination

Most list endpoints support pagination:

### Query Parameters
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)
- `noPagination`: Set to `true` to return all results

### Example
```http
GET /api/v1/patient/all?page=2&limit=20
```

## Error Handling

### Common Errors

#### Patient Not Found
```json
{
  "success": false,
  "message": "Patient not found",
  "error": {
    "code": "NOT_FOUND",
    "details": "Patient with identifier 'ZH000001' not found"
  }
}
```

#### Insufficient Permissions
```json
{
  "success": false,
  "message": "Insufficient permissions",
  "error": {
    "code": "FORBIDDEN",
    "details": "You don't have permission to access this patient's information"
  }
}
```

#### Validation Error
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "searchTerm",
      "message": "Search term is required",
      "code": "REQUIRED"
    }
  ]
}
```

## Best Practices

### 1. Use Appropriate Search Methods
```javascript
// Search by phone number
const patients = await api.searchPatients('+254712345678');

// Search by patient number
const patient = await api.getPatientDetails('ZH000001');

// Search by email
const patients = await api.searchPatients('john.doe@example.com');
```

### 2. Handle Pagination Efficiently
```javascript
async function getAllPatients() {
  let allPatients = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const response = await api.getPatients(page, 50);
    allPatients = allPatients.concat(response.data.patients);
    
    hasMore = page < response.data.pagination.pages;
    page++;
  }
  
  return allPatients;
}
```

### 3. Implement Patient Consent Workflow
```javascript
async function requestPatientAccess(patientId, purpose) {
  try {
    // Request access
    const request = await api.requestPatientAccess(patientId, {
      purpose: purpose,
      requestedBy: currentUser.id
    });
    
    // Wait for patient response
    console.log('Access request sent. Waiting for patient consent...');
    
    // Check status periodically
    const checkStatus = setInterval(async () => {
      const status = await api.checkAccessStatus(patientId);
      
      if (status.data.status === 'granted') {
        clearInterval(checkStatus);
        console.log('Access granted!');
        // Proceed with patient data access
      } else if (status.data.status === 'denied') {
        clearInterval(checkStatus);
        console.log('Access denied by patient');
      }
    }, 5000);
    
  } catch (error) {
    console.error('Error requesting patient access:', error);
  }
}
```

## Integration Examples

### Patient Registration Flow
```javascript
async function registerNewPatient(patientData) {
  try {
    // Validate required fields
    const requiredFields = ['surname', 'otherNames', 'dateOfBirth', 'gender', 'telephone1'];
    for (const field of requiredFields) {
      if (!patientData[field]) {
        throw new Error(`${field} is required`);
      }
    }
    
    // Register patient
    const response = await fetch('/api/v1/auth/registerPatient', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(patientData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`Patient registered with number: ${result.data.patientNumber}`);
      return result.data;
    } else {
      throw new Error(result.message);
    }
    
  } catch (error) {
    console.error('Patient registration failed:', error);
    throw error;
  }
}
```

### Patient Dashboard Integration
```javascript
async function loadPatientDashboard(patientId) {
  try {
    const [dashboard, appointments, testResults, healthMetrics] = await Promise.all([
      api.getPatientDashboard(),
      api.getAppointmentHistory(),
      api.getTestResults(),
      api.getHealthMetrics()
    ]);
    
    return {
      dashboard: dashboard.data,
      appointments: appointments.data,
      testResults: testResults.data,
      healthMetrics: healthMetrics.data
    };
    
  } catch (error) {
    console.error('Error loading patient dashboard:', error);
    throw error;
  }
}
```

## Next Steps

- [Patient Registration](./registration.md) - Detailed registration process
- [Patient Search](./search.md) - Advanced search functionality
- [Patient Dashboard](./dashboard.md) - Dashboard implementation
- [CCP Enrollment](./ccp-enrollment.md) - Chronic Care Program
- [Patient Consent](./consent.md) - Consent management system