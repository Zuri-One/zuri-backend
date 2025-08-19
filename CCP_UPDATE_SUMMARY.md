# CCP API Update Summary

## What Was Updated

### 1. Routes Consolidation
- **Merged** `ccp.route.js` and `ccp.routes.js` into a single `ccp.routes.js` file
- **Removed** duplicate route files (`ccp.route.js`, `ccpImport.routes.js`)
- **Updated** main routes index to use the consolidated file

### 2. Dual Authentication System
- **External API Routes**: `/api/v1/ccp/api/*` - Uses CCP token authentication
- **Internal API Routes**: `/api/v1/ccp/*` - Uses JWT authentication
- **Import Routes**: `/api/v1/ccp/import` - No authentication required

### 3. Controller Architecture
- **Preserved** all existing controller methods for backwards compatibility
- **Added** new API methods for external systems
- **Maintained** existing frontend functionality without changes

### 4. Documentation Updates
- **Updated** `CCP_API_README.md` with correct endpoint paths
- **Added** dual authentication explanation
- **Included** internal API endpoint documentation
- **Updated** usage examples with correct URLs

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

## Authentication Methods

### External Systems (CCP Token)
```bash
# Header option 1
curl -H "x-ccp-token: your-token" "http://localhost:3000/api/v1/ccp/api/patients"

# Header option 2  
curl -H "Authorization: Bearer your-token" "http://localhost:3000/api/v1/ccp/api/patients"
```

### Internal Users (JWT)
```bash
curl -H "Authorization: Bearer jwt-token" "http://localhost:3000/api/v1/ccp/patients"
```

## Files Modified

1. **`/src/routes/v1/ccp.routes.js`** - Consolidated all CCP routes
2. **`/src/routes/v1/index.js`** - Updated to use consolidated routes
3. **`/src/controllers/ccp.controller.js`** - Enhanced with new API methods
4. **`CCP_API_README.md`** - Updated documentation
5. **`.env`** - Added CCP_TOKEN environment variable

## Files Removed

1. **`/src/routes/v1/ccp.route.js`** - Merged into ccp.routes.js
2. **`/src/routes/v1/ccpImport.routes.js`** - Merged into ccp.routes.js

## Backwards Compatibility

✅ **All existing frontend functionality preserved**
✅ **All existing controller methods maintained**
✅ **All existing internal routes still work**
✅ **No breaking changes to current implementation**

## New Capabilities

✅ **External API access via CCP token**
✅ **Comprehensive patient and followup CRUD operations**
✅ **Analytics and summary endpoints for external systems**
✅ **Dual authentication system**
✅ **Rate limiting for external API calls**

## Environment Variables Required

```env
CCP_TOKEN=your-secure-ccp-token-here
```

## Testing

To test the new API endpoints:

1. **Set CCP_TOKEN** in your `.env` file
2. **Start the server**: `npm run dev`
3. **Test external API**: Use CCP token with `/api/v1/ccp/api/*` endpoints
4. **Test internal API**: Use JWT token with `/api/v1/ccp/*` endpoints

## Next Steps

1. **Deploy** the updated code to your server
2. **Set** the CCP_TOKEN environment variable in production
3. **Test** both authentication methods
4. **Share** the API documentation with external systems
5. **Monitor** API usage and rate limiting

The CCP API is now ready for both internal hospital use and external system integrations!