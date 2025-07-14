# Error Handling

The ZuriHealth HMS API uses conventional HTTP response codes to indicate the success or failure of an API request.

## Error Response Format

All errors follow a consistent format:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": {
    "code": "ERROR_CODE",
    "details": "Additional error details"
  }
}
```

## HTTP Status Codes

### 2xx Success
- **200 OK**: The request was successful
- **201 Created**: The resource was created successfully
- **204 No Content**: The request was successful but there's no content to return

### 4xx Client Errors

#### 400 Bad Request
The request was invalid or cannot be served.

```json
{
  "success": false,
  "message": "Invalid request data",
  "error": {
    "code": "BAD_REQUEST",
    "details": "The request body is malformed"
  }
}
```

#### 401 Unauthorized
Authentication is required and has failed or has not been provided.

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
The request is understood, but it has been refused due to insufficient permissions.

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

#### 404 Not Found
The requested resource could not be found.

```json
{
  "success": false,
  "message": "Resource not found",
  "error": {
    "code": "NOT_FOUND",
    "details": "Patient with ID 123 not found"
  }
}
```

#### 409 Conflict
The request conflicts with the current state of the resource.

```json
{
  "success": false,
  "message": "Resource already exists",
  "error": {
    "code": "CONFLICT",
    "details": "Email address is already registered"
  }
}
```

#### 422 Unprocessable Entity
The request was well-formed but contains semantic errors.

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email is required",
      "code": "REQUIRED"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters",
      "code": "MIN_LENGTH"
    }
  ]
}
```

#### 429 Too Many Requests
Rate limit exceeded.

```json
{
  "success": false,
  "message": "Rate limit exceeded",
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "details": "Too many requests. Please try again in 60 seconds"
  }
}
```

### 5xx Server Errors

#### 500 Internal Server Error
An error occurred on the server.

```json
{
  "success": false,
  "message": "Internal server error",
  "error": {
    "code": "INTERNAL_ERROR",
    "details": "An unexpected error occurred"
  }
}
```

#### 503 Service Unavailable
The server is temporarily unavailable.

```json
{
  "success": false,
  "message": "Service temporarily unavailable",
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "details": "The service is under maintenance"
  }
}
```

## Common Error Codes

### Authentication Errors
- `UNAUTHORIZED`: Missing or invalid authentication
- `TOKEN_EXPIRED`: JWT token has expired
- `INVALID_CREDENTIALS`: Invalid login credentials
- `ACCOUNT_LOCKED`: User account is locked
- `EMAIL_NOT_VERIFIED`: Email verification required

### Validation Errors
- `VALIDATION_ERROR`: General validation failure
- `REQUIRED`: Required field is missing
- `INVALID_FORMAT`: Field format is invalid
- `MIN_LENGTH`: Value is too short
- `MAX_LENGTH`: Value is too long
- `INVALID_EMAIL`: Email format is invalid
- `INVALID_PHONE`: Phone number format is invalid

### Resource Errors
- `NOT_FOUND`: Resource doesn't exist
- `ALREADY_EXISTS`: Resource already exists
- `CONFLICT`: Resource state conflict
- `PERMISSION_DENIED`: Insufficient permissions

### Business Logic Errors
- `APPOINTMENT_CONFLICT`: Appointment time conflict
- `INSUFFICIENT_STOCK`: Not enough medication in stock
- `INVALID_OPERATION`: Operation not allowed in current state
- `QUOTA_EXCEEDED`: Usage quota exceeded

## Error Handling Best Practices

### 1. Check HTTP Status Code
Always check the HTTP status code first:

```javascript
if (response.status >= 400) {
  // Handle error
  const errorData = await response.json();
  console.error('API Error:', errorData.message);
}
```

### 2. Handle Validation Errors
For 422 responses, iterate through validation errors:

```javascript
if (response.status === 422) {
  const errorData = await response.json();
  errorData.errors.forEach(error => {
    console.error(`${error.field}: ${error.message}`);
  });
}
```

### 3. Implement Retry Logic
For 5xx errors and rate limiting:

```javascript
async function apiCallWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      
      if (response.status >= 500) {
        throw new Error('Server error');
      }
      
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
}
```

### 4. Log Errors Appropriately
Different error types require different logging levels:

```javascript
function logError(error, context) {
  if (error.status >= 500) {
    console.error('Server Error:', error, context);
  } else if (error.status >= 400) {
    console.warn('Client Error:', error.message, context);
  }
}
```

## Debugging Tips

1. **Check Request Format**: Ensure JSON is properly formatted
2. **Verify Authentication**: Check if JWT token is valid and not expired
3. **Review Permissions**: Ensure user has required role/permissions
4. **Validate Input**: Check all required fields are provided
5. **Monitor Rate Limits**: Implement proper rate limiting handling
6. **Check Server Logs**: Review server logs for detailed error information