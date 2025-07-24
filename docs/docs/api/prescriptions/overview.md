# Prescription Management API

Complete guide to managing prescriptions in the ZuriHealth HMS system.

## Base Endpoint
```
/api/v1/prescriptions/
```

## Overview

The prescription management system handles:
- Creating new prescriptions
- Managing prescription medications
- Tracking prescription status
- Prescription refills
- Patient prescription history

## Authentication & Authorization

All prescription endpoints require authentication via JWT token:

```http
Authorization: Bearer <jwt_token>
```

### Role-Based Access

- **DOCTOR**: Create, view, and manage prescriptions
- **PHARMACIST**: View prescriptions, update dispensing status
- **NURSE**: View prescriptions for patient care
- **PATIENT**: View own prescriptions only
- **ADMIN**: Full access to all prescriptions

## Core Endpoints

### Create Prescription
- `POST /api/v1/prescriptions` - Create new prescription

### Retrieve Prescriptions
- `GET /api/v1/prescriptions/{id}` - Get specific prescription
- `GET /api/v1/prescriptions/patient/{patientId}` - Get patient prescriptions

### Manage Prescriptions
- `PATCH /api/v1/prescriptions/{id}/status` - Update prescription status
- `PATCH /api/v1/prescriptions/{prescriptionId}/medications/{medicationId}` - Update medication details
- `POST /api/v1/prescriptions/{id}/refill` - Refill prescription

## Create Prescription

**Endpoint**: `POST /api/v1/prescriptions`

**Authentication**: Required (DOCTOR role)

### Request Body
```json
{
  "patientId": "550e8400-e29b-41d4-a716-446655440000",
  "diagnosis": "Hypertension",
  "medications": [
    {
      "medicationId": "med-uuid-1",
      "name": "Amlodipine",
      "dosage": "5mg",
      "frequency": "Once daily",
      "duration": "30 days",
      "quantity": 30,
      "instructions": "Take with food in the morning"
    },
    {
      "medicationId": "med-uuid-2",
      "name": "Lisinopril",
      "dosage": "10mg",
      "frequency": "Once daily",
      "duration": "30 days",
      "quantity": 30,
      "instructions": "Take on empty stomach"
    }
  ],
  "notes": "Monitor blood pressure weekly",
  "followUpDate": "2024-02-15",
  "refillsAllowed": 2
}
```

### Required Fields
- `patientId`: UUID of the patient
- `medications`: Array of medication objects
- `medications[].name`: Medication name
- `medications[].dosage`: Medication dosage
- `medications[].frequency`: How often to take
- `medications[].duration`: Treatment duration
- `medications[].quantity`: Number of units

### Optional Fields
- `diagnosis`: Medical diagnosis
- `medications[].medicationId`: Reference to medication inventory
- `medications[].instructions`: Special instructions
- `notes`: Additional prescription notes
- `followUpDate`: Next appointment date
- `refillsAllowed`: Number of refills allowed

