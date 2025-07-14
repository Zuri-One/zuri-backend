# API Overview

Welcome to the ZuriHealth Hospital Management System (HMS) API documentation. This comprehensive API provides all the functionality needed to manage a modern healthcare facility.

## Base Information

- **Base URL**: `https://your-server.com/api/v1`
- **Protocol**: HTTPS only
- **Authentication**: JWT Bearer tokens
- **Content Type**: `application/json`
- **API Version**: v1

## Key Features

### 🏥 Complete Hospital Management
- Patient registration and management
- Doctor profiles and availability
- Appointment scheduling and management
- Medical records and documentation
- Laboratory test management
- Pharmacy and medication dispensing
- Billing and payment processing

### 👥 Role-Based Access Control
- **ADMIN**: Full system access and management
- **DOCTOR**: Patient care, prescriptions, medical records
- **NURSE**: Patient care, triage, examinations
- **PATIENT**: Personal health information access
- **LAB_TECHNICIAN**: Laboratory operations
- **PHARMACIST**: Medication dispensing and inventory
- **RECEPTIONIST**: Patient registration and billing

### 🔒 Security Features
- JWT-based authentication
- Role-based permissions
- 2FA support for admin accounts
- Rate limiting
- Input validation and sanitization

### 📱 Modern Healthcare Features
- Video consultations (Zoom/Whereby integration)
- Triage management system
- CCP (Chronic Care Program) support
- Electronic medical records
- Real-time queue management
- WhatsApp notifications
- PDF report generation

## API Structure

The API is organized into logical modules:

```
/api/v1/
├── auth/              # Authentication & user management
├── patients/          # Patient management
├── doctors/           # Doctor profiles & availability
├── appointments/      # Appointment scheduling
├── medical-records/   # Medical records management
├── examinations/      # Physical examinations
├── lab-test/         # Laboratory operations
├── pharmacy/         # Pharmacy & medication management
├── prescriptions/    # Prescription management
├── triage/           # Emergency triage
├── billing/          # Billing & payments
├── queue/            # Queue management
├── departments/      # Department management
├── video/            # Video consultations
├── ccp/              # Chronic Care Program
└── users/            # User management
```

## Quick Start

1. **Authentication**: Start with user registration or login
2. **Get Bearer Token**: Use the token in all subsequent requests
3. **Explore Endpoints**: Browse the API reference for specific functionality
4. **Test Integration**: Use our Postman collection for testing

## Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  },
  "pagination": {
    // Pagination info (when applicable)
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

## Error Handling

Errors are returned with appropriate HTTP status codes and descriptive messages:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

## Rate Limiting

- **General endpoints**: 100 requests per minute
- **Authentication endpoints**: 10 requests per minute
- **File upload endpoints**: 20 requests per minute

## Support

- **Live API Documentation**: [Swagger UI](https://zuri-8f5l.onrender.com/api-docs/)
- **Support Email**: support@zurihealth.com
- **Status Page**: Check system status and uptime

## Next Steps

- [Getting Started Guide](../guides/getting-started.md)
- [Authentication Guide](../guides/authentication.md)
- [API Reference](./auth/overview.md)