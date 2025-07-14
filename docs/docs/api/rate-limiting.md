# Rate Limiting

The ZuriHealth HMS API implements rate limiting to ensure fair usage and protect against abuse.

## Rate Limits

### General Endpoints
- **Limit**: 100 requests per minute
- **Window**: 60 seconds
- **Applies to**: Most API endpoints

### Authentication Endpoints
- **Limit**: 10 requests per minute
- **Window**: 60 seconds
- **Applies to**: Login, registration, password reset

### File Upload Endpoints
- **Limit**: 20 requests per minute
- **Window**: 60 seconds
- **Applies to**: Document uploads, image uploads

### Critical Operations
- **Limit**: 50 requests per minute
- **Window**: 60 seconds
- **Applies to**: Billing, payment processing

## Rate Limit Headers

Every API response includes rate limit information in the headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
X-RateLimit-Window: 60
```

### Header Descriptions
- `X-RateLimit-Limit`: Maximum requests allowed in the time window
- `X-RateLimit-Remaining`: Number of requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when the rate limit resets
- `X-RateLimit-Window`: Time window in seconds

## Rate Limit Exceeded Response

When rate limit is exceeded, the API returns a 429 status code:

```json
{
  "success": false,
  "message": "Rate limit exceeded",
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "details": "Too many requests. Please try again in 45 seconds",
    "retryAfter": 45
  }
}
```

## Rate Limiting by User Role

Different user roles have different rate limits:

### Admin Users
- **General**: 200 requests per minute
- **Authentication**: 20 requests per minute
- **File Upload**: 50 requests per minute

### Healthcare Staff (Doctors, Nurses)
- **General**: 150 requests per minute
- **Authentication**: 15 requests per minute
- **File Upload**: 30 requests per minute

### Patients
- **General**: 100 requests per minute
- **Authentication**: 10 requests per minute
- **File Upload**: 20 requests per minute

### Anonymous Users
- **General**: 20 requests per minute
- **Authentication**: 5 requests per minute
- **File Upload**: Not allowed

## Best Practices

### 1. Monitor Rate Limit Headers
Always check the rate limit headers in responses:

```javascript
function checkRateLimit(response) {
  const remaining = response.headers.get('X-RateLimit-Remaining');
  const reset = response.headers.get('X-RateLimit-Reset');
  
  if (remaining < 10) {
    console.warn(`Rate limit warning: ${remaining} requests remaining`);
  }
  
  return {
    remaining: parseInt(remaining),
    resetTime: new Date(parseInt(reset) * 1000)
  };
}
```

### 2. Implement Exponential Backoff
When rate limited, implement exponential backoff:

```javascript
async function apiCallWithBackoff(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
}
```

### 3. Batch Requests When Possible
Instead of multiple individual requests, use batch endpoints:

```javascript
// Instead of multiple individual requests
// GET /api/v1/patients/1
// GET /api/v1/patients/2
// GET /api/v1/patients/3

// Use batch endpoint
// POST /api/v1/patients/batch
// Body: { "ids": ["1", "2", "3"] }
```

### 4. Cache Responses
Implement client-side caching to reduce API calls:

```javascript
class APICache {
  constructor(ttl = 300000) { // 5 minutes default
    this.cache = new Map();
    this.ttl = ttl;
  }
  
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  set(key, data) {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.ttl
    });
  }
}
```

### 5. Use Webhooks for Real-time Updates
Instead of polling, use webhooks for real-time updates:

```javascript
// Instead of polling every 30 seconds
setInterval(() => {
  fetch('/api/v1/appointments/status');
}, 30000);

// Use webhooks
app.post('/webhook/appointment-status', (req, res) => {
  // Handle appointment status update
  updateAppointmentStatus(req.body);
  res.status(200).send('OK');
});
```

## Rate Limit Bypass

### Whitelisted IPs
Certain IP addresses may be whitelisted for higher rate limits. Contact support for whitelist requests.

### API Keys
Enterprise customers may receive API keys with higher rate limits.

## Monitoring and Alerts

### Client-Side Monitoring
Implement monitoring to track rate limit usage:

```javascript
class RateLimitMonitor {
  constructor() {
    this.stats = {
      requests: 0,
      rateLimited: 0,
      lastReset: Date.now()
    };
  }
  
  recordRequest(response) {
    this.stats.requests++;
    
    if (response.status === 429) {
      this.stats.rateLimited++;
      console.warn('Rate limit exceeded');
    }
    
    const remaining = response.headers.get('X-RateLimit-Remaining');
    if (remaining < 10) {
      console.warn(`Low rate limit: ${remaining} remaining`);
    }
  }
  
  getStats() {
    return this.stats;
  }
}
```

### Server-Side Monitoring
The API provides endpoints to monitor rate limit usage:

```http
GET /api/v1/admin/rate-limits/stats
Authorization: Bearer <admin_token>
```

Response:
```json
{
  "success": true,
  "data": {
    "totalRequests": 1500,
    "rateLimitedRequests": 25,
    "topUsers": [
      {
        "userId": "user123",
        "requests": 150,
        "rateLimited": 5
      }
    ]
  }
}
```

## Troubleshooting

### Common Issues

1. **Sudden Rate Limit Hits**
   - Check for infinite loops in your code
   - Verify you're not making unnecessary duplicate requests
   - Implement proper error handling

2. **Inconsistent Rate Limits**
   - Rate limits are per-user, not per-session
   - Multiple sessions for the same user share the rate limit

3. **Rate Limit Not Resetting**
   - Rate limits use sliding windows
   - Check system time synchronization

### Getting Help

If you're experiencing rate limiting issues:
1. Check your implementation against best practices
2. Review the rate limit headers in your responses
3. Contact support with your user ID and timestamp of issues