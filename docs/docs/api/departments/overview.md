# Department Management API

Complete guide to managing hospital departments in the ZuriHealth HMS system.

## Base Endpoint
```
/api/v1/departments/
```

## Overview

The department management system handles:
- Creating and managing hospital departments
- Department staff assignments
- Department statistics and analytics
- Department status management
- Doctor assignments by department

## Authentication & Authorization

All department endpoints require authentication via JWT token:

```http
Authorization: Bearer <jwt_token>
```

### Role-Based Access

- **ADMIN**: Full access to all department operations
- **DOCTOR**: View department information, limited updates
- **NURSE**: View department information
- **RECEPTIONIST**: View department information
- **Other Roles**: Read-only access to basic department info

## Core Endpoints

### Department CRUD
- `POST /api/v1/departments` - Create new department
- `GET /api/v1/departments` - Get all departments
- `GET /api/v1/departments/{id}` - Get specific department
- `PUT /api/v1/departments/{id}` - Update department
- `PATCH /api/v1/departments/{id}/status` - Toggle department status

### Department Analytics
- `GET /api/v1/departments/{id}/stats` - Get department statistics

### Staff Management
- `POST /api/v1/departments/{departmentId}/staff` - Assign staff to department
- `GET /api/v1/departments/{departmentId}/doctors` - Get department doctors

## Create Department

**Endpoint**: `POST /api/v1/departments`

**Authentication**: Required (ADMIN role)

### Request Body
```json
{
  "name": "Cardiology",
  "code": "CARD-001",
  "type": "CLINICAL",
  "description": "Cardiovascular healthcare services including diagnosis and treatment of heart conditions",
  "location": "Building A, 3rd Floor",
  "operatingHours": {
    "monday": "08:00-17:00",
    "tuesday": "08:00-17:00",
    "wednesday": "08:00-17:00",
    "thursday": "08:00-17:00",
    "friday": "08:00-17:00",
    "saturday": "08:00-12:00",
    "sunday": "closed"
  },
  "capacity": 50,
  "headOfDepartmentId": "doctor-uuid",
  "contactExtension": "2301",
  "emergencyContact": "+254712345678",
  "resources": {
    "equipment": ["ECG Machine", "Echocardiogram", "Stress Test Equipment"],
    "beds": 20,
    "rooms": 8
  },
  "metadata": {
    "specializations": ["Interventional Cardiology", "Electrophysiology"],
    "certifications": ["Joint Commission Accredited"]
  }
}
```

### Required Fields
- `name`: Department name
- `code`: Unique department code
- `type`: Department type

### Optional Fields
- `description`: Detailed description
- `location`: Physical location
- `operatingHours`: Operating schedule
- `capacity`: Patient capacity
- `headOfDepartmentId`: Department head ID
- `contactExtension`: Phone extension
- `emergencyContact`: Emergency contact number
- `resources`: Department resources
- `metadata`: Additional metadata

### Department Types
- `CLINICAL`: Clinical departments (Cardiology, Neurology, etc.)
- `DIAGNOSTIC`: Diagnostic services (Radiology, Laboratory)
- `SUPPORT`: Support services (Pharmacy, Administration)
- `EMERGENCY`: Emergency services
- `SURGICAL`: Surgical departments

