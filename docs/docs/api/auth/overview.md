# Authentication Overview

The ZuriHealth HMS API uses JWT (JSON Web Token) based authentication with role-based access control.

## Authentication Flow

1. **Register/Login**: Obtain JWT token
2. **Include Token**: Add token to Authorization header
3. **Access Resources**: Make authenticated requests
4. **Token Refresh**: Renew token before expiration

## Base Endpoint

All authentication endpoints are under:
```
/api/v1/auth/
```

## Authentication Methods

### 1. Staff Login
For healthcare staff (doctors, nurses, admin, etc.)
- **Endpoint**: `POST /api/v1/auth/staff-login`
- **Features**: 2FA support, role-based access
- **Verification**: Additional verification step for admin users

### 2. Patient Login
For patients accessing their health information
- **Endpoint**: `POST /api/v1/auth/login`
- **Features**: Standard login, optional email verification

### 3. Admin Registration
For creating new admin users
- **Endpoint**: `POST /api/v1/auth/register-admin`
- **Requires**: Admin privileges
- **Features**: Complete staff profile creation

### 4. Patient Registration
For registering new patients
- **Endpoint**: `POST /api/v1/auth/registerPatient`
- **Features**: Comprehensive patient profile, medical history

## User Roles

### ADMIN
- Full system access
- User management
- System configuration
- Reports and analytics

### DOCTOR
- Patient medical records
- Prescriptions
- Appointments
- Medical examinations

### NURSE
- Patient care
- Triage assessments
- Examinations
- Basic medical records

### PATIENT
- Personal health information
- Appointment booking
- Test results
- Prescription history

### LAB_TECHNICIAN
- Laboratory operations
- Test processing
- Sample collection
- Results entry

### PHARMACIST
- Medication dispensing
- Inventory management
- Prescription processing
- Stock control

### RECEPTIONIST
- Patient registration
- Appointment scheduling
- Billing operations
- Queue management

## JWT Token Structure

### Token Format
```
Authorization: Bearer <jwt_token>
```

### Token Payload
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "role": "DOCTOR",
  "permissions": ["read:patients", "write:prescriptions"],
  "iat": 1640995200,
  "exp": 1641081600
}
```

### Token Expiration
- **Default**: 24 hours
- **Configurable**: Via JWT_EXPIRE environment variable
- **Refresh**: Obtain new token before expiration

## Security Features

### Two-Factor Authentication (2FA)
- **Available for**: Admin and staff accounts
- **Methods**: WhatsApp, Email
- **Setup**: `POST /api/v1/auth/enable-2fa`
- **Verification**: `POST /api/v1/auth/verify-2fa`

### Password Security
- **Minimum length**: 8 characters
- **Hashing**: bcrypt with salt
- **Reset**: Secure token-based reset process

### Account Security
- **Email verification**: Required for new accounts
- **Account lockout**: After multiple failed attempts
- **Session management**: JWT token invalidation

## Common Authentication Patterns

### 1. Initial Authentication
```javascript
// Staff login
const loginResponse = await fetch('/api/v1/auth/staff-login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'doctor@hospital.com',
    password: 'securepassword',
    role: 'DOCTOR'
  })
});

const { token, user } = await loginResponse.json();
```

### 2. Making Authenticated Requests
```javascript
const response = await fetch('/api/v1/patients/all', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### 3. Handling Token Expiration
```javascript
async function makeAuthenticatedRequest(url, options = {}) {
  const token = localStorage.getItem('jwt_token');
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (response.status === 401) {
    // Token expired, redirect to login
    window.location.href = '/login';
    return;
  }
  
  return response;
}
```

## Error Handling

### Common Authentication Errors

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required",
  "error": {
    "code": "UNAUTHORIZED",
    "details": "Please provide a valid JWT token"
  }
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "message": "Insufficient permissions",
  "error": {
    "code": "FORBIDDEN",
    "details": "You don't have permission to access this resource"
  }
}
```

#### Token Expired
```json
{
  "success": false,
  "message": "Token expired",
  "error": {
    "code": "TOKEN_EXPIRED",
    "details": "Please login again"
  }
}
```

## Best Practices

### 1. Secure Token Storage
```javascript
// Store token securely
localStorage.setItem('jwt_token', token);

// Or use secure HTTP-only cookies
document.cookie = `jwt_token=${token}; Secure; HttpOnly; SameSite=Strict`;
```

### 2. Token Validation
```javascript
function isTokenValid(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp > Date.now() / 1000;
  } catch (error) {
    return false;
  }
}
```

### 3. Automatic Token Refresh
```javascript
class AuthManager {
  constructor() {
    this.token = localStorage.getItem('jwt_token');
    this.refreshTimer = null;
  }
  
  setToken(token) {
    this.token = token;
    localStorage.setItem('jwt_token', token);
    this.scheduleRefresh();
  }
  
  scheduleRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    
    const payload = JSON.parse(atob(this.token.split('.')[1]));
    const expiresIn = (payload.exp * 1000) - Date.now();
    const refreshIn = expiresIn - (5 * 60 * 1000); // 5 minutes before expiry
    
    this.refreshTimer = setTimeout(() => {
      this.refreshToken();
    }, refreshIn);
  }
  
  async refreshToken() {
    // Implement token refresh logic
  }
}
```

## Next Steps

- [Registration Guide](./registration.md)
- [Login Guide](./login.md)
- [Password Reset](./password-reset.md)
- [Two-Factor Authentication](./2fa.md)