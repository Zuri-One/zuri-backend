# Queue Management API

Complete guide to managing patient queues in the ZuriHealth HMS system.

## Base Endpoint
```
/api/v1/queue/
```

## Overview

The queue management system handles:
- Adding patients to department queues
- Managing queue status and priorities
- Doctor and department queue views
- Patient transfers between departments
- Queue history and analytics

## Authentication & Authorization

All queue endpoints require authentication via JWT token:

```http
Authorization: Bearer <jwt_token>
```

### Role-Based Access

- **ADMIN**: Full access to all queue operations
- **DOCTOR**: View assigned queues, submit consultations
- **NURSE**: Manage queues, update patient status
- **RECEPTIONIST**: Add patients to queues, manage flow
- **LAB_TECHNICIAN**: View lab queue, update test status
- **PHARMACIST**: View pharmacy queue

## Core Endpoints

### Queue Management
- `POST /api/v1/queue/add` - Add patient to queue
- `GET /api/v1/queue/department/{departmentId}` - Get department queue
- `PUT /api/v1/queue/{queueId}/status` - Update queue status
- `PUT /api/v1/queue/{queueId}/assign` - Assign doctor to patient

### Specialized Queues
- `GET /api/v1/queue/doctor-queue` - Get doctor's queue
- `GET /api/v1/queue/lab-queue` - Get laboratory queue

### Queue Operations
- `POST /api/v1/queue/{queueId}/transfer` - Transfer patient to another department
- `POST /api/v1/queue/consultation/{queueId}` - Submit consultation results

### History & Analytics
- `GET /api/v1/queue/patient/{patientId}/history` - Get patient queue history

## Add Patient to Queue

**Endpoint**: `POST /api/v1/queue/add`

**Authentication**: Required (ADMIN, DOCTOR, NURSE, RECEPTIONIST)

### Request Body
```json
{
  "patientId": "550e8400-e29b-41d4-a716-446655440000",
  "departmentId": "dept-uuid",
  "priority": "normal",
  "reason": "Regular checkup",
  "symptoms": ["headache", "fever"],
  "notes": "Patient reports symptoms started yesterday",
  "appointmentId": "appointment-uuid"
}
```

### Required Fields
- `patientId`: UUID of the patient
- `departmentId`: UUID of the department
- `reason`: Reason for visit

### Optional Fields
- `priority`: Queue priority (normal, urgent, emergency)
- `symptoms`: Array of symptoms
- `notes`: Additional notes
- `appointmentId`: Related appointment ID

