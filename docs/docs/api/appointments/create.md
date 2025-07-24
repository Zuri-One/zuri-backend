# Create Appointment

Complete guide to creating appointments in the ZuriHealth HMS system.

## Create Appointment Endpoint

**Endpoint**: `POST /api/v1/appointments`

**Authentication**: Required (JWT Bearer token)

**Authorized Roles**: All authenticated users can create appointments

## Request Body

### Required Fields
```json
{
  "doctorId": "550e8400-e29b-41d4-a716-446655440000",
  "dateTime": "2024-01-20T14:30:00Z",
  "type": "in-person",
  "reason": "Regular checkup"
}
```

### Complete Request Body Example
```json
{
  "doctorId": "550e8400-e29b-41d4-a716-446655440000",
  "dateTime": "2024-01-20T14:30:00Z",
  "type": "video",
  "reason": "Follow-up consultation",
  "symptoms": ["headache", "fatigue", "dizziness"],
  "notes": "Patient reports symptoms started 3 days ago",
  "duration": 30,
  "priority": "normal"
}
```

## Field Specifications

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `doctorId` | UUID | ✅ | ID of the doctor for appointment |
| `dateTime` | DateTime | ✅ | Appointment date and time (ISO 8601) |
| `type` | Enum | ✅ | `in-person` or `video` |
| `reason` | String | ✅ | Reason for the appointment |
| `symptoms` | Array | ❌ | List of symptoms (strings) |
| `notes` | String | ❌ | Additional notes about appointment |
| `duration` | Integer | ❌ | Duration in minutes (default: 30) |
| `priority` | String | ❌ | Priority level (default: normal) |

### Appointment Types
- **in-person**: Physical consultation at the hospital
- **video**: Virtual consultation via video call

### Priority Levels
- **normal**: Standard appointment
- **urgent**: Needs attention soon
- **emergency**: Immediate attention required

## Response Examples

### Successful Creation
```json
{
  "success": true,
  "message": "Appointment created successfully",
  "data": {
    "appointment": {
      "id": "appointment-uuid",
      "patientId": "patient-uuid",
      "doctorId": "doctor-uuid",
      "dateTime": "2024-01-20T14:30:00Z",
      "type": "in-person",
      "status": "pending",
      "reason": "Regular checkup",
      "symptoms": ["headache", "fatigue"],
      "notes": "Patient reports symptoms started 3 days ago",
      "duration": 30,
      "paymentStatus": "pending",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

### Video Appointment Creation
```json
{
  "success": true,
  "message": "Video appointment created successfully",
  "data": {
    "appointment": {
      "id": "appointment-uuid",
      "patientId": "patient-uuid",
      "doctorId": "doctor-uuid",
      "dateTime": "2024-01-20T14:30:00Z",
      "type": "video",
      "status": "pending",
      "reason": "Follow-up consultation",
      "meetingLink": null,
      "duration": 30,
      "paymentStatus": "pending",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

## Error Responses

### Invalid Doctor ID
```json
{
  "success": false,
  "message": "Doctor not found or not available",
  "error": {
    "code": "DOCTOR_NOT_FOUND"
  }
}
```

### Time Slot Not Available
```json
{
  "success": false,
  "message": "Selected time slot is not available",
  "error": {
    "code": "TIME_SLOT_UNAVAILABLE",
    "details": "Doctor already has an appointment at this time"
  }
}
```

### Invalid Date/Time
```json
{
  "success": false,
  "message": "Invalid appointment date/time",
  "error": {
    "code": "INVALID_DATETIME",
    "details": "Appointment cannot be scheduled in the past"
  }
}
```

### Missing Required Fields
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "doctorId",
      "message": "Doctor ID is required",
      "code": "REQUIRED"
    },
    {
      "field": "dateTime",
      "message": "Date and time is required",
      "code": "REQUIRED"
    }
  ]
}
```

### Doctor Not Available
```json
{
  "success": false,
  "message": "Doctor is not available at the selected time",
  "error": {
    "code": "DOCTOR_UNAVAILABLE",
    "details": "Doctor is not working during selected hours",
    "availableSlots": [
      "2024-01-20T09:00:00Z",
      "2024-01-20T10:00:00Z",
      "2024-01-20T11:00:00Z"
    ]
  }
}
```

## Appointment Status Flow

Appointments go through several status changes:

1. **pending**: Initial status after creation
2. **confirmed**: Doctor/system confirms the appointment
3. **in-progress**: Appointment is currently happening
4. **completed**: Appointment finished successfully
5. **cancelled**: Appointment was cancelled
6. **no-show**: Patient didn't show up
7. **rescheduled**: Appointment was moved to different time

## Business Rules

### Scheduling Rules
- **Future Only**: Appointments can only be scheduled for future dates
- **Working Hours**: Must be within doctor's working hours
- **Availability**: Doctor must be available at selected time
- **Duration**: Minimum 15 minutes, maximum 120 minutes
- **Buffer Time**: 5-minute buffer between appointments

### Validation Rules
- **Doctor Exists**: Doctor ID must be valid and active
- **Patient Limit**: Patient can have max 3 pending appointments
- **Advance Booking**: Can book up to 30 days in advance
- **Same Day**: Same-day appointments require approval

## Integration Examples

### JavaScript - Create Appointment
```javascript
class AppointmentService {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
  }
  
  async createAppointment(appointmentData) {
    // Validate required fields
    const required = ['doctorId', 'dateTime', 'type', 'reason'];
    const missing = required.filter(field => !appointmentData[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
    
    // Validate date is in future
    const appointmentDate = new Date(appointmentData.dateTime);
    if (appointmentDate <= new Date()) {
      throw new Error('Appointment must be scheduled for future date');
    }
    
    const response = await fetch(`${this.baseURL}/appointments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(appointmentData)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to create appointment');
    }
    
    return result;
  }
  
  async checkDoctorAvailability(doctorId, date) {
    const response = await fetch(
      `${this.baseURL}/doctors/${doctorId}/availability?date=${date}`,
      {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      }
    );
    
    return response.json();
  }
  
  validateAppointmentData(data) {
    const errors = [];
    
    // Validate UUID format for doctorId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(data.doctorId)) {
      errors.push('Invalid doctor ID format');
    }
    
    // Validate appointment type
    if (!['in-person', 'video'].includes(data.type)) {
      errors.push('Appointment type must be "in-person" or "video"');
    }
    
    // Validate date format
    const date = new Date(data.dateTime);
    if (isNaN(date.getTime())) {
      errors.push('Invalid date/time format');
    }
    
    // Validate duration
    if (data.duration && (data.duration < 15 || data.duration > 120)) {
      errors.push('Duration must be between 15 and 120 minutes');
    }
    
    return errors;
  }
}

// Usage
const appointmentService = new AppointmentService(
  'https://your-server.com/api/v1',
  'your-jwt-token'
);

const appointmentData = {
  doctorId: '550e8400-e29b-41d4-a716-446655440000',
  dateTime: '2024-01-20T14:30:00Z',
  type: 'in-person',
  reason: 'Regular checkup',
  symptoms: ['headache', 'fatigue']
};

try {
  // Validate data first
  const validationErrors = appointmentService.validateAppointmentData(appointmentData);
  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join(', '));
  }
  
  // Check doctor availability
  const availability = await appointmentService.checkDoctorAvailability(
    appointmentData.doctorId,
    '2024-01-20'
  );
  
  // Create appointment
  const result = await appointmentService.createAppointment(appointmentData);
  console.log('Appointment created:', result.data.appointment.id);
  
} catch (error) {
  console.error('Failed to create appointment:', error.message);
}
```

### Python - Create Appointment
```python
import requests
from datetime import datetime, timezone
import uuid

class AppointmentService:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.token = token
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def create_appointment(self, appointment_data):
        # Validate required fields
        required = ['doctorId', 'dateTime', 'type', 'reason']
        missing = [field for field in required if not appointment_data.get(field)]
        
        if missing:
            raise ValueError(f"Missing required fields: {', '.join(missing)}")
        
        # Validate appointment is in future
        appointment_time = datetime.fromisoformat(
            appointment_data['dateTime'].replace('Z', '+00:00')
        )
        if appointment_time <= datetime.now(timezone.utc):
            raise ValueError("Appointment must be scheduled for future date")
        
        response = requests.post(
            f'{self.base_url}/appointments',
            headers=self.headers,
            json=appointment_data
        )
        
        result = response.json()
        
        if not response.ok:
            raise Exception(result.get('message', 'Failed to create appointment'))
        
        return result
    
    def check_doctor_availability(self, doctor_id, date):
        response = requests.get(
            f'{self.base_url}/doctors/{doctor_id}/availability',
            headers=self.headers,
            params={'date': date}
        )
        
        return response.json()
    
    def validate_appointment_data(self, data):
        errors = []
        
        # Validate UUID format
        try:
            uuid.UUID(data['doctorId'])
        except (ValueError, KeyError):
            errors.append('Invalid doctor ID format')
        
        # Validate appointment type
        if data.get('type') not in ['in-person', 'video']:
            errors.append('Appointment type must be "in-person" or "video"')
        
        # Validate duration
        duration = data.get('duration')
        if duration and (duration < 15 or duration > 120):
            errors.append('Duration must be between 15 and 120 minutes')
        
        return errors

# Usage
appointment_service = AppointmentService(
    'https://your-server.com/api/v1',
    'your-jwt-token'
)

appointment_data = {
    'doctorId': '550e8400-e29b-41d4-a716-446655440000',
    'dateTime': '2024-01-20T14:30:00Z',
    'type': 'in-person',
    'reason': 'Regular checkup',
    'symptoms': ['headache', 'fatigue']
}

try:
    # Validate data
    validation_errors = appointment_service.validate_appointment_data(appointment_data)
    if validation_errors:
        raise ValueError(', '.join(validation_errors))
    
    # Create appointment
    result = appointment_service.create_appointment(appointment_data)
    print(f"Appointment created: {result['data']['appointment']['id']}")
    
except Exception as e:
    print(f"Failed to create appointment: {e}")
```

## Best Practices

### Scheduling
1. **Check Availability**: Always check doctor availability before creating
2. **Buffer Time**: Consider buffer time between appointments
3. **Time Zones**: Handle time zones properly in your application
4. **Validation**: Validate all inputs on client and server side

### User Experience
1. **Available Slots**: Show available time slots to users
2. **Confirmation**: Send confirmation after successful creation
3. **Reminders**: Implement appointment reminders
4. **Easy Rescheduling**: Allow easy rescheduling/cancellation

### Error Handling
1. **Graceful Degradation**: Handle errors gracefully
2. **User Feedback**: Provide clear error messages
3. **Retry Logic**: Implement retry for network failures
4. **Fallback Options**: Provide alternative time slots

### Security
1. **Authorization**: Ensure proper role-based access
2. **Input Validation**: Validate and sanitize all inputs
3. **Rate Limiting**: Implement rate limiting for appointment creation
4. **Audit Logging**: Log all appointment creation attempts