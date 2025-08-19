---
sidebar_position: 1
---

# CCP API Overview

The Chronic Care Program (CCP) API provides comprehensive endpoints for managing chronic care patients, their follow-ups, and generating analytics. It supports both internal authentication (doctors/nurses) and external authentication via CCP tokens.

## Authentication Methods

### Internal Authentication (JWT)
- **Purpose**: For doctors, nurses, and internal staff using the hospital's frontend
- **Method**: Standard JWT authentication through user login
- **Routes**: `/api/v1/ccp/*` (without `/api` prefix)
- **Access**: Role-based access control (DOCTOR, NURSE, ADMIN, CCP_COORDINATOR)
- **Usage**: Include JWT token in Authorization header: `Authorization: Bearer <jwt-token>`

### External Authentication (CCP Token)
- **Purpose**: For external systems, integrations, and third-party applications
- **Method**: Static CCP token authentication
- **Routes**: `/api/v1/ccp/api/*` (with `/api` prefix)
- **Access**: Full CRUD access to CCP data
- **Setup**: Set `CCP_TOKEN` in environment variables
- **Usage**: Include token in request headers:
  - `x-ccp-token: your-token-here`
  - OR `Authorization: Bearer your-token-here`

## Base URLs

### External API (CCP Token)
```
/api/v1/ccp/api
```

### Internal API (JWT)
```
/api/v1/ccp
```

## Route Structure

```
/api/v1/ccp/
├── api/                    # External API (CCP Token)
│   ├── patients           # CRUD operations
│   ├── followups          # CRUD operations  
│   └── summary/           # Analytics endpoints
├── patients               # Internal API (JWT)
├── patient/:id/           # Internal patient operations
├── followups/             # Internal followup operations
├── analytics              # Internal analytics
└── import                 # Import functionality
```

## Key Features

- **Patient Management**: Complete CRUD operations for CCP patients
- **Follow-up Tracking**: Schedule, update, and complete follow-ups
- **Medical History**: Access to comprehensive patient medical records
- **Analytics**: Program metrics, completion rates, and statistics
- **Reporting**: Generate comprehensive patient reports
- **Import**: Bulk import CCP data from Excel files

## Access Control

### External Systems (CCP Token)
- **Access Level**: Full CRUD access to patients and follow-ups
- **Endpoints**: All `/api/v1/ccp/api/*` endpoints
- **Analytics**: Access to all summary and analytics endpoints
- **Rate Limiting**: 1000 requests per hour per token

### Internal Users (JWT)
- **Doctors**: Full access to CCP patients and follow-ups
- **Nurses**: Read/update access to follow-ups and patient data
- **CCP Coordinators**: Full access to all CCP functionality
- **Admins**: Complete access to all endpoints
- **Rate Limiting**: No limit for authenticated internal users

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data here
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `409` - Conflict (duplicate)
- `500` - Internal Server Error

## Environment Variables

```env
CCP_TOKEN=your-secure-token-here
```