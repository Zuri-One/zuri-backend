# Login & Authentication

Complete guide to user authentication in the ZuriHealth HMS API.

## Staff Login

Staff members (doctors, nurses, admin, etc.) use a two-step authentication process.

### Step 1: Initial Login
**Endpoint**: `POST /api/v1/auth/staff-login`

**Request Body**:
```json
{
  "email": "doctor@hospital.com",
  "password": "securepassword123"
}
```

**Required Fields**:
- `email`: Staff member's email address
- `password`: Account password

**Response** (Success):
```json
{
  "success": true,
  "message": "Verification code sent via whatsapp. Please enter the code to complete login.",
  "tempToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "verificationMethod": "whatsapp",
  "requiresVerification": true
}
```

### Step 2: Verify Login Code
**Endpoint**: `POST /api/v1/auth/verify-staff-login`

**Request Body**:
```json
{
  "tempToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "code": "123456"
}
```

**Required Fields**:
- `tempToken`: Temporary token from step 1
- `code`: 6-digit verification code received via WhatsApp/email

**Response** (Success):
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "fullName": "Dr. John Smith",
    "email": "doctor@hospital.com",
    "role": "DOCTOR",
    "department": {
      "id": "dept-uuid",
      "name": "Cardiology"
    },
    "primaryDepartment": {
      "id": "primary-dept-uuid",
      "name": "Internal Medicine"
    },
    "permissions": ["view_patient_records", "create_prescriptions"],
    "employeeId": "EMP001",
    "designation": "Senior Doctor",
    "specialization": ["Cardiology"],
    "lastLogin": "2024-01-15T10:30:00Z"
  }
}
```

## Admin Login

Admin users have additional security with mandatory 2FA.

### Step 1: Initial Login
**Endpoint**: `POST /api/v1/auth/staff-login`
(Same as staff login)

### Step 2: Admin Verification
**Endpoint**: `POST /api/v1/auth/verify-admin-login`

**Request Body**:
```json
{
  "tempToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "code": "123456"
}
```

**Response** (Success):
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Admin User",
    "email": "admin@hospital.com",
    "role": "ADMIN",
    "department": "Administration",
    "permissions": ["all"]
  }
}
```

## Patient Login

Patients can login if they have email accounts.

**Endpoint**: `POST /api/v1/auth/login`

**Request Body**:
```json
{
  "email": "patient@example.com",
  "password": "patientpassword123",
  "role": "PATIENT"
}
```

**Response** (Success):
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "patient-uuid",
    "name": "John Doe",
    "email": "patient@example.com",
    "role": "PATIENT",
    "permissions": ["view_own_records"]
  }
}
```

## General Login

For other user types or direct API access.

**Endpoint**: `POST /api/v1/auth/login`

**Request Body**:
```json
{
  "email": "user@hospital.com",
  "password": "userpassword123",
  "role": "NURSE"
}
```

**Available Roles**:
- `ADMIN`, `DOCTOR`, `NURSE`, `PATIENT`, `LAB_TECHNICIAN`, `PHARMACIST`, `RECEPTIONIST`

## Authentication Errors

### Invalid Credentials
```json
{
  "success": false,
  "message": "Invalid credentials",
  "error": {
    "code": "UNAUTHORIZED"
  }
}
```

### Account Not Active
```json
{
  "success": false,
  "message": "Account is not active. Please contact administrator.",
  "error": {
    "code": "ACCOUNT_INACTIVE"
  }
}
```

### Password Not Set
```json
{
  "success": false,
  "message": "Account setup incomplete. Please check your email for setup instructions or contact administrator.",
  "error": {
    "code": "PASSWORD_NOT_SET"
  }
}
```

### Account Locked
```json
{
  "success": false,
  "message": "Account is locked. Please try again later.",
  "error": {
    "code": "ACCOUNT_LOCKED"
  }
}
```

### Invalid Verification Code
```json
{
  "success": false,
  "message": "Invalid or expired verification code",
  "error": {
    "code": "INVALID_VERIFICATION_CODE"
  }
}
```

### Token Expired
```json
{
  "success": false,
  "message": "Invalid or expired token. Please login again.",
  "error": {
    "code": "TOKEN_EXPIRED"
  }
}
```

## Using Authentication Tokens

Include the JWT token in all subsequent API requests:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Payload
The JWT token contains:
```json
{
  "id": "user-uuid",
  "role": "DOCTOR",
  "permissions": ["view_patient_records", "create_prescriptions"],
  "iat": 1640995200,
  "exp": 1641081600
}
```

### Token Expiration
- **Default**: 24 hours
- **Configurable**: Via JWT_EXPIRE environment variable
- **Refresh**: Obtain new token by logging in again

## Security Features

### Two-Factor Authentication
- **WhatsApp**: Primary method for verification codes
- **Email**: Fallback method if WhatsApp fails
- **Code Expiry**: 5 minutes for login verification

### Account Protection
- **Login Attempts**: Account locked after 5 failed attempts
- **Lock Duration**: 1 hour automatic unlock
- **Password Requirements**: Minimum 8 characters

### Session Management
- **Single Token**: One active token per user
- **Automatic Expiry**: Tokens expire after configured time
- **Secure Storage**: Store tokens securely on client side

## Integration Examples

### JavaScript/Node.js
```javascript
class AuthService {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('jwt_token');
  }
  
  async staffLogin(email, password) {
    const response = await fetch(`${this.baseURL}/auth/staff-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (data.requiresVerification) {
      return { needsVerification: true, tempToken: data.tempToken };
    }
    
    return data;
  }
  
  async verifyLogin(tempToken, code) {
    const response = await fetch(`${this.baseURL}/auth/verify-staff-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tempToken, code })
    });
    
    const data = await response.json();
    
    if (data.token) {
      this.token = data.token;
      localStorage.setItem('jwt_token', data.token);
    }
    
    return data;
  }
  
  async makeAuthenticatedRequest(url, options = {}) {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
  }
}
```

### Python
```python
import requests
import json

class AuthService:
    def __init__(self, base_url):
        self.base_url = base_url
        self.token = None
    
    def staff_login(self, email, password):
        response = requests.post(
            f'{self.base_url}/auth/staff-login',
            json={'email': email, 'password': password}
        )
        
        data = response.json()
        
        if data.get('requiresVerification'):
            return {'needs_verification': True, 'temp_token': data['tempToken']}
        
        return data
    
    def verify_login(self, temp_token, code):
        response = requests.post(
            f'{self.base_url}/auth/verify-staff-login',
            json={'tempToken': temp_token, 'code': code}
        )
        
        data = response.json()
        
        if data.get('token'):
            self.token = data['token']
        
        return data
    
    def make_authenticated_request(self, method, endpoint, **kwargs):
        headers = kwargs.get('headers', {})
        headers['Authorization'] = f'Bearer {self.token}'
        kwargs['headers'] = headers
        
        return requests.request(method, f'{self.base_url}{endpoint}', **kwargs)
```

## Best Practices

### Client-Side
1. **Secure Storage**: Store tokens in secure storage (not localStorage for sensitive apps)
2. **Token Validation**: Check token expiry before making requests
3. **Automatic Refresh**: Implement token refresh logic
4. **Error Handling**: Handle authentication errors gracefully

### Server-Side
1. **Token Verification**: Always verify tokens on protected endpoints
2. **Role Checking**: Implement proper role-based access control
3. **Rate Limiting**: Implement rate limiting on auth endpoints
4. **Audit Logging**: Log authentication events for security

## Troubleshooting

### Common Issues

1. **"Invalid credentials"**: Check email/password combination
2. **"Account not active"**: Contact administrator to activate account
3. **"Token expired"**: Login again to get new token
4. **"Verification code not received"**: Check phone number or try email fallback
5. **"Account locked"**: Wait 1 hour or contact administrator

### Debug Mode
In development, verification codes are included in the response for testing:

```json
{
  "message": "Verification code sent via whatsapp",
  "tempToken": "...",
  "debug": {
    "verificationCode": "123456",
    "userPhone": "+254712345678",
    "codeExpires": "2024-01-15T10:35:00Z"
  }
}
```