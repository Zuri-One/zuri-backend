# Base URL & Environment

## Production Environment

**Base URL**: `https://your-server.com/api/v1`

All API requests should be made to this base URL with the appropriate endpoint path appended.

## Request Format

### Headers
All requests must include the following headers:

```http
Content-Type: application/json
Authorization: Bearer <your_jwt_token>
Accept: application/json
```

### Example Request
```bash
curl -X GET \
  https://your-server.com/api/v1/patients/all \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Content-Type: application/json'
```

## Environment Configuration

### Development
- **URL**: `http://localhost:3000/api/v1`
- **Database**: PostgreSQL (Development)
- **Features**: Debug logging, detailed error messages

### Production
- **URL**: `https://your-server.com/api/v1`
- **Database**: PostgreSQL (Production)
- **Features**: Optimized performance, security headers

## SSL/TLS

All production API calls must use HTTPS. HTTP requests will be automatically redirected to HTTPS.

## CORS Policy

The API supports Cross-Origin Resource Sharing (CORS) for web applications. Allowed origins are configured based on your deployment environment.

## API Versioning

The current API version is `v1`. Future versions will be available at:
- `v2`: `/api/v2/`
- `v3`: `/api/v3/`

Version `v1` will be maintained for backward compatibility.