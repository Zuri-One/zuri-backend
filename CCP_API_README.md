# CCP (Chronic Care Program) API Documentation

## Overview

The CCP API provides comprehensive endpoints for managing chronic care patients, their follow-ups, and generating analytics. It supports both internal authentication (doctors/nurses) and external authentication via CCP tokens.

## Authentication

The CCP API supports dual authentication to serve both internal users and external systems:

### Internal Authentication (JWT)
- **Purpose**: For doctors, nurses, and internal staff using the hospital's frontend
- **Method**: Standard JWT authentication through user login
- **Routes**: `/api/v1/ccp/*` (without `/api` prefix)
- **Access**: Role-based access control (DOCTOR, NURSE, ADMIN, CCP_COORDINATOR)
- **Usage**: Include JWT token in Authorization header: `Authorization: Bearer <jwt-token>`

### External Authentication (CCP Token)
- **Purpose**: For external systems, integrations, and third-party applications
- **Method**: Static CCP token authentication
- **Routes**: `/api/v1/ccp/api/*` (with `/api` prefix)
- **Access**: Full CRUD access to CCP data
- **Setup**: Set `CCP_TOKEN` in environment variables
- **Usage**: Include token in request headers:
  - `x-ccp-token: your-token-here`
  - OR `Authorization: Bearer your-token-here`

### Route Structure

```
/api/v1/ccp/api/*     → External API (CCP Token required)
/api/v1/ccp/*         → Internal API (JWT required)
/api/v1/ccp/import    → Import functionality (no auth)
```

## Base URLs

### External API (CCP Token)
```
/api/v1/ccp/api
```

### Internal API (JWT)
```
/api/v1/ccp
```

## Endpoints

### Patients

#### GET /api/patients
Get paginated list of CCP patients (External API)

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `sortBy` (string): Sort field (default: 'createdAt')
- `sortOrder` (string): 'ASC' or 'DESC' (default: 'DESC')
- `search` (string): Search by name or patient number
- `insurer` (string): Filter by insurance provider
- `doctor` (string): Filter by doctor name/email
- `status` (string): Filter by followup status
- `month` (number): Filter by followup month
- `year` (number): Filter by followup year

**Response:**
```json
{
  "success": true,
  "data": {
    "patients": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalRecords": 200,
      "limit": 20,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### GET /api/patients/:id
Get specific CCP patient by ID or patient number (External API)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "patientNumber": "ZH000001",
    "surname": "Doe",
    "otherNames": "John",
    "ccpFollowups": [...]
  }
}
```

#### PUT /api/patients/:id
Update CCP patient information (External API)

**Allowed Fields:**
- `surname`, `otherNames`
- `telephone1`, `telephone2`
- `residence`, `town`
- `paymentScheme`, `medicalHistory`

**Request Body:**
```json
{
  "telephone1": "+254700000000",
  "residence": "New Address"
}
```

### Follow-ups

#### GET /api/followups
Get paginated list of CCP follow-ups (External API)

**Query Parameters:**
- `page`, `limit`, `sortBy`, `sortOrder` (same as patients)
- `status` (string): Filter by status
- `month` (number): Filter by month
- `year` (number): Filter by year
- `doctor` (string): Filter by doctor
- `patientId` (string): Filter by patient ID

#### POST /api/followups
Create new CCP follow-up (External API)

**Required Fields:**
- `patientId` (string): Patient ID or patient number
- `followupMonth` (number): Month (1-12)
- `followupYear` (number): Year

**Optional Fields:**
- `followupFrequency` (string): Default '1_MONTH'
- `followupType` (string): Default 'ROUTINE'
- `followupMode` (string): Default 'PHONE_CALL'
- `nextFollowupDate` (date)
- `dueFollowupDate` (date)

#### PUT /api/followups/:id
Update CCP follow-up (External API)