### Response
```json
{
  "success": true,
  "message": "Department created successfully",
  "data": {
    "department": {
      "id": "dept-uuid",
      "name": "Cardiology",
      "code": "CARD-001",
      "type": "CLINICAL",
      "description": "Cardiovascular healthcare services",
      "location": "Building A, 3rd Floor",
      "operatingHours": {
        "monday": "08:00-17:00",
        "tuesday": "08:00-17:00"
      },
      "capacity": 50,
      "headOfDepartmentId": "doctor-uuid",
      "contactExtension": "2301",
      "emergencyContact": "+254712345678",
      "isActive": true,
      "resources": {
        "equipment": ["ECG Machine", "Echocardiogram"],
        "beds": 20,
        "rooms": 8
      },
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

## Get All Departments

**Endpoint**: `GET /api/v1/departments`

**Authentication**: Required

### Query Parameters
- `type`: Filter by department type
- `isActive`: Filter by active status (true/false)
- `search`: Search by name or code
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

### Example Request
```http
GET /api/v1/departments?type=CLINICAL&isActive=true&search=card&page=1&limit=10
```

### Response
```json
{
  "success": true,
  "data": {
    "departments": [
      {
        "id": "dept-uuid-1",
        "name": "Cardiology",
        "code": "CARD-001",
        "type": "CLINICAL",
        "description": "Cardiovascular healthcare services",
        "location": "Building A, 3rd Floor",
        "capacity": 50,
        "isActive": true,
        "headOfDepartment": {
          "id": "doctor-uuid",
          "name": "Dr. Johnson",
          "specialization": "Cardiology"
        },
        "staffCount": 15,
        "operatingHours": {
          "monday": "08:00-17:00"
        },
        "createdAt": "2024-01-15T10:30:00Z"
      },
      {
        "id": "dept-uuid-2",
        "name": "Cardiac Surgery",
        "code": "CSURG-001",
        "type": "SURGICAL",
        "description": "Cardiac surgical procedures",
        "location": "Building B, 2nd Floor",
        "capacity": 20,
        "isActive": true,
        "staffCount": 8,
        "createdAt": "2024-01-10T09:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 2,
      "pages": 1
    },
    "summary": {
      "totalDepartments": 2,
      "activeDepartments": 2,
      "inactiveDepartments": 0,
      "departmentTypes": {
        "CLINICAL": 1,
        "SURGICAL": 1
      }
    }
  }
}
```

## Get Department by ID

**Endpoint**: `GET /api/v1/departments/{id}`

**Authentication**: Required

### Response
```json
{
  "success": true,
  "data": {
    "department": {
      "id": "dept-uuid",
      "name": "Cardiology",
      "code": "CARD-001",
      "type": "CLINICAL",
      "description": "Cardiovascular healthcare services including diagnosis and treatment of heart conditions",
      "location": "Building A, 3rd Floor",
      "operatingHours": {
        "monday": "08:00-17:00",
        "tuesday": "08:00-17:00",
        "wednesday": "08:00-17:00",
        "thursday": "08:00-17:00",
        "friday": "08:00-17:00",
        "saturday": "08:00-12:00",
        "sunday": "closed"
      },
      "capacity": 50,
      "contactExtension": "2301",
      "emergencyContact": "+254712345678",
      "isActive": true,
      "headOfDepartment": {
        "id": "doctor-uuid",
        "name": "Dr. Johnson",
        "email": "dr.johnson@hospital.com",
        "specialization": "Cardiology",
        "licenseNumber": "MD12345"
      },
      "resources": {
        "equipment": ["ECG Machine", "Echocardiogram", "Stress Test Equipment"],
        "beds": 20,
        "rooms": 8
      },
      "metadata": {
        "specializations": ["Interventional Cardiology", "Electrophysiology"],
        "certifications": ["Joint Commission Accredited"]
      },
      "staff": [\n        {\n          \"id\": \"staff-uuid-1\",\n          \"name\": \"Dr. Smith\",\n          \"role\": \"DOCTOR\",\n          \"specialization\": \"Interventional Cardiology\"\n        },\n        {\n          \"id\": \"staff-uuid-2\",\n          \"name\": \"Nurse Johnson\",\n          \"role\": \"NURSE\",\n          \"department\": \"Cardiology\"\n        }\n      ],\n      \"statistics\": {\n        \"totalStaff\": 15,\n        \"doctors\": 8,\n        \"nurses\": 5,\n        \"support\": 2,\n        \"currentPatients\": 25,\n        \"monthlyPatients\": 450\n      },\n      \"createdAt\": \"2024-01-15T10:30:00Z\",\n      \"updatedAt\": \"2024-01-15T10:30:00Z\"\n    }\n  }\n}
```

## Update Department

**Endpoint**: `PUT /api/v1/departments/{id}`

**Authentication**: Required (ADMIN or manage_departments permission)

### Request Body
```json
{
  "name": "Cardiology & Vascular Medicine",
  "description": "Comprehensive cardiovascular and vascular healthcare services",
  "location": "Building A, 3rd & 4th Floor",
  "operatingHours": {
    "monday": "07:00-18:00",
    "tuesday": "07:00-18:00",
    "wednesday": "07:00-18:00",
    "thursday": "07:00-18:00",
    "friday": "07:00-18:00",
    "saturday": "08:00-14:00",
    "sunday": "emergency_only"
  },
  "capacity": 60,
  "headOfDepartmentId": "new-doctor-uuid",
  "contactExtension": "2301",
  "emergencyContact": "+254712345678",
  "resources": {
    "equipment": ["ECG Machine", "Echocardiogram", "Stress Test Equipment", "Cardiac Catheterization Lab"],
    "beds": 25,
    "rooms": 10
  }
}
```

### Response
```json
{
  "success": true,
  "message": "Department updated successfully",
  "data": {
    "department": {
      "id": "dept-uuid",
      "name": "Cardiology & Vascular Medicine",
      "description": "Comprehensive cardiovascular and vascular healthcare services",
      "capacity": 60,
      "updatedAt": "2024-01-20T14:30:00Z"
    }
  }
}
```

## Toggle Department Status

**Endpoint**: `PATCH /api/v1/departments/{id}/status`

**Authentication**: Required (ADMIN)

### Request Body
```json
{
  "isActive": false,
  "reason": "Department renovation in progress"
}
```

### Response
```json
{
  "success": true,
  "message": "Department status updated successfully",
  "data": {
    "department": {
      "id": "dept-uuid",
      "name": "Cardiology",
      "isActive": false,
      "statusChangedAt": "2024-01-20T15:00:00Z",
      "statusChangeReason": "Department renovation in progress"
    }
  }
}
```

## Get Department Statistics

**Endpoint**: `GET /api/v1/departments/{id}/stats`

**Authentication**: Required

### Query Parameters
- `period`: Statistics period (day, week, month, year)
- `startDate`: Start date for custom period
- `endDate`: End date for custom period

### Response
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalStaff": 15,
      "staffDistribution": {
        "DOCTOR": 8,
        "NURSE": 5,
        "SUPPORT": 2
      },
      "operatingHours": {
        "weeklyHours": 54,
        "weekendHours": 6,
        "emergencyHours": 168
      },
      "capacity": {
        "totalCapacity": 50,
        "currentOccupancy": 35,
        "occupancyRate": 70
      },
      "resourceCount": {
        "equipment": 4,
        "beds": 20,
        "rooms": 8
      },
      "patientStatistics": {
        "dailyAverage": 15,
        "weeklyTotal": 105,
        "monthlyTotal": 450,
        "yearlyTotal": 5400
      },
      "performance": {
        "averageWaitTime": 22,
        "averageServiceTime": 45,
        "patientSatisfaction": 4.2
      },
      "financials": {
        "monthlyRevenue": 125000,
        "operatingCosts": 85000,
        "profitMargin": 32
      }
    }
  }
}
```

## Assign Staff to Department

**Endpoint**: `POST /api/v1/departments/{departmentId}/staff`

**Authentication**: Required (ADMIN)

### Request Body
```json
{
  "staffIds": [
    "staff-uuid-1",
    "staff-uuid-2",
    "staff-uuid-3"
  ],
  "assignmentType": "primary",
  "effectiveDate": "2024-01-20",
  "notes": "New staff assignments for expanded services"
}
```

### Assignment Types
- `primary`: Primary department assignment
- `secondary`: Secondary/cross-department assignment
- `temporary`: Temporary assignment

### Response
```json
{
  "success": true,
  "message": "Staff assigned successfully",
  "data": {
    "assignments": [
      {
        "staffId": "staff-uuid-1",
        "staffName": "Dr. Wilson",
        "role": "DOCTOR",
        "assignmentType": "primary",
        "assignedAt": "2024-01-20T10:00:00Z"
      },
      {
        "staffId": "staff-uuid-2",
        "staffName": "Nurse Davis",
        "role": "NURSE",
        "assignmentType": "primary",
        "assignedAt": "2024-01-20T10:00:00Z"
      }
    ],
    "departmentStaffCount": 17
  }
}
```

## Get Department Doctors

**Endpoint**: `GET /api/v1/departments/{departmentId}/doctors`

**Authentication**: Required

### Query Parameters
- `specialization`: Filter by specialization
- `isActive`: Filter by active status
- `availability`: Filter by current availability

### Response
```json
{
  "success": true,
  "data": {
    "doctors": [
      {
        "id": "doctor-uuid-1",
        "name": "Dr. Johnson",
        "email": "dr.johnson@hospital.com",
        "specialization": ["Interventional Cardiology"],
        "licenseNumber": "MD12345",
        "employeeId": "EMP001",
        "isActive": true,
        "availability": {
          "status": "available",
          "nextAvailable": "2024-01-20T14:00:00Z"
        },
        "workSchedule": {
          "monday": "08:00-17:00",
          "tuesday": "08:00-17:00"
        },
        "assignmentType": "primary",
        "joinedDepartment": "2024-01-01T00:00:00Z"
      },
      {
        "id": "doctor-uuid-2",
        "name": "Dr. Smith",
        "specialization": ["Electrophysiology"],
        "licenseNumber": "MD67890",
        "isActive": true,
        "availability": {
          "status": "busy",
          "nextAvailable": "2024-01-20T16:00:00Z"
        },
        "assignmentType": "secondary"
      }
    ],
    "summary": {
      "totalDoctors": 8,
      "availableDoctors": 5,
      "busyDoctors": 2,
      "offDutyDoctors": 1,
      "specializations": [
        "Interventional Cardiology",
        "Electrophysiology",
        "Cardiac Surgery"
      ]
    }
  }
}
```

## Error Responses

### Department Not Found
```json
{
  "success": false,
  "message": "Department not found",
  "error": {
    "code": "DEPARTMENT_NOT_FOUND"
  }
}
```

### Duplicate Department Code
```json
{
  "success": false,
  "message": "Department code already exists",
  "error": {
    "code": "DUPLICATE_DEPARTMENT_CODE",
    "details": "Code 'CARD-001' is already in use"
  }
}
```

### Invalid Head of Department
```json
{
  "success": false,
  "message": "Invalid head of department",
  "error": {
    "code": "INVALID_HEAD_OF_DEPARTMENT",
    "details": "User is not a doctor or is not active"
  }
}
```

### Department Has Active Patients
```json
{
  "success": false,
  "message": "Cannot deactivate department with active patients",
  "error": {
    "code": "DEPARTMENT_HAS_ACTIVE_PATIENTS",
    "activePatients": 15
  }
}
```

## Integration Examples

### JavaScript - Department Management
```javascript
class DepartmentService {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
  }
  
  async createDepartment(departmentData) {
    const response = await fetch(`${this.baseURL}/departments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(departmentData)
    });
    
    return response.json();
  }
  
  async getAllDepartments(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${this.baseURL}/departments?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });
    
    return response.json();
  }
  
  async getDepartment(departmentId) {
    const response = await fetch(`${this.baseURL}/departments/${departmentId}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });
    
    return response.json();
  }
  
  async updateDepartment(departmentId, updateData) {
    const response = await fetch(`${this.baseURL}/departments/${departmentId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });
    
    return response.json();
  }
  
  async toggleDepartmentStatus(departmentId, isActive, reason) {
    const response = await fetch(`${this.baseURL}/departments/${departmentId}/status`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ isActive, reason })
    });
    
    return response.json();
  }
  
  async getDepartmentStats(departmentId, period = 'month') {
    const response = await fetch(
      `${this.baseURL}/departments/${departmentId}/stats?period=${period}`,
      {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      }
    );
    
    return response.json();
  }
  
  async assignStaffToDepartment(departmentId, staffIds, assignmentType = 'primary') {
    const response = await fetch(`${this.baseURL}/departments/${departmentId}/staff`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ staffIds, assignmentType })
    });
    
    return response.json();
  }
  
  async getDepartmentDoctors(departmentId, filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await fetch(
      `${this.baseURL}/departments/${departmentId}/doctors?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      }
    );
    
    return response.json();
  }
}

// Usage
const departmentService = new DepartmentService(
  'https://your-server.com/api/v1',
  'your-jwt-token'
);

// Create department
const departmentData = {
  name: 'Cardiology',
  code: 'CARD-001',
  type: 'CLINICAL',
  description: 'Cardiovascular healthcare services',
  location: 'Building A, 3rd Floor',
  capacity: 50
};

const department = await departmentService.createDepartment(departmentData);
console.log('Department created:', department.data.department.id);

// Get all departments
const departments = await departmentService.getAllDepartments({
  type: 'CLINICAL',
  isActive: true
});

console.log('Active clinical departments:', departments.data.departments.length);
```

## Best Practices

### Department Setup
1. **Unique Codes**: Use clear, unique department codes
2. **Comprehensive Info**: Provide complete department information
3. **Resource Planning**: Plan capacity and resources appropriately
4. **Staff Assignment**: Assign qualified staff to departments

### Management
1. **Regular Updates**: Keep department information current
2. **Status Monitoring**: Monitor department status and performance
3. **Staff Management**: Manage staff assignments effectively
4. **Resource Optimization**: Optimize resource utilization

### Performance
1. **Efficient Queries**: Optimize database queries for department operations
2. **Caching**: Cache frequently accessed department data
3. **Statistics**: Track and analyze department performance
4. **Reporting**: Generate regular department reports

### Security
1. **Role-Based Access**: Implement proper role restrictions
2. **Data Protection**: Protect sensitive department information
3. **Audit Logging**: Log all department management activities
4. **Input Validation**: Validate all department-related inputs