---
sidebar_position: 2
---

# External API (CCP Token)

External API endpoints for third-party systems and integrations using CCP token authentication.

## Authentication

Include the CCP token in request headers:
```bash
# Option 1
x-ccp-token: your-token-here

# Option 2  
Authorization: Bearer your-token-here
```

## Patients

### Get Patients
**GET** `/api/v1/ccp/api/patients`

Get paginated list of CCP patients with filters.

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

**Example Request:**
```bash
curl -H "x-ccp-token: your-token" \
  "https://api.hospital.com/api/v1/ccp/api/patients?search=John&insurer=NHIF&page=1&limit=10"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "patients": [
      {
        "id": "uuid",
        "patientNumber": "ZH000001",
        "surname": "Doe",
        "otherNames": "John",
        "sex": "MALE",
        "dateOfBirth": "1980-01-01",
        "telephone1": "+254700000000",
        "ccpFollowups": [...]
      }
    ],
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

### Get Patient
**GET** `/api/v1/ccp/api/patients/:id`

Get specific CCP patient by ID or patient number.

**Parameters:**
- `id` (string): Patient ID or patient number

**Example Request:**
```bash
curl -H "x-ccp-token: your-token" \
  "https://api.hospital.com/api/v1/ccp/api/patients/ZH000001"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "patientNumber": "ZH000001",
    "surname": "Doe",
    "otherNames": "John",
    "ccpFollowups": [
      {
        "id": "uuid",
        "followupMonth": 1,
        "followupYear": 2025,
        "status": "COMPLETED"
      }
    ]
  }
}
```

### Update Patient
**PUT** `/api/v1/ccp/api/patients/:id`

Update CCP patient information.

**Allowed Fields:**
- `surname`, `otherNames`
- `telephone1`, `telephone2`
- `residence`, `town`
- `paymentScheme`, `medicalHistory`

**Example Request:**
```bash
curl -X PUT \
  -H "x-ccp-token: your-token" \
  -H "Content-Type: application/json" \
  -d '{"telephone1": "+254700000000", "residence": "New Address"}' \
  "https://api.hospital.com/api/v1/ccp/api/patients/ZH000001"
```

**Response:**
```json
{
  "success": true,
  "message": "CCP patient updated successfully",
  "data": {
    "id": "uuid",
    "telephone1": "+254700000000",
    "residence": "New Address"
  }
}
```

## Follow-ups

### Get Follow-ups
**GET** `/api/v1/ccp/api/followups`

Get paginated list of CCP follow-ups with filters.

**Query Parameters:**
- `page`, `limit`, `sortBy`, `sortOrder` (same as patients)
- `status` (string): Filter by status
- `month` (number): Filter by month
- `year` (number): Filter by year
- `doctor` (string): Filter by doctor
- `patientId` (string): Filter by patient ID

**Example Request:**
```bash
curl -H "x-ccp-token: your-token" \
  "https://api.hospital.com/api/v1/ccp/api/followups?status=COMPLETED&month=1&year=2025"
```

### Create Follow-up
**POST** `/api/v1/ccp/api/followups`

Create new CCP follow-up.

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

**Example Request:**
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
  "https://api.hospital.com/api/v1/ccp/api/followups"
```

### Update Follow-up
**PUT** `/api/v1/ccp/api/followups/:id`

Update CCP follow-up.

**Allowed Fields:**
- `followupFeedback`, `status`
- `nextFollowupDate`, `isFollowupCompleted`
- `actualFollowupDate`
- `labTestsPerformed`, `medicationsPrescribed`
- `medicationDispenseStatus`, `nextRefillDate`

**Example Request:**
```bash
curl -X PUT \
  -H "x-ccp-token: your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "followupFeedback": "Patient doing well",
    "isFollowupCompleted": true
  }' \
  "https://api.hospital.com/api/v1/ccp/api/followups/uuid"
```

## Analytics & Summaries

### Insurer Summary
**GET** `/api/v1/ccp/api/summary/insurers`

Get patient count by insurance provider.

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

### Doctor Summary
**GET** `/api/v1/ccp/api/summary/doctors`

Get follow-up statistics by doctor.

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

### Monthly Summary
**GET** `/api/v1/ccp/api/summary/monthly`

Get monthly follow-up statistics.

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

## Rate Limiting

- **Limit**: 1000 requests per hour per CCP token
- **Headers**: Rate limit information included in response headers
- **Exceeded**: Returns 429 status code when limit exceeded