### Response
```json
{
  "success": true,
  "message": "Prescription created successfully",
  "data": {
    "prescription": {
      "id": "prescription-uuid",
      "patientId": "patient-uuid",
      "doctorId": "doctor-uuid",
      "prescriptionNumber": "RX000001",
      "diagnosis": "Hypertension",
      "status": "active",
      "medications": [
        {
          "id": "prescription-med-uuid-1",
          "medicationId": "med-uuid-1",
          "name": "Amlodipine",
          "dosage": "5mg",
          "frequency": "Once daily",
          "duration": "30 days",
          "quantity": 30,
          "dispensed": 0,
          "instructions": "Take with food in the morning",
          "status": "pending"
        }
      ],
      "notes": "Monitor blood pressure weekly",
      "followUpDate": "2024-02-15",
      "refillsAllowed": 2,
      "refillsUsed": 0,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

## Get Prescription

**Endpoint**: `GET /api/v1/prescriptions/{id}`

**Authentication**: Required

### Response
```json
{
  "success": true,
  "data": {
    "prescription": {
      "id": "prescription-uuid",
      "prescriptionNumber": "RX000001",
      "patient": {
        "id": "patient-uuid",
        "name": "John Doe",
        "patientNumber": "ZH000001"
      },
      "doctor": {
        "id": "doctor-uuid",
        "name": "Dr. Smith",
        "specialization": "Cardiology"
      },
      "diagnosis": "Hypertension",
      "status": "active",
      "medications": [
        {
          "id": "prescription-med-uuid-1",
          "name": "Amlodipine",
          "dosage": "5mg",
          "frequency": "Once daily",
          "duration": "30 days",
          "quantity": 30,
          "dispensed": 15,
          "remaining": 15,
          "instructions": "Take with food in the morning",
          "status": "partially_dispensed"
        }
      ],
      "notes": "Monitor blood pressure weekly",
      "followUpDate": "2024-02-15",
      "refillsAllowed": 2,
      "refillsUsed": 0,
      "createdAt": "2024-01-15T10:30:00Z",
      "lastDispensed": "2024-01-20T14:30:00Z"
    }
  }
}
```

## Get Patient Prescriptions

**Endpoint**: `GET /api/v1/prescriptions/patient/{patientId}`

**Authentication**: Required

### Query Parameters
- `status`: Filter by status (active, completed, cancelled)
- `startDate`: Filter from date (YYYY-MM-DD)
- `endDate`: Filter to date (YYYY-MM-DD)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

### Example Request
```http
GET /api/v1/prescriptions/patient/patient-uuid?status=active&page=1&limit=10
```

### Response
```json
{
  "success": true,
  "data": {
    "prescriptions": [
      {
        "id": "prescription-uuid-1",
        "prescriptionNumber": "RX000001",
        "diagnosis": "Hypertension",
        "status": "active",
        "doctor": {
          "name": "Dr. Smith",
          "specialization": "Cardiology"
        },
        "medicationCount": 2,
        "createdAt": "2024-01-15T10:30:00Z",
        "followUpDate": "2024-02-15"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "pages": 1
    }
  }
}
```

## Update Prescription Status

**Endpoint**: `PATCH /api/v1/prescriptions/{id}/status`

**Authentication**: Required (DOCTOR, PHARMACIST)

### Request Body
```json
{
  "status": "completed",
  "reason": "All medications dispensed",
  "notes": "Patient counseled on medication usage"
}
```

### Available Statuses
- `active`: Prescription is active and can be dispensed
- `completed`: All medications dispensed or treatment finished
- `cancelled`: Prescription cancelled by doctor
- `expired`: Prescription has expired
- `on_hold`: Temporarily suspended

### Response
```json
{
  "success": true,
  "message": "Prescription status updated successfully",
  "data": {
    "prescription": {
      "id": "prescription-uuid",
      "status": "completed",
      "updatedAt": "2024-01-20T15:30:00Z"
    }
  }
}
```

## Update Prescription Medication

**Endpoint**: `PATCH /api/v1/prescriptions/{prescriptionId}/medications/{medicationId}`

**Authentication**: Required (DOCTOR, PHARMACIST)

### Request Body
```json
{
  "dispensed": 15,
  "status": "partially_dispensed",
  "dispensingNotes": "Patient counseled on side effects",
  "dispensedBy": "pharmacist-uuid",
  "dispensedAt": "2024-01-20T14:30:00Z"
}
```

### Response
```json
{
  "success": true,
  "message": "Medication updated successfully",
  "data": {
    "medication": {
      "id": "prescription-med-uuid",
      "dispensed": 15,
      "remaining": 15,
      "status": "partially_dispensed",
      "dispensingNotes": "Patient counseled on side effects",
      "updatedAt": "2024-01-20T14:30:00Z"
    }
  }
}
```

## Refill Prescription

**Endpoint**: `POST /api/v1/prescriptions/{id}/refill`

**Authentication**: Required (DOCTOR)

### Request Body
```json
{
  "refillQuantity": 30,
  "notes": "Patient responding well to treatment",
  "followUpDate": "2024-03-15"
}
```

### Response
```json
{
  "success": true,
  "message": "Prescription refilled successfully",
  "data": {
    "prescription": {
      "id": "prescription-uuid",
      "refillsUsed": 1,
      "refillsRemaining": 1,
      "lastRefilled": "2024-01-20T15:30:00Z",
      "followUpDate": "2024-03-15"
    }
  }
}
```

## Prescription Status Flow

Prescriptions go through several status changes:

1. **active**: Newly created, ready for dispensing
2. **partially_dispensed**: Some medications dispensed
3. **completed**: All medications dispensed or treatment finished
4. **cancelled**: Cancelled by doctor
5. **expired**: Past expiration date
6. **on_hold**: Temporarily suspended

## Medication Status Flow

Individual medications within prescriptions have their own status:

1. **pending**: Not yet dispensed
2. **partially_dispensed**: Some quantity dispensed
3. **fully_dispensed**: Complete quantity dispensed
4. **cancelled**: Medication cancelled
5. **substituted**: Different medication dispensed

## Error Responses

### Prescription Not Found
```json
{
  "success": false,
  "message": "Prescription not found",
  "error": {
    "code": "PRESCRIPTION_NOT_FOUND"
  }
}
```

### Insufficient Permissions
```json
{
  "success": false,
  "message": "Insufficient permissions to access this prescription",
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS"
  }
}
```

### Invalid Status Transition
```json
{
  "success": false,
  "message": "Invalid status transition",
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "details": "Cannot change from completed to active"
  }
}
```

### No Refills Remaining
```json
{
  "success": false,
  "message": "No refills remaining for this prescription",
  "error": {
    "code": "NO_REFILLS_REMAINING",
    "refillsUsed": 2,
    "refillsAllowed": 2
  }
}
```

## Integration Examples

### JavaScript - Prescription Management
```javascript
class PrescriptionService {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
  }
  
  async createPrescription(prescriptionData) {
    const response = await fetch(`${this.baseURL}/prescriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(prescriptionData)
    });
    
    return response.json();
  }
  
  async getPrescription(prescriptionId) {
    const response = await fetch(`${this.baseURL}/prescriptions/${prescriptionId}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });
    
    return response.json();
  }
  
  async getPatientPrescriptions(patientId, filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await fetch(
      `${this.baseURL}/prescriptions/patient/${patientId}?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      }
    );
    
    return response.json();
  }
  
  async updatePrescriptionStatus(prescriptionId, status, reason, notes) {
    const response = await fetch(
      `${this.baseURL}/prescriptions/${prescriptionId}/status`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, reason, notes })
      }
    );
    
    return response.json();
  }
  
  async dispenseMedication(prescriptionId, medicationId, dispensedQuantity, notes) {
    const response = await fetch(
      `${this.baseURL}/prescriptions/${prescriptionId}/medications/${medicationId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dispensed: dispensedQuantity,
          status: 'partially_dispensed',
          dispensingNotes: notes,
          dispensedAt: new Date().toISOString()
        })
      }
    );
    
    return response.json();
  }
}

// Usage
const prescriptionService = new PrescriptionService(
  'https://your-server.com/api/v1',
  'your-jwt-token'
);

// Create prescription
const prescriptionData = {
  patientId: 'patient-uuid',
  diagnosis: 'Hypertension',
  medications: [
    {
      name: 'Amlodipine',
      dosage: '5mg',
      frequency: 'Once daily',
      duration: '30 days',
      quantity: 30,
      instructions: 'Take with food'
    }
  ],
  notes: 'Monitor blood pressure',
  refillsAllowed: 2
};

const prescription = await prescriptionService.createPrescription(prescriptionData);
console.log('Prescription created:', prescription.data.prescription.prescriptionNumber);
```

## Best Practices

### Prescription Creation
1. **Validate Medications**: Ensure all medications exist in inventory
2. **Check Interactions**: Verify no drug interactions
3. **Dosage Validation**: Validate dosages are appropriate
4. **Patient Allergies**: Check patient allergy information

### Dispensing
1. **Quantity Tracking**: Track dispensed vs prescribed quantities
2. **Patient Counseling**: Document patient counseling
3. **Substitutions**: Handle medication substitutions properly
4. **Expiry Dates**: Check medication expiry dates

### Security
1. **Role-Based Access**: Implement proper role restrictions
2. **Audit Logging**: Log all prescription activities
3. **Data Privacy**: Protect patient prescription data
4. **Secure Transmission**: Use HTTPS for all communications