# Lab Test Batch Operations API

The Lab Test Batch Operations API allows for efficient processing of multiple lab tests for the same patient, including batch creation, sample collection, and result management.

## Base URL
```
/api/v1/lab-test
```

## Authentication
All batch endpoints require authentication via Bearer token.

## Endpoints

### Create Batch Lab Tests
Create multiple lab tests for a patient in a single request.

**Endpoint:** `POST /batch`

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "patientId": "uuid",
  "queueEntryId": "uuid",
  "tests": [
    {
      "testType": "Complete Blood Count",
      "priority": "NORMAL",
      "notes": "Routine checkup"
    },
    {
      "testType": "Lipid Profile",
      "priority": "URGENT",
      "notes": "Follow-up test"
    }
  ],
  "priority": "NORMAL",
  "notes": "Batch order for comprehensive health check"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Batch of 2 lab tests created successfully",
  "batch": {
    "batchId": "uuid",
    "parentTest": {
      "id": "uuid",
      "testType": "Complete Blood Count",
      "isParentTest": true
    },
    "tests": [...],
    "totalTests": 2
  }
}
```

### Get Batch Lab Tests
Retrieve all tests in a specific batch.

**Endpoint:** `GET /batch/:batchId`

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "batchId": "uuid",
  "totalTests": 2,
  "tests": [
    {
      "id": "uuid",
      "testType": "Complete Blood Count",
      "status": "PENDING",
      "isParentTest": true,
      "batchId": "uuid",
      "patient": {...},
      "requestedBy": {...}
    }
  ]
}
```

### Collect Batch Sample
Collect a single sample for multiple tests in a batch.

**Endpoint:** `POST /batch/:batchId/collect-sample`

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Authorization:** LAB_TECHNICIAN role required

**Request Body:**
```json
{
  "sampleCollectionMethod": "Venipuncture",
  "patientPreparation": "Fasting for 12 hours",
  "sampleCollectionNotes": "Sample collected without complications"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Sample collected for batch of 2 tests",
  "result": {
    "batchId": "uuid",
    "sharedSampleId": "BATCH24120112345678",
    "testsUpdated": 2,
    "collectionDate": "2024-12-01T10:30:00.000Z"
  }
}
```

### Add Batch Results
Add results for multiple tests in a batch.

**Endpoint:** `POST /batch/:batchId/results`

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Authorization:** LAB_TECHNICIAN role required

**Request Body:**
```json
{
  "testResults": [
    {
      "testId": "uuid",
      "results": {
        "WBC": 7.5,
        "RBC": 4.8,
        "HGB": 14.2
      },
      "referenceRange": {
        "WBC": {"min": 4.5, "max": 11.0},
        "RBC": {"min": 4.2, "max": 5.4},
        "HGB": {"min": 12.0, "max": 16.0}
      },
      "isAbnormal": false,
      "isCritical": false,
      "notes": "Normal values"
    }
  ],
  "notes": "Batch processing completed"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Results added for 2 tests in batch",
  "result": {
    "batchId": "uuid",
    "testsCompleted": 2,
    "completionDate": "2024-12-01T12:00:00.000Z"
  }
}
```

### Get Patient Batch Tests
Retrieve all batch tests for a specific patient.

**Endpoint:** `GET /patient/:patientId/batches`

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `status` (optional): Filter by test status
- `dateFrom` (optional): Start date filter
- `dateTo` (optional): End date filter

**Response:**
```json
{
  "success": true,
  "patientId": "uuid",
  "totalBatches": 2,
  "batches": {
    "batch-uuid-1": [
      {
        "id": "uuid",
        "testType": "Complete Blood Count",
        "status": "COMPLETED",
        "batchId": "batch-uuid-1"
      }
    ]
  }
}
```

### Get Grouped Lab Queue
Get lab queue grouped by patient for efficient processing.

**Endpoint:** `GET /queue/grouped`

**Headers:**
- `Authorization: Bearer <token>`

**Authorization:** LAB_TECHNICIAN role required

**Response:**
```json
{
  "success": true,
  "totalPatients": 5,
  "queue": [
    {
      "patient": {
        "id": "uuid",
        "patientNumber": "P001",
        "surname": "Doe",
        "otherNames": "John"
      },
      "batches": {
        "batch-uuid": {
          "batchId": "batch-uuid",
          "tests": [...],
          "isParentTest": true
        }
      },
      "individualTests": [...]
    }
  ]
}
```

## Batch Processing Benefits

### For Doctors
- **Efficient Ordering:** Create multiple tests in a single API call
- **Reduced Errors:** Less chance of missing tests or duplicate orders
- **Better Organization:** Related tests are grouped together

### For Lab Technicians
- **Single Sample Collection:** One sample can serve multiple compatible tests
- **Patient-Centric View:** See all tests for a patient grouped together
- **Batch Processing:** Process multiple results simultaneously

### For Patients
- **Fewer Procedures:** Single sample collection for multiple tests
- **Faster Service:** Reduced wait times
- **Better Experience:** Less invasive procedures

## Batch Metadata

Each batch test includes metadata:
- `batchId`: Unique identifier for the batch
- `parentTestId`: Reference to the main test in the batch
- `isParentTest`: Boolean indicating if this is the primary test
- `sharedSampleId`: Common sample ID for batch tests
- `batchMetadata`: Additional batch information

## Error Handling

### Batch Creation Errors
```json
{
  "success": false,
  "message": "Patient not found"
}
```

### Sample Collection Errors
```json
{
  "success": false,
  "message": "No pending tests found in batch"
}
```

### Results Addition Errors
```json
{
  "success": false,
  "message": "No tests ready for results in batch"
}
```

## Backwards Compatibility

All existing single test endpoints continue to work unchanged:
- Individual test creation via `POST /api/v1/lab-test`
- Single test sample collection via `POST /api/v1/lab-test/:id/collect-sample`
- Individual result addition via `POST /api/v1/lab-test/:id/results`

The batch operations are additive features that enhance the existing functionality without breaking current workflows.