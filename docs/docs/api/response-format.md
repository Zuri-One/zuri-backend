# Response Format

All API responses follow a consistent structure to ensure predictable integration.

## Standard Response Structure

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  }
}
```

### Success Response with Pagination
```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": {
    "items": [
      // Array of items
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": "Detailed error information"
  }
}
```

### Validation Error Response
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

## HTTP Status Codes

### Success Codes
- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **204 No Content**: Request successful, no content to return

### Client Error Codes
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource already exists
- **422 Unprocessable Entity**: Validation failed
- **429 Too Many Requests**: Rate limit exceeded

### Server Error Codes
- **500 Internal Server Error**: Server error
- **502 Bad Gateway**: Gateway error
- **503 Service Unavailable**: Service temporarily unavailable

## Data Types

### Common Field Types
- **UUID**: `"550e8400-e29b-41d4-a716-446655440000"`
- **DateTime**: `"2024-01-15T10:30:00Z"` (ISO 8601 format)
- **Date**: `"2024-01-15"` (YYYY-MM-DD format)
- **Boolean**: `true` or `false`
- **Number**: `123` or `123.45`
- **String**: `"text value"`

### Nullable Fields
Fields that can be null are explicitly marked in the documentation:
```json
{
  "optionalField": null,
  "requiredField": "value"
}
```

## Pagination

For endpoints that return lists, pagination is implemented using:

### Query Parameters
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)
- `noPagination`: Set to `true` to return all results

### Pagination Response
```json
{
  "pagination": {
    "page": 2,
    "limit": 10,
    "total": 95,
    "pages": 10,
    "hasNext": true,
    "hasPrev": true
  }
}
```

## Timestamps

All timestamps are returned in UTC timezone using ISO 8601 format:
- **Format**: `YYYY-MM-DDTHH:mm:ssZ`
- **Example**: `2024-01-15T14:30:00Z`

## Null vs Empty Values

- **null**: Field has no value
- **""**: Empty string
- **[]**: Empty array
- **{}**: Empty object

## Response Examples

### Single Resource
```json
{
  "success": true,
  "message": "Patient retrieved successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "patientNumber": "ZH000001",
    "surname": "Doe",
    "otherNames": "John",
    "email": "john.doe@example.com",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### Multiple Resources
```json
{
  "success": true,
  "message": "Patients retrieved successfully",
  "data": {
    "patients": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "patientNumber": "ZH000001",
        "surname": "Doe",
        "otherNames": "John"
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  }
}
```