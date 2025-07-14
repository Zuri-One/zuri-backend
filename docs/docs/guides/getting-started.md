# Getting Started

Welcome to the ZuriHealth Hospital Management System API! This guide will help you get up and running quickly.

## Prerequisites

Before you begin, ensure you have:
- Basic understanding of REST APIs
- HTTP client (Postman, curl, or similar)
- Programming knowledge (JavaScript, Python, etc.)
- Valid credentials for the system

## Quick Start

### 1. Obtain API Access

Contact your system administrator to get:
- API base URL
- User credentials
- Role assignments
- Any required API keys

### 2. Authentication

Start by authenticating to get your JWT token:

```bash
curl -X POST https://your-server.com/api/v1/auth/staff-login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@hospital.com",
    "password": "your-password",
    "role": "DOCTOR"
  }'
```

Response:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "doctor@hospital.com",
      "role": "DOCTOR",
      "name": "Dr. John Smith"
    }
  }
}
```

### 3. Make Your First API Call

Use the token to make authenticated requests:

```bash
curl -X GET https://your-server.com/api/v1/patients/all \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

## Common Workflows

### Patient Management Workflow

1. **Register a Patient**
```bash
curl -X POST https://your-server.com/api/v1/auth/registerPatient \
  -H "Content-Type: application/json" \
  -d '{
    "surname": "Doe",
    "otherNames": "John",
    "dateOfBirth": "1990-05-15",
    "gender": "MALE",
    "telephone1": "+254712345678",
    "occupation": "Engineer",
    "idType": "NATIONAL_ID",
    "nationality": "Kenyan",
    "town": "Nairobi",
    "areaOfResidence": "Westlands",
    "nextOfKin": {
      "name": "Jane Doe",
      "relationship": "Spouse",
      "phone": "+254798765432"
    }
  }'
```

2. **Search for Patients**
```bash
curl -X GET "https://your-server.com/api/v1/patient/search?searchTerm=+254712345678" \
  -H "Authorization: Bearer <token>"
```

3. **Get Patient Details**
```bash
curl -X GET https://your-server.com/api/v1/patient/details/ZH000001 \
  -H "Authorization: Bearer <token>"
```

### Appointment Workflow

1. **Get Available Doctors**
```bash
curl -X GET "https://your-server.com/api/v1/doctors/available?date=2024-01-20" \
  -H "Authorization: Bearer <token>"
```

2. **Book an Appointment**
```bash
curl -X POST https://your-server.com/api/v1/appointments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "doctorId": "doctor-uuid",
    "dateTime": "2024-01-20T14:30:00Z",
    "type": "in-person",
    "reason": "Regular checkup",
    "symptoms": ["headache", "fatigue"]
  }'
```

3. **Check Appointment Status**
```bash
curl -X GET https://your-server.com/api/v1/appointments/appointment-id \
  -H "Authorization: Bearer <token>"
```

### Laboratory Workflow

1. **Request Lab Test**
```bash
curl -X POST https://your-server.com/api/v1/lab-test \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient-uuid",
    "testType": "Blood Test - Complete Blood Count",
    "priority": "NORMAL",
    "notes": "Routine checkup"
  }'
```

2. **Get Test Results**
```bash
curl -X GET https://your-server.com/api/v1/lab-test/test-id \
  -H "Authorization: Bearer <token>"
```

## SDK Examples

### JavaScript/Node.js

```javascript
class ZuriHealthAPI {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
  }
  
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };
    
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }
    
    return data;
  }
  
  // Authentication
  async login(email, password, role) {
    const response = await fetch(`${this.baseURL}/auth/staff-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role })
    });
    
    const data = await response.json();
    if (data.success) {
      this.token = data.data.token;
    }
    return data;
  }
  
  // Patients
  async getPatients(page = 1, limit = 10) {
    return this.request(`/patient/all?page=${page}&limit=${limit}`);
  }
  
  async searchPatients(searchTerm) {
    return this.request(`/patient/search?searchTerm=${encodeURIComponent(searchTerm)}`);
  }
  
  async getPatientDetails(identifier) {
    return this.request(`/patient/details/${identifier}`);
  }
  
  // Appointments
  async createAppointment(appointmentData) {
    return this.request('/appointments', {
      method: 'POST',
      body: JSON.stringify(appointmentData)
    });
  }
  
  async getAppointments(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/appointments?${params}`);
  }
}

// Usage
const api = new ZuriHealthAPI('https://your-server.com/api/v1');

// Login
await api.login('doctor@hospital.com', 'password', 'DOCTOR');

// Get patients
const patients = await api.getPatients();
console.log(patients);
```

### Python

```python
import requests
import json

class ZuriHealthAPI:
    def __init__(self, base_url, token=None):
        self.base_url = base_url
        self.token = token
        self.session = requests.Session()
    
    def set_token(self, token):
        self.token = token
        self.session.headers.update({
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        })
    
    def login(self, email, password, role):
        response = self.session.post(
            f'{self.base_url}/auth/staff-login',
            json={
                'email': email,
                'password': password,
                'role': role
            }
        )
        
        data = response.json()
        if data.get('success'):
            self.set_token(data['data']['token'])
        
        return data
    
    def get_patients(self, page=1, limit=10):
        response = self.session.get(
            f'{self.base_url}/patient/all',
            params={'page': page, 'limit': limit}
        )
        return response.json()
    
    def search_patients(self, search_term):
        response = self.session.get(
            f'{self.base_url}/patient/search',
            params={'searchTerm': search_term}
        )
        return response.json()
    
    def create_appointment(self, appointment_data):
        response = self.session.post(
            f'{self.base_url}/appointments',
            json=appointment_data
        )
        return response.json()

# Usage
api = ZuriHealthAPI('https://your-server.com/api/v1')

# Login
login_result = api.login('doctor@hospital.com', 'password', 'DOCTOR')
print(f"Login successful: {login_result['success']}")

# Get patients
patients = api.get_patients()
print(f"Found {len(patients['data']['patients'])} patients")
```

## Testing with Postman

### 1. Import Collection
Download our [Postman collection](../postman-collection.json) and import it into Postman.

### 2. Set Environment Variables
Create a new environment with these variables:
- `base_url`: https://your-server.com/api/v1
- `jwt_token`: (will be set automatically after login)

### 3. Authentication Flow
1. Run the "Staff Login" request
2. The JWT token will be automatically saved to the environment
3. All subsequent requests will use this token

## Error Handling

Always check the response status and handle errors appropriately:

```javascript
async function handleAPICall(apiFunction) {
  try {
    const result = await apiFunction();
    
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    if (error.response?.status === 401) {
      // Token expired, redirect to login
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      // Insufficient permissions
      alert('You do not have permission to perform this action');
    } else {
      // Other errors
      console.error('API Error:', error.message);
      alert(`Error: ${error.message}`);
    }
  }
}
```

## Rate Limiting

Be aware of rate limits:
- General endpoints: 100 requests/minute
- Authentication: 10 requests/minute
- File uploads: 20 requests/minute

Implement retry logic with exponential backoff:

```javascript
async function apiCallWithRetry(apiCall, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      if (error.response?.status === 429) {
        // Rate limited, wait and retry
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}
```

## Next Steps

Now that you're set up, explore these guides:

1. **[Authentication Guide](./authentication.md)** - Detailed authentication flows
2. **[Integration Guides](./integration/)** - Specific workflow implementations
3. **[API Reference](../api/overview.md)** - Complete endpoint documentation
4. **[Best Practices](./best-practices/)** - Security and performance tips

## Support

Need help? Contact us:
- **Email**: support@zurihealth.com
- **Documentation**: This site
- **API Status**: Check our status page
- **Live API Docs**: [Swagger UI](https://zuri-8f5l.onrender.com/api-docs/)