### Response
```json
{
  "success": true,
  "message": "Patient added to queue successfully",
  "data": {
    "queueEntry": {
      "id": "queue-uuid",
      "queueNumber": "Q001",
      "patientId": "patient-uuid",
      "departmentId": "dept-uuid",
      "status": "waiting",
      "priority": "normal",
      "reason": "Regular checkup",
      "symptoms": ["headache", "fever"],
      "notes": "Patient reports symptoms started yesterday",
      "estimatedWaitTime": 30,
      "position": 3,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

## Get Department Queue

**Endpoint**: `GET /api/v1/queue/department/{departmentId}`

**Authentication**: Required (ADMIN, DOCTOR, NURSE, RECEPTIONIST, PHARMACIST)

### Query Parameters
- `status`: Filter by status (waiting, in_progress, completed)
- `priority`: Filter by priority (normal, urgent, emergency)
- `date`: Filter by date (YYYY-MM-DD)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

### Example Request
```http
GET /api/v1/queue/department/dept-uuid?status=waiting&priority=urgent&page=1&limit=10
```

### Response
```json
{
  "success": true,
  "data": {
    "queue": [
      {
        "id": "queue-uuid-1",
        "queueNumber": "Q001",
        "patient": {
          "id": "patient-uuid",
          "name": "John Doe",
          "patientNumber": "ZH000001",
          "age": 34,
          "sex": "MALE"
        },
        "status": "waiting",
        "priority": "urgent",
        "reason": "Chest pain",
        "symptoms": ["chest pain", "shortness of breath"],
        "assignedDoctor": null,
        "estimatedWaitTime": 15,
        "position": 1,
        "createdAt": "2024-01-15T10:30:00Z",
        "waitingTime": 25
      },
      {
        "id": "queue-uuid-2",
        "queueNumber": "Q002",
        "patient": {
          "id": "patient-uuid-2",
          "name": "Jane Smith",
          "patientNumber": "ZH000002",
          "age": 28,
          "sex": "FEMALE"
        },
        "status": "in_progress",
        "priority": "normal",
        "reason": "Follow-up",
        "assignedDoctor": {
          "id": "doctor-uuid",
          "name": "Dr. Johnson",
          "specialization": "Cardiology"
        },
        "position": 2,
        "createdAt": "2024-01-15T10:45:00Z",
        "waitingTime": 10
      }
    ],
    "summary": {
      "total": 15,
      "waiting": 8,
      "inProgress": 4,
      "completed": 3,
      "averageWaitTime": 22
    },
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 15,
      "pages": 2
    }
  }
}
```

## Update Queue Status

**Endpoint**: `PUT /api/v1/queue/{queueId}/status`

**Authentication**: Required (ADMIN, DOCTOR, NURSE, RECEPTIONIST)

### Request Body
```json
{
  "status": "in_progress",
  "notes": "Patient called for consultation",
  "estimatedDuration": 30
}
```

### Available Statuses
- `waiting`: Patient waiting in queue
- `in_progress`: Patient being attended to
- `completed`: Service completed
- `cancelled`: Patient left or cancelled
- `transferred`: Transferred to another department
- `no_show`: Patient didn't show up

### Response
```json
{
  "success": true,
  "message": "Queue status updated successfully",
  "data": {
    "queueEntry": {
      "id": "queue-uuid",
      "status": "in_progress",
      "updatedAt": "2024-01-15T11:00:00Z",
      "statusHistory": [
        {
          "status": "waiting",
          "timestamp": "2024-01-15T10:30:00Z"
        },
        {
          "status": "in_progress",
          "timestamp": "2024-01-15T11:00:00Z",
          "notes": "Patient called for consultation"
        }
      ]
    }
  }
}
```

## Assign Doctor to Queue Entry

**Endpoint**: `PUT /api/v1/queue/{queueId}/assign`

**Authentication**: Required (ADMIN, DOCTOR, NURSE, RECEPTIONIST)

### Request Body
```json
{
  "doctorId": "doctor-uuid",
  "notes": "Assigned to cardiology specialist"
}
```

### Response
```json
{
  "success": true,
  "message": "Doctor assigned successfully",
  "data": {
    "queueEntry": {
      "id": "queue-uuid",
      "assignedDoctor": {
        "id": "doctor-uuid",
        "name": "Dr. Johnson",
        "specialization": "Cardiology"
      },
      "status": "assigned",
      "updatedAt": "2024-01-15T11:00:00Z"
    }
  }
}
```

## Get Doctor Queue

**Endpoint**: `GET /api/v1/queue/doctor-queue`

**Authentication**: Required (DOCTOR, LAB_TECHNICIAN)

### Query Parameters
- `status`: Filter by status
- `date`: Filter by date (YYYY-MM-DD)

### Response
```json
{
  "success": true,
  "data": {
    "queue": [
      {
        "id": "queue-uuid",
        "queueNumber": "Q001",
        "patient": {
          "id": "patient-uuid",
          "name": "John Doe",
          "patientNumber": "ZH000001",
          "age": 34,
          "sex": "MALE",
          "medicalHistory": {
            "allergies": ["penicillin"],
            "chronicConditions": ["hypertension"],
            "lastVisit": "2024-01-01T10:00:00Z"
          }
        },
        "status": "waiting",
        "priority": "urgent",
        "reason": "Chest pain",
        "symptoms": ["chest pain", "shortness of breath"],
        "vitals": {
          "bloodPressure": "140/90",
          "heartRate": 85,
          "temperature": 37.2,
          "weight": 75
        },
        "department": {
          "id": "dept-uuid",
          "name": "Cardiology"
        },
        "waitingTime": 25,
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "summary": {
      "totalPatients": 5,
      "waitingPatients": 3,
      "inProgressPatients": 2,
      "averageWaitTime": 18
    }
  }
}
```

## Get Lab Queue

**Endpoint**: `GET /api/v1/queue/lab-queue`

**Authentication**: Required (LAB_TECHNICIAN)

### Response
```json
{
  "success": true,
  "data": {
    "queue": [
      {
        "id": "queue-uuid",
        "queueNumber": "L001",
        "patient": {
          "id": "patient-uuid",
          "name": "John Doe",
          "patientNumber": "ZH000001"
        },
        "status": "waiting",
        "priority": "normal",
        "testOrders": [
          {
            "id": "test-uuid",
            "testName": "Complete Blood Count",
            "testCode": "CBC",
            "urgency": "routine"
          },
          {
            "id": "test-uuid-2",
            "testName": "Lipid Profile",
            "testCode": "LIPID",
            "urgency": "routine"
          }
        ],
        "orderingDoctor": {
          "name": "Dr. Smith",
          "department": "Internal Medicine"
        },
        "createdAt": "2024-01-15T10:30:00Z",
        "waitingTime": 15
      }
    ],
    "summary": {
      "totalTests": 12,
      "pendingTests": 8,
      "inProgressTests": 3,
      "completedTests": 1
    }
  }
}
```

## Transfer Patient to Another Department

**Endpoint**: `POST /api/v1/queue/{queueId}/transfer`

**Authentication**: Required (ADMIN, RECEPTIONIST, DOCTOR, NURSE)

### Request Body
```json
{
  "targetDepartmentId": "target-dept-uuid",
  "reason": "Requires specialist consultation",
  "priority": "urgent",
  "notes": "Patient needs cardiology evaluation",
  "transferredBy": "doctor-uuid"
}
```

### Response
```json
{
  "success": true,
  "message": "Patient transferred successfully",
  "data": {
    "originalQueue": {
      "id": "original-queue-uuid",
      "status": "transferred",
      "transferredAt": "2024-01-15T11:30:00Z"
    },
    "newQueue": {
      "id": "new-queue-uuid",
      "queueNumber": "C001",
      "departmentId": "target-dept-uuid",
      "status": "waiting",
      "priority": "urgent",
      "position": 2,
      "estimatedWaitTime": 20
    }
  }
}
```

## Submit Consultation

**Endpoint**: `POST /api/v1/queue/consultation/{queueId}`

**Authentication**: Required (DOCTOR)

### Request Body
```json
{
  "diagnosis": "Hypertension",
  "symptoms": ["headache", "dizziness"],
  "treatment": "Prescribed antihypertensive medication",
  "prescriptions": [
    {
      "medicationName": "Amlodipine",
      "dosage": "5mg",
      "frequency": "Once daily",
      "duration": "30 days"
    }
  ],
  "labTests": [
    {
      "testName": "Lipid Profile",
      "urgency": "routine"
    }
  ],
  "followUpRequired": true,
  "followUpDate": "2024-02-15",
  "notes": "Patient counseled on lifestyle modifications",
  "nextDepartment": "pharmacy"
}
```

### Response
```json
{
  "success": true,
  "message": "Consultation submitted successfully",
  "data": {
    "consultation": {
      "id": "consultation-uuid",
      "queueId": "queue-uuid",
      "diagnosis": "Hypertension",
      "treatment": "Prescribed antihypertensive medication",
      "prescriptionCreated": true,
      "labTestsOrdered": 1,
      "followUpScheduled": true,
      "completedAt": "2024-01-15T12:00:00Z"
    },
    "queueStatus": "completed",
    "nextQueue": {
      "department": "pharmacy",
      "queueNumber": "P001",
      "estimatedWaitTime": 10
    }
  }
}
```

## Get Patient Queue History

**Endpoint**: `GET /api/v1/queue/patient/{patientId}/history`

**Authentication**: Required (ADMIN, DOCTOR, NURSE, RECEPTIONIST)

### Query Parameters
- `startDate`: Filter from date (YYYY-MM-DD)
- `endDate`: Filter to date (YYYY-MM-DD)
- `departmentId`: Filter by department
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

### Response
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "id": "queue-uuid-1",
        "queueNumber": "Q001",
        "department": {
          "id": "dept-uuid",
          "name": "Cardiology"
        },
        "status": "completed",
        "priority": "urgent",
        "reason": "Chest pain",
        "assignedDoctor": {
          "name": "Dr. Johnson",
          "specialization": "Cardiology"
        },
        "waitingTime": 25,
        "serviceTime": 45,
        "createdAt": "2024-01-15T10:30:00Z",
        "completedAt": "2024-01-15T12:00:00Z",
        "outcome": "Diagnosed with hypertension, prescribed medication"
      }
    ],
    "summary": {
      "totalVisits": 5,
      "averageWaitTime": 22,
      "averageServiceTime": 35,
      "mostVisitedDepartment": "Cardiology"
    },
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "pages": 1
    }
  }
}
```

## Queue Priority System

### Priority Levels
1. **emergency**: Life-threatening conditions (immediate attention)
2. **urgent**: Serious conditions (within 15 minutes)
3. **normal**: Regular appointments and check-ups

### Priority Rules
- Emergency patients bypass all other priorities
- Urgent patients are served before normal priority
- Within same priority, FIFO (First In, First Out) applies
- Appointment patients may have priority over walk-ins

## Queue Status Flow

Queue entries go through several status changes:

1. **waiting**: Patient added to queue, waiting for service
2. **assigned**: Doctor assigned to patient
3. **in_progress**: Patient being attended to
4. **completed**: Service completed successfully
5. **transferred**: Moved to another department
6. **cancelled**: Patient left or service cancelled
7. **no_show**: Patient didn't show up for service

## Error Responses

### Patient Not Found
```json
{
  "success": false,
  "message": "Patient not found",
  "error": {
    "code": "PATIENT_NOT_FOUND"
  }
}
```

### Department Not Found
```json
{
  "success": false,
  "message": "Department not found or not active",
  "error": {
    "code": "DEPARTMENT_NOT_FOUND"
  }
}
```

### Queue Entry Not Found
```json
{
  "success": false,
  "message": "Queue entry not found",
  "error": {
    "code": "QUEUE_ENTRY_NOT_FOUND"
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
    "details": "Cannot change from completed to waiting"
  }
}
```

### Doctor Not Available
```json
{
  "success": false,
  "message": "Doctor is not available or not assigned to this department",
  "error": {
    "code": "DOCTOR_NOT_AVAILABLE"
  }
}
```

## Integration Examples

### JavaScript - Queue Management
```javascript
class QueueService {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
  }
  
  async addToQueue(patientId, departmentId, reason, priority = 'normal') {
    const response = await fetch(`${this.baseURL}/queue/add`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        patientId,
        departmentId,
        reason,
        priority
      })
    });
    
    return response.json();
  }
  
  async getDepartmentQueue(departmentId, filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await fetch(
      `${this.baseURL}/queue/department/${departmentId}?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      }
    );
    
    return response.json();
  }
  
  async updateQueueStatus(queueId, status, notes) {
    const response = await fetch(`${this.baseURL}/queue/${queueId}/status`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status, notes })
    });
    
    return response.json();
  }
  
  async assignDoctor(queueId, doctorId, notes) {
    const response = await fetch(`${this.baseURL}/queue/${queueId}/assign`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ doctorId, notes })
    });
    
    return response.json();
  }
  
  async transferPatient(queueId, targetDepartmentId, reason, priority) {
    const response = await fetch(`${this.baseURL}/queue/${queueId}/transfer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        targetDepartmentId,
        reason,
        priority
      })
    });
    
    return response.json();
  }
}

// Usage
const queueService = new QueueService(
  'https://your-server.com/api/v1',
  'your-jwt-token'
);

// Add patient to queue
const queueEntry = await queueService.addToQueue(
  'patient-uuid',
  'dept-uuid',
  'Regular checkup',
  'normal'
);

console.log('Queue number:', queueEntry.data.queueEntry.queueNumber);

// Get department queue
const queue = await queueService.getDepartmentQueue('dept-uuid', {
  status: 'waiting',
  priority: 'urgent'
});

console.log('Waiting patients:', queue.data.summary.waiting);
```

## Best Practices

### Queue Management
1. **Priority Handling**: Implement proper priority queuing
2. **Real-time Updates**: Use WebSockets for real-time queue updates
3. **Wait Time Estimation**: Provide accurate wait time estimates
4. **Queue Analytics**: Track queue performance metrics

### User Experience
1. **Clear Status**: Show clear queue status to patients
2. **Notifications**: Notify patients when their turn approaches
3. **Mobile Updates**: Provide mobile-friendly queue status
4. **Estimated Times**: Show realistic wait time estimates

### Performance
1. **Efficient Queries**: Optimize database queries for queue operations
2. **Caching**: Cache frequently accessed queue data
3. **Pagination**: Implement pagination for large queues
4. **Background Processing**: Use background jobs for heavy operations

### Security
1. **Role-Based Access**: Implement proper role restrictions
2. **Data Privacy**: Protect patient information in queues
3. **Audit Logging**: Log all queue operations
4. **Input Validation**: Validate all queue-related inputs