**Allowed Fields:**
- `followupFeedback`, `status`
- `nextFollowupDate`, `isFollowupCompleted`
- `actualFollowupDate`
- `labTestsPerformed`, `medicationsPrescribed`
- `medicationDispenseStatus`, `nextRefillDate`

### Analytics & Summaries

#### GET /api/summary/insurers
Get patient count by insurance provider (External API)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalPatients": 150,
    "insurers": [
      { "insurer": "NHIF", "count": 80 },
      { "insurer": "BRITAM", "count": 40 },
      { "insurer": "CASH", "count": 30 }
    ]
  }
}
```

#### GET /api/summary/doctors
Get follow-up statistics by doctor (External API)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalFollowups": 500,
    "doctors": [
      {
        "id": "uuid",
        "name": "Dr. Smith",
        "email": "smith@hospital.com",
        "totalFollowups": 150,
        "completedFollowups": 120,
        "pendingFollowups": 30
      }
    ]
  }
}
```

#### GET /api/summary/monthly
Get monthly follow-up statistics (External API)

**Query Parameters:**
- `year` (number): Year to analyze (default: current year)

**Response:**
```json
{
  "success": true,
  "data": {
    "year": 2025,
    "months": [
      {
        "month": 1,
        "total": 50,
        "completed": 40,
        "pending": 8,
        "cancelled": 2
      }
    ]
  }
}
```

### Import (Existing)

#### POST /import
Import CCP data from Excel files (existing functionality)
- **Authentication**: None required (internal use)
- **Purpose**: Bulk import of CCP patient data from Excel files
- **Access**: Available to all internal systems

## Internal API Endpoints

The following endpoints are available for internal users with JWT authentication:

### Patient Management
- `GET /patients` - List all CCP enrolled patients
- `GET /patient/:patientId/profile` - Get comprehensive patient profile
- `GET /patient/:patientId/medical-history` - Get patient medical history with pagination
- `GET /patient/:patientId/vital-trends` - Get vital signs trends and charts
- `GET /patient/:patientId/lab-history` - Get laboratory test history with filters
- `GET /patient/:patientId/medications` - Get current medications and prescriptions
- `GET /patient/:patientId/billing` - Get billing history and cost analysis
- `GET /patient/:patientId/follow-up` - Get follow-up schedule (upcoming, completed, overdue)
- `GET /patient/:patientId/report` - Generate comprehensive patient report

### Follow-up Management
- `POST /patient/:patientId/followups` - Create followup record
- `GET /patient/:patientId/followups` - Get patient followups
- `PUT /followups/:followupId` - Update followup record
- `POST /followups/:followupId/complete` - Complete followup
- `GET /followups/dashboard` - Get followup dashboard
- `GET /followups/overdue` - Get overdue followups

### Analytics
- `GET /analytics` - Get CCP program analytics and metrics

## Internal API Endpoint Details

### Medical History
**GET** `/patient/:patientId/medical-history`
- **Query Parameters**: `startDate`, `endDate`, `limit`, `page`
- **Returns**: Paginated medical records with doctor information
- **Access**: DOCTOR, NURSE, ADMIN, CCP_COORDINATOR

### Vital Trends
**GET** `/patient/:patientId/vital-trends`
- **Query Parameters**: `startDate`, `endDate`, `metric` (bloodPressure, weight, temperature, heartRate, bmi, oxygenSaturation)
- **Returns**: Vital signs trends and charts over time
- **Access**: DOCTOR, NURSE, ADMIN, CCP_COORDINATOR

### Lab History
**GET** `/patient/:patientId/lab-history`
- **Query Parameters**: `testType`, `status`, `startDate`, `endDate`, `limit`, `page`
- **Returns**: Laboratory test history with results and status
- **Access**: DOCTOR, NURSE, ADMIN, CCP_COORDINATOR, LAB_TECHNICIAN

### Current Medications
**GET** `/patient/:patientId/medications`
- **Returns**: Active prescriptions and recent medication dispenses
- **Access**: DOCTOR, NURSE, ADMIN, CCP_COORDINATOR, PHARMACIST

### Billing History
**GET** `/patient/:patientId/billing`
- **Query Parameters**: `startDate`, `endDate`, `paymentStatus`, `limit`, `page`
- **Returns**: Billing records with cost analysis
- **Access**: DOCTOR, NURSE, ADMIN, CCP_COORDINATOR, BILLING_CLERK

### Follow-up Schedule
**GET** `/patient/:patientId/follow-up`
- **Returns**: Upcoming, completed, and overdue follow-ups
- **Access**: DOCTOR, NURSE, ADMIN, CCP_COORDINATOR

### Patient Report
**GET** `/patient/:patientId/report`
- **Query Parameters**: `startDate`, `endDate`, `includeVitals`, `includeLabs`, `includeMedications`
- **Returns**: Comprehensive patient report with selected sections
- **Access**: DOCTOR, NURSE, ADMIN, CCP_COORDINATOR

### Program Analytics
**GET** `/analytics`
- **Query Parameters**: `startDate`, `endDate`
- **Returns**: CCP program metrics, completion rates, and statistics
- **Access**: ADMIN, CCP_COORDINATOR, DOCTOR

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `409` - Conflict (duplicate)
- `500` - Internal Server Error

## Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

## Usage Examples

### Get patients with filters
```bash
curl -H "x-ccp-token: your-token" \
  "http://localhost:3000/api/v1/ccp/api/patients?search=John&insurer=NHIF&page=1&limit=10"
```

### Update patient
```bash
curl -X PUT \
  -H "x-ccp-token: your-token" \
  -H "Content-Type: application/json" \
  -d '{"telephone1": "+254700000000"}' \
  "http://localhost:3000/api/v1/ccp/api/patients/ZH000001"
```

### Create follow-up
```bash
curl -X POST \
  -H "x-ccp-token: your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "ZH000001",
    "followupMonth": 3,
    "followupYear": 2025,
    "followupType": "ROUTINE"
  }' \
  "http://localhost:3000/api/v1/ccp/api/followups"
```

### Get analytics
```bash
curl -H "x-ccp-token: your-token" \
  "http://localhost:3000/api/v1/ccp/api/summary/insurers"
```

## Environment Variables

```env
CCP_TOKEN=your-secure-token-here
```

## Access Control

### External Systems (CCP Token)
- **Access Level**: Full CRUD access to patients and follow-ups
- **Endpoints**: All `/api/v1/ccp/api/*` endpoints
- **Analytics**: Access to all summary and analytics endpoints
- **Context**: No user context required
- **Rate Limiting**: 1000 requests per hour per token

### Internal Users (JWT)
- **Doctors**: Full access to CCP patients and follow-ups
- **Nurses**: Read/update access to follow-ups and patient data
- **CCP Coordinators**: Full access to all CCP functionality
- **Admins**: Complete access to all endpoints
- **Lab Technicians**: Access to lab-related CCP data
- **Pharmacists**: Access to medication-related CCP data
- **Billing Clerks**: Access to billing-related CCP data
- **Rate Limiting**: No limit for authenticated internal users

## Rate Limiting

- **External API calls**: 1000 requests per hour per CCP token
- **Internal API calls**: No limit for authenticated JWT users
- **Import operations**: No limit (internal use only)

## Data Validation

- All dates are validated and converted to ISO format
- Phone numbers are normalized to international format
- Patient IDs are validated against existing records
- Duplicate follow-ups for same month/year are prevented

## Pagination

All list endpoints support pagination:
- Default: 20 items per page
- Maximum: 100 items per page
- Includes navigation metadata (hasNext, hasPrev, totalPages)

## Sorting

Supported sort fields:
- `createdAt`, `updatedAt`
- `surname`, `otherNames`
- `patientNumber`
- `followupMonth`, `followupYear`

## Filtering

Advanced filtering available on:
- Patient demographics
- Insurance providers
- Doctor assignments
- Follow-up status and dates
- Medical conditions