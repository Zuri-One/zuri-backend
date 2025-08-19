---
sidebar_position: 3
---

# Internal API (JWT)

Internal API endpoints for hospital staff using JWT authentication.

## Authentication

Include JWT token in Authorization header:
```bash
Authorization: Bearer <jwt-token>
```

## Patient Management

### List CCP Patients
**GET** `/api/v1/ccp/patients`

Get all CCP enrolled patients with basic information.

**Access**: DOCTOR, NURSE, ADMIN, CCP_COORDINATOR

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 50)
- `search` (string): Search by name, patient number, or phone
- `status` (string): 'active' or 'inactive' (default: 'active')

**Example Request:**
```bash
curl -H "Authorization: Bearer jwt-token" \
  "https://api.hospital.com/api/v1/ccp/patients?search=John&page=1&limit=20"
```

### Patient Profile
**GET** `/api/v1/ccp/patient/:patientId/profile`

Get comprehensive CCP patient profile with all related data.

**Access**: DOCTOR, NURSE, ADMIN, CCP_COORDINATOR

**Response includes:**
- Personal information
- CCP program details
- Medical history summary
- Examination records
- Laboratory tests
- Medications
- Billing information
- Care coordination metrics

**Example Request:**
```bash
curl -H "Authorization: Bearer jwt-token" \
  "https://api.hospital.com/api/v1/ccp/patient/uuid/profile"
```

### Medical History
**GET** `/api/v1/ccp/patient/:patientId/medical-history`

Get patient medical history with pagination.

**Access**: DOCTOR, NURSE, ADMIN, CCP_COORDINATOR

**Query Parameters:**
- `startDate` (date): Filter from date
- `endDate` (date): Filter to date
- `limit` (number): Items per page (default: 20)
- `page` (number): Page number (default: 1)

**Response:**
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "id": "uuid",
        "date": "January 15th 2025",
        "doctor": "Dr. Smith",
        "complaints": "Chest pain",
        "diagnosis": "Hypertension",
        "notes": "Patient stable",
        "treatment": "Medication prescribed"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalRecords": 100,
      "limit": 20
    }
  }
}
```

### Vital Trends
**GET** `/api/v1/ccp/patient/:patientId/vital-trends`

Get vital signs trends and charts over time.

**Access**: DOCTOR, NURSE, ADMIN, CCP_COORDINATOR

**Query Parameters:**
- `startDate` (date): Filter from date
- `endDate` (date): Filter to date
- `metric` (string): Specific metric (bloodPressure, weight, temperature, heartRate, bmi, oxygenSaturation)

**Response:**
```json
{
  "success": true,
  "data": {
    "trends": {
      "bloodPressure": [
        {
          "date": "2025-01-15",
          "systolic": 120,
          "diastolic": 80
        }
      ],
      "weight": [
        {
          "date": "2025-01-15",
          "value": 70
        }
      ]
    },
    "totalExaminations": 25
  }
}
```

### Lab History
**GET** `/api/v1/ccp/patient/:patientId/lab-history`

Get laboratory test history with filters.

**Access**: DOCTOR, NURSE, ADMIN, CCP_COORDINATOR, LAB_TECHNICIAN

**Query Parameters:**
- `testType` (string): Filter by test type
- `status` (string): PENDING, SAMPLE_COLLECTED, IN_PROGRESS, COMPLETED, CANCELLED
- `startDate`, `endDate` (date): Date range
- `limit`, `page` (number): Pagination

**Response:**
```json
{
  "success": true,
  "data": {
    "tests": [
      {
        "id": "uuid",
        "testType": "Blood Sugar",
        "status": "COMPLETED",
        "requestDate": "January 15th 2025",
        "resultDate": "January 16th 2025",
        "results": {"glucose": "120 mg/dL"},
        "isCritical": false,
        "requestedBy": "Dr. Smith"
      }
    ],
    "pagination": {...}
  }
}
```

### Current Medications
**GET** `/api/v1/ccp/patient/:patientId/medications`

Get current medications and prescription history.

**Access**: DOCTOR, NURSE, ADMIN, CCP_COORDINATOR, PHARMACIST

**Response:**
```json
{
  "success": true,
  "data": {
    "activePrescriptions": [
      {
        "id": "uuid",
        "date": "January 15th 2025",
        "doctor": "Dr. Smith",
        "diagnosis": "Hypertension",
        "medicationCount": 2,
        "validUntil": "February 15th 2025"
      }
    ],
    "recentDispenses": [
      {
        "id": "uuid",
        "medicationName": "Amlodipine",
        "strength": "5mg",
        "quantity": 30,
        "dispensedAt": "January 15th 2025",
        "totalPrice": 500
      }
    ]
  }
}
```

### Billing History
**GET** `/api/v1/ccp/patient/:patientId/billing`

Get billing history and cost analysis.

**Access**: DOCTOR, NURSE, ADMIN, CCP_COORDINATOR, BILLING_CLERK

**Query Parameters:**
- `startDate`, `endDate` (date): Date range
- `paymentStatus` (string): PENDING, PAID, WAIVED
- `limit`, `page` (number): Pagination

**Response:**
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "id": "uuid",
        "date": "January 15th 2025",
        "totalAmount": 2500,
        "paymentStatus": "PAID",
        "paymentMethod": "CASH",
        "items": [...]
      }
    ],
    "costAnalysis": {
      "totalAmount": 15000,
      "averagePerVisit": 1500,
      "paymentMethods": {"CASH": 10000, "INSURANCE": 5000},
      "monthlyTrends": {...}
    },
    "pagination": {...}
  }
}
```

### Follow-up Schedule
**GET** `/api/v1/ccp/patient/:patientId/follow-up`

Get follow-up schedule (upcoming, completed, overdue).

**Access**: DOCTOR, NURSE, ADMIN, CCP_COORDINATOR

**Response:**
```json
{
  "success": true,
  "data": {
    "upcoming": [
      {
        "id": "uuid",
        "nextFollowupDate": "February 15th 2025",
        "followupType": "ROUTINE",
        "followupMode": "PHONE_CALL",
        "priority": "NORMAL",
        "status": "SCHEDULED"
      }
    ],
    "completed": [...],
    "overdue": [...]
  }
}
```

### Generate Report
**GET** `/api/v1/ccp/patient/:patientId/report`

Generate comprehensive patient report.

**Access**: DOCTOR, NURSE, ADMIN, CCP_COORDINATOR

**Query Parameters:**
- `startDate`, `endDate` (date): Report period
- `includeVitals` (boolean): Include vital signs (default: true)
- `includeLabs` (boolean): Include lab tests (default: true)
- `includeMedications` (boolean): Include medications (default: true)

## Follow-up Management

### Create Follow-up
**POST** `/api/v1/ccp/patient/:patientId/followups`

Create CCP followup record for a patient.

**Access**: DOCTOR, NURSE, ADMIN, CCP_COORDINATOR

**Required Fields:**
- `followupFrequency` (string): 1_WEEK, 2_WEEKS, 1_MONTH, 2_MONTHS, 3_MONTHS, 6_MONTHS, 12_MONTHS

**Optional Fields:**
- `nextFollowupDate`, `dueFollowupDate` (date)
- `followupType` (string): ROUTINE, URGENT, MEDICATION_REVIEW, LAB_FOLLOWUP, SYMPTOM_CHECK, EMERGENCY
- `followupMode` (string): IN_PERSON, PHONE_CALL, VIDEO_CALL, SMS, HOME_VISIT
- `priority` (string): LOW, NORMAL, HIGH, URGENT
- `followupFeedback`, `consultationFeedback` (string)
- `vitalSigns`, `symptomsAssessment` (object)
- `medicationCompliance` (string): EXCELLENT, GOOD, FAIR, POOR, NON_COMPLIANT
- `actionItems`, `referralsNeeded`, `labTestsOrdered` (array)
- `privateNotes`, `patientNotes` (string)

### Get Patient Follow-ups
**GET** `/api/v1/ccp/patient/:patientId/followups`

Get CCP followup records for a patient.

**Access**: DOCTOR, NURSE, ADMIN, CCP_COORDINATOR

**Query Parameters:**
- `year`, `month` (number): Filter by date
- `status` (string): SCHEDULED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW, RESCHEDULED
- `isCompleted` (boolean): Filter by completion status
- `limit`, `page` (number): Pagination

### Update Follow-up
**PUT** `/api/v1/ccp/followups/:followupId`

Update CCP followup record.

**Access**: DOCTOR, NURSE, ADMIN, CCP_COORDINATOR

### Complete Follow-up
**POST** `/api/v1/ccp/followups/:followupId/complete`

Complete CCP followup and record outcomes.

**Access**: DOCTOR, NURSE, ADMIN, CCP_COORDINATOR

### Follow-up Dashboard
**GET** `/api/v1/ccp/followups/dashboard`

Get CCP followup dashboard with metrics and overdue followups.

**Access**: DOCTOR, NURSE, ADMIN, CCP_COORDINATOR

**Query Parameters:**
- `month`, `year` (number): Dashboard period (defaults to current month/year)

### Overdue Follow-ups
**GET** `/api/v1/ccp/followups/overdue`

Get all overdue CCP followups across all patients.

**Access**: DOCTOR, NURSE, ADMIN, CCP_COORDINATOR

**Query Parameters:**
- `limit`, `page` (number): Pagination (default: 50 per page)

## Analytics

### Program Analytics
**GET** `/api/v1/ccp/analytics`

Get CCP program analytics and metrics.

**Access**: ADMIN, CCP_COORDINATOR, DOCTOR

**Query Parameters:**
- `startDate`, `endDate` (date): Analysis period

**Response:**
```json
{
  "success": true,
  "analytics": {
    "overview": {
      "totalPatients": 500,
      "activeFollowups": 150,
      "completedFollowups": 300,
      "overdueFollowups": 25,
      "completionRate": 85
    },
    "period": {
      "startDate": "January 1st 2025",
      "endDate": "Present"
    }
  }
}
```

## Import

### Bulk Import
**POST** `/api/v1/ccp/import`

Import CCP data from Excel files.

**Access**: Internal use (no authentication required)

**Purpose**: Bulk import of CCP patient data from Excel files