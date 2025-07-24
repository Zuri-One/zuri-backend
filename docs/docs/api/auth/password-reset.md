# Password Reset

ZuriHealth HMS provides multiple methods for password reset: OTP via phone and token via email.

## OTP Password Reset (Recommended)

Reset password using OTP sent to your registered phone number.

### Step 1: Request OTP
**Endpoint**: `POST /api/v1/auth/request-password-otp`

**Request Body**:
```json
{
  "email": "user@hospital.com"
}
```

**Required Fields**:
- `email`: User's registered email address

**Response** (Success):
```json
{
  "success": true,
  "message": "Password reset code sent to your phone",
  "phone": "****5678"
}
```

**Response** (No Phone Number):
```json
{
  "success": false,
  "message": "No phone number associated with this account. Please use email reset option.",
  "error": {
    "code": "NO_PHONE_NUMBER"
  }
}
```

### Step 2: Verify OTP & Reset Password
**Endpoint**: `POST /api/v1/auth/verify-password-otp`

**Request Body**:
```json
{
  "email": "user@hospital.com",
  "otp": "123456",
  "newPassword": "newSecurePassword123!"
}
```

**Required Fields**:
- `email`: User's email address
- `otp`: 6-digit OTP received via WhatsApp
- `newPassword`: New password (minimum 8 characters)

**Response** (Success):
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

## Email Token Reset

Traditional password reset using email link.

### Step 1: Request Reset Link
**Endpoint**: `POST /api/v1/auth/forgot-password`

**Request Body**:
```json
{
  "email": "user@hospital.com"
}
```

**Response**:
```json
{
  "success": true,
  "message": "If this email exists, you will receive a password reset link"
}
```

### Step 2: Use Reset Link
User receives email with reset link that opens a web form.

### Step 3: Reset via API
**Endpoint**: `POST /api/v1/auth/reset-password`

**Request Body**:
```json
{
  "code": "reset_token_from_email",
  "password": "newSecurePassword123!"
}
```

**Response** (Success):
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

## Web Form Reset

For users who prefer web interface.

### Reset Form
**Endpoint**: `GET /api/v1/auth/reset-password-form?token=<reset_token>`

Displays HTML form for password reset.

### Process Form
**Endpoint**: `POST /api/v1/auth/process-password-reset`

**Form Data**:
```
token=reset_token_here
password=newPassword123!
confirmPassword=newPassword123!
setup=false
```

Redirects to success page after completion.

## Password Requirements

### Validation Rules
- **Minimum Length**: 8 characters
- **Uppercase**: At least one uppercase letter
- **Lowercase**: At least one lowercase letter  
- **Numbers**: At least one number
- **Special Characters**: At least one special character

### Example Valid Passwords
- `SecurePass123!`
- `MyPassword2024@`
- `Hospital#2024`

### Example Invalid Passwords
- `password` (too simple)
- `12345678` (no letters)
- `Password` (no numbers/special chars)

## Error Responses

### Invalid Email
```json
{
  "success": true,
  "message": "If this email exists, you will receive a password reset link"
}
```
*Note: Same response for security (doesn't reveal if email exists)*

### Invalid OTP
```json
{
  "success": false,
  "message": "Invalid or expired reset code",
  "error": {
    "code": "INVALID_OTP"
  }
}
```

### Expired OTP
```json
{
  "success": false,
  "message": "Invalid or expired reset code",
  "error": {
    "code": "EXPIRED_OTP"
  }
}
```

### Weak Password
```json
{
  "success": false,
  "message": "Password must be at least 8 characters long",
  "error": {
    "code": "WEAK_PASSWORD"
  }
}
```

### Missing Fields
```json
{
  "success": false,
  "message": "Email, OTP, and new password are required",
  "error": {
    "code": "MISSING_FIELDS"
  }
}
```

### Service Unavailable
```json
{
  "success": false,
  "message": "Failed to send reset code. Please try email reset option.",
  "error": {
    "code": "SERVICE_UNAVAILABLE"
  }
}
```

## Security Features

### OTP Security
- **Expiry Time**: 10 minutes
- **Single Use**: OTP becomes invalid after use
- **Rate Limiting**: Limited requests per email/IP
- **Secure Delivery**: Sent via WhatsApp only

### Token Security
- **Expiry Time**: 72 hours
- **Cryptographic**: SHA-256 hashed tokens
- **Single Use**: Token becomes invalid after use
- **Secure URLs**: HTTPS only

### Account Protection
- **No Email Enumeration**: Same response for valid/invalid emails
- **Audit Logging**: All reset attempts logged
- **Confirmation**: User notified of successful password changes

## Integration Examples

### JavaScript - OTP Reset
```javascript
class PasswordReset {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }
  
  async requestOTP(email) {
    const response = await fetch(`${this.baseURL}/auth/request-password-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    return response.json();
  }
  
  async verifyOTPAndReset(email, otp, newPassword) {
    const response = await fetch(`${this.baseURL}/auth/verify-password-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, newPassword })
    });
    
    return response.json();
  }
  
  async validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (password.length < minLength) {
      return { valid: false, message: 'Password must be at least 8 characters' };
    }
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      return { 
        valid: false, 
        message: 'Password must contain uppercase, lowercase, numbers, and special characters' 
      };
    }
    
    return { valid: true };
  }
}

// Usage
const passwordReset = new PasswordReset('https://your-server.com/api/v1');

// Step 1: Request OTP
const otpResult = await passwordReset.requestOTP('user@hospital.com');
if (otpResult.success) {
  console.log('OTP sent to phone:', otpResult.phone);
}

// Step 2: Verify and reset
const resetResult = await passwordReset.verifyOTPAndReset(
  'user@hospital.com',
  '123456',
  'NewSecurePass123!'
);

if (resetResult.success) {
  console.log('Password reset successful');
}
```

### Python - Email Reset
```python
import requests

class PasswordReset:
    def __init__(self, base_url):
        self.base_url = base_url
    
    def request_email_reset(self, email):
        response = requests.post(
            f'{self.base_url}/auth/forgot-password',
            json={'email': email}
        )
        return response.json()
    
    def reset_with_token(self, token, new_password):
        response = requests.post(
            f'{self.base_url}/auth/reset-password',
            json={'code': token, 'password': new_password}
        )
        return response.json()
    
    def validate_password(self, password):
        if len(password) < 8:
            return {'valid': False, 'message': 'Password too short'}
        
        has_upper = any(c.isupper() for c in password)
        has_lower = any(c.islower() for c in password)
        has_digit = any(c.isdigit() for c in password)
        has_special = any(c in '!@#$%^&*(),.?":{}|<>' for c in password)
        
        if not all([has_upper, has_lower, has_digit, has_special]):
            return {
                'valid': False,
                'message': 'Password must contain uppercase, lowercase, numbers, and special characters'
            }
        
        return {'valid': True}

# Usage
reset_service = PasswordReset('https://your-server.com/api/v1')

# Request reset email
result = reset_service.request_email_reset('user@hospital.com')
print(result['message'])

# Reset with token (from email)
reset_result = reset_service.reset_with_token('token_from_email', 'NewPass123!')
if reset_result['success']:
    print('Password reset successful')
```

## Best Practices

### For Users
1. **Use OTP Method**: Faster and more secure than email
2. **Strong Passwords**: Follow password requirements
3. **Secure Environment**: Reset password from secure device/network
4. **Immediate Use**: Use OTP/token immediately after receiving

### For Developers
1. **Input Validation**: Validate all inputs on client and server
2. **Error Handling**: Handle all error scenarios gracefully
3. **User Feedback**: Provide clear feedback during reset process
4. **Security**: Never log passwords or tokens

### For Administrators
1. **Monitor Usage**: Track password reset patterns
2. **Rate Limiting**: Implement appropriate rate limits
3. **Audit Logs**: Review reset logs regularly
4. **User Education**: Educate users on secure password practices

## Troubleshooting

### Common Issues

1. **OTP not received**: Check phone number, try email method
2. **OTP expired**: Request new OTP (10-minute expiry)
3. **Email not received**: Check spam folder, verify email address
4. **Token expired**: Request new reset link (72-hour expiry)
5. **Password rejected**: Ensure meets all requirements

### Support Scenarios

**User can't receive OTP**:
- Verify phone number in system
- Check WhatsApp service status
- Use email reset as fallback

**User can't access email**:
- Use OTP method if phone available
- Administrator can reset password manually
- Verify email address in system

**Multiple failed attempts**:
- Check for rate limiting
- Verify user identity
- Consider account security review