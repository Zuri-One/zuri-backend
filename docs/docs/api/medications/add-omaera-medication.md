# Add or Update Omaera Medication (Patient Billing Catalog)

Endpoint to create or update entries in the Omaera medication catalog used by Patient Billing. This enables receptionists, doctors, pharmacists, and lab staff to maintain the catalog without running batch imports.

- Controller implementation: [src/controllers/patient-billing.controller.js](src/controllers/patient-billing.controller.js)
- Route definition: [src/routes/v1/patient-billing.route.js](src/routes/v1/patient-billing.route.js)
- Target model/table: [src/models/omaera-medication.model.js](src/models/omaera-medication.model.js)

## Summary

- Method: POST
- Path: /api/v1/patient-billing/medications
- Auth: Bearer JWT (staff)
- Roles allowed: PHARMACIST, RECEPTIONIST, DOCTOR, LAB_TECHNICIAN, ADMIN
- Behavior: Upsert by itemCode
  - Create when itemCode does not exist
  - Update when itemCode already exists

## Authentication & Authorization

- Requires Authorization header: Bearer <JWT>
- User must be active with role in: PHARMACIST, RECEPTIONIST, DOCTOR, LAB_TECHNICIAN, ADMIN
- Enforced by the router middleware in [src/routes/v1/patient-billing.route.js](src/routes/v1/patient-billing.route.js) and the auth middleware [src/middleware/auth.middleware.js](src/middleware/auth.middleware.js)

## Request

Content-Type: application/json

Fields:
- itemCode (string, required)
  - Unique code for the item; acts as the upsert key
- itemDescription (string, required)
- packSize (string, optional)
  - Free text like "30's 30's", "100 ml 100 ml", etc.
- taxCode (number, optional; default 0.00)
  - VAT rate as a decimal fraction (e.g., 0.00, 0.16)
- currentPrice (number, required)
  - Positive numeric; commas are tolerated and normalized
- originalPrice (number, optional)
  - Positive numeric; if omitted, defaults to currentPrice
- notes (string, optional)
- isActive (boolean, optional; default true)

Validation/Normalization:
- Numeric fields accept plain numbers or strings with comma separators (e.g., "1,590.9")
- currentPrice and originalPrice must be positive after normalization
- itemCode and itemDescription are trimmed; empty strings are rejected

Example (Create):
```json
{
  "itemCode": "MCLB063",
  "itemDescription": "Olmat 40 mg Tabs",
  "packSize": "30's 30's",
  "taxCode": 0.0,
  "currentPrice": 1778.1,
  "originalPrice": 1778.1,
  "notes": "Added via endpoint",
  "isActive": true
}
```

Example (Update same item with new price):
```json
{
  "itemCode": "MCLB063",
  "itemDescription": "Olmat 40 mg Tabs",
  "packSize": "30's 30's",
  "taxCode": 0.0,
  "currentPrice": 1850.5,
  "originalPrice": 1850.5,
  "notes": "Price updated",
  "isActive": true
}
```

## Responses

Success (Created):
- Status: 201
- Body:
```json
{
  "success": true,
  "action": "created",
  "medication": {
    "id": "uuid",
    "itemCode": "MCLB063",
    "itemDescription": "Olmat 40 mg Tabs",
    "packSize": "30's 30's",
    "taxCode": "0.00",
    "originalPrice": "1778.10",
    "currentPrice": "1778.10",
    "isActive": true,
    "lastUpdatedBy": "user-id-or-null",
    "notes": "Added via endpoint",
    "createdAt": "2025-09-18T...",
    "updatedAt": "2025-09-18T..."
  }
}
```

Success (Updated):
- Status: 200
- Body:
```json
{
  "success": true,
  "action": "updated",
  "medication": {
    "id": "uuid",
    "itemCode": "MCLB063",
    "itemDescription": "Olmat 40 mg Tabs",
    "packSize": "30's 30's",
    "taxCode": "0.00",
    "originalPrice": "1850.50",
    "currentPrice": "1850.50",
    "isActive": true,
    "lastUpdatedBy": "user-id-or-null",
    "notes": "Price updated",
    "createdAt": "2025-09-18T...",
    "updatedAt": "2025-09-18T..."
  }
}
```

Validation Error:
- Status: 400
- Body:
```json
{ "success": false, "message": "currentPrice must be a positive number" }
```

Auth Error (missing/invalid token):
- Status: 401
- Body:
```json
{ "success": false, "message": "Authentication required" }
```

Authorization Error (insufficient role):
- Status: 403
- Body:
```json
{ "success": false, "message": "Unauthorized access" }
```

Server Error:
- Status: 500
- Body:
```json
{ "success": false, "message": "OmaeraMedication model not initialized" }
```

## cURL Examples

Create:
```bash
curl -X POST \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "itemCode": "MCLB063",
    "itemDescription": "Olmat 40 mg Tabs",
    "packSize": "30'\''s 30'\''s",
    "taxCode": 0.00,
    "currentPrice": 1778.1,
    "originalPrice": 1778.1,
    "notes": "Added via endpoint",
    "isActive": true
  }' \
  http://localhost:10000/api/v1/patient-billing/medications
```

Update:
```bash
curl -X POST \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "itemCode": "MCLB063",
    "itemDescription": "Olmat 40 mg Tabs",
    "packSize": "30'\''s 30'\''s",
    "taxCode": 0.00,
    "currentPrice": 1850.5,
    "originalPrice": 1850.5,
    "notes": "Price updated",
    "isActive": true
  }' \
  http://localhost:10000/api/v1/patient-billing/medications
```

## Notes & Best Practices

- itemCode must remain unique; this endpoint upserts on itemCode.
- If originalPrice is omitted, it defaults to currentPrice (both are stored).
- Numeric fields are cleaned from commas; "1,590.9" is accepted and stored as 1590.9.
- packSize is free text and not validated to a strict schema.
- lastUpdatedBy is set to the authenticated user ID when present.
- This catalog is used by Patient Billing flows (medication search, bill creation); frontend response shapes for these flows remain unchanged.

## Related Endpoints

- Search medications (catalog): GET /api/v1/patient-billing/medications/search
- Get medication by ID: GET /api/v1/patient-billing/medications/:id
- Update medication price: PUT /api/v1/patient-billing/medications/:id/price
- Create bill: POST /api/v1/patient-billing/bills

Route source: [src/routes/v1/patient-billing.route.js](src/routes/v1/patient-billing.route.js)
Controller source: [src/controllers/patient-billing.controller.js](src/controllers/patient-billing.controller.js)
Model source: [src/models/omaera-medication.model.js](src/models/omaera-medication.model.js)