# Patient Billing (Direct Pharmacy Billing) API

Status
- Import verification: PASSED (via [verify-omaera-import.js](verify-omaera-import.js))
- Catalog rows: See verification output (distinct itemCodes, min/max prices, null packSize count).
- Models used: [src/models/omaera-medication.model.js](src/models/omaera-medication.model.js), [src/models/pharmacy-bill.model.js](src/models/pharmacy-bill.model.js)

Overview
- Purpose: Support direct pharmacy billing by receptionists/pharmacists while keeping existing flows intact.
- Data source: Omaera price list PDF imported into OmaeraMedications.
- Core features:
  - Patient search by multiple identifiers.
  - Medication search with pagination and filters (code, description, tax code, pack size, price range).
  - Medication detail retrieval and price edit (with user/notes).
  - Bill creation for a patient from catalog items, default status PENDING.
  - Bill retrieval and status updates (PENDING → PAID/ESCALATED/DEFAULT).

Data Model References
- OmaeraMedication model: [src/models/omaera-medication.model.js](src/models/omaera-medication.model.js)
  - Fields: id, itemCode (unique), itemDescription, packSize (nullable), taxCode (decimal), originalPrice, currentPrice, isActive, lastUpdatedBy (User), notes, timestamps
- PharmacyBill model: [src/models/pharmacy-bill.model.js](src/models/pharmacy-bill.model.js)
  - Fields (typical): id, billNumber (unique), patientId (FK), items (JSON), subtotal, totalTax, totalAmount, status, paymentMethod, paymentReference, paidAt, createdBy, updatedBy, notes, timestamps

Setup and Import Scripts
- Create tables and import (script-based approach):
  - Setup (creates tables and imports): [setup-patient-billing.js](setup-patient-billing.js)
  - Import only (interactive confirmation): [import-omaera-medications.js](import-omaera-medications.js)
  - Verification (non-interactive): [verify-omaera-import.js](verify-omaera-import.js)
- Expected parsing from PDF:
  - Columns: Item Code, Item Description, Pack Size (nullable), Tax Code (decimal), Discounted Selling Price (TAX INCL).
  - Missing values handled as null (e.g., packSize).
  - currentPrice and originalPrice initially set to the same imported value.

Auth and Roles
- Requires Bearer JWT.
- Recommended authorizations:
  - PHARMACIST: Full access to meds search/details, price edits, bill create/update.
  - RECEPTIONIST: Patient/meds search, bill create, view bills; price edit for defaults (if permitted by policy).
  - ADMIN: Full access.

Base Path
- /api/v1/patient-billing

Endpoints

1) Search Patients
- GET /api/v1/patient-billing/patients/search
- Description: Search by common identifiers.
- Query parameters (any can be provided; search performs OR across the provided fields):
  - search: string (free text across name/phone/number/id/email)
  - name: string
  - phone: string
  - patientNumber: string
  - registrationNumber: string
  - nationalId: string
  - email: string
  - page: integer (default 1)
  - limit: integer (default 20)
- Response 200:
  {
    "success": true,
    "message": "Patients found",
    "data": {
      "page": 1,
      "limit": 20,
      "total": 3,
      "results": [
        {
          "id": "uuid",
          "patientNumber": "P000123",
          "name": "Jane Doe",
          "phone": "+2547...",
          "nationalId": "12345678",
          "email": "jane@example.com",
          "dob": "1985-01-01",
          "sex": "F"
        }
      ]
    }
  }

2) Search Medications (Catalog)
- GET /api/v1/patient-billing/medications/search
- Description: Paginated catalog search with filters.
- Query parameters:
  - search: string (applies to itemCode and itemDescription)
  - code: string (exact or partial itemCode)
  - description: string (partial description)
  - taxCode: number (e.g., 0, 0.16)
  - packSize: string (e.g., 10s, 500mg)
  - minPrice: number
  - maxPrice: number
  - isActive: boolean (default true)
  - page: integer (default 1)
  - limit: integer (default 20)
  - sortBy: string (itemCode|currentPrice|createdAt) default createdAt
  - sortOrder: string (asc|desc) default desc
- Response 200:
  {
    "success": true,
    "message": "Medications found",
    "data": {
      "page": 1,
      "limit": 20,
      "total": 3000,
      "results": [
        {
          "id": "uuid",
          "itemCode": "HARL414",
          "itemDescription": "Valsartan AB 160mg Tabs 28s",
          "packSize": "28s",
          "taxCode": 0.00,
          "currentPrice": 387.00,
          "isActive": true
        }
      ]
    }
  }

3) Get Medication by ID
- GET /api/v1/patient-billing/medications/:id
- Path params:
  - id: uuid (OmaeraMedications.id)
- Response 200:
  {
    "success": true,
    "message": "Medication details",
    "data": {
      "id": "uuid",
      "itemCode": "INJ213",
      "itemDescription": "Vancomycin IV 500mg",
      "packSize": "500mg",
      "taxCode": 0.00,
      "originalPrice": 320.00,
      "currentPrice": 320.00,
      "isActive": true,
      "lastUpdatedBy": "uuid-or-null",
      "notes": null,
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
  }

4) Update Medication Price
- PUT /api/v1/patient-billing/medications/:id/price
- Roles: PHARMACIST, ADMIN (RECEPTIONIST only if policy allows default edits).
- Body:
  {
    "currentPrice": 345.50,
    "isActive": true,
    "notes": "Adjusted per updated supplier list"
  }
- Response 200:
  {
    "success": true,
    "message": "Medication price updated",
    "data": {
      "id": "uuid",
      "itemCode": "INJ213",
      "currentPrice": 345.50,
      "isActive": true,
      "lastUpdatedBy": "uuid-from-auth",
      "notes": "Adjusted per updated supplier list",
      "updatedAt": "timestamp"
    }
  }

5) Create Pharmacy Bill
- POST /api/v1/patient-billing/bills
- Roles: PHARMACIST, RECEPTIONIST, ADMIN
- Body:
  {
    "patientId": "uuid",
    "items": [
      {
        "medicationId": "uuid",      // preferred
        "itemCode": "INJ213",        // fallback if id not provided
        "quantity": 2,
        "unitPriceOverride": 350.00, // optional; if omitted, uses currentPrice
        "notes": "..."
      }
    ],
    "notes": "Customer requested split pack pricing" // optional
  }
- Behavior:
  - Resolves each item to OmaeraMedication by medicationId or itemCode.
  - Computes line totals (quantity * unitPriceSelected).
  - Computes subtotal, tax breakdown (if taxCode used) and totalAmount.
  - Persists as PENDING with generated billNumber.
- Response 201:
  {
    "success": true,
    "message": "Pharmacy bill created",
    "data": {
      "id": "uuid",
      "billNumber": "PB-2025-000123",
      "patientId": "uuid",
      "items": [
        {
          "medicationId": "uuid",
          "itemCode": "INJ213",
          "description": "Vancomycin IV 500mg",
          "packSize": "500mg",
          "quantity": 2,
          "unitPrice": 350.00,
          "lineTotal": 700.00,
          "taxCode": 0.00
        }
      ],
      "subtotal": 700.00,
      "totalTax": 0.00,
      "totalAmount": 700.00,
      "status": "PENDING",
      "createdBy": "uuid",
      "createdAt": "timestamp"
    }
  }

6) List Bills
- GET /api/v1/patient-billing/bills
- Roles: PHARMACIST, RECEPTIONIST, ADMIN
- Query:
  - patientId: uuid
  - status: PENDING|PAID|ESCALATED|DEFAULT
  - startDate, endDate: ISO date (filters by createdAt)
  - page: integer (default 1)
  - limit: integer (default 20)
  - sortBy: createdAt|billNumber (default createdAt)
  - sortOrder: asc|desc (default desc)
- Response 200:
  {
    "success": true,
    "message": "Bills retrieved",
    "data": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "results": [
        {
          "id": "uuid",
          "billNumber": "PB-2025-000123",
          "patientId": "uuid",
          "subtotal": 700.00,
          "totalTax": 0.00,
          "totalAmount": 700.00,
          "status": "PENDING",
          "createdAt": "timestamp"
        }
      ]
    }
  }

7) Get Bill by ID
- GET /api/v1/patient-billing/bills/:id
- Roles: PHARMACIST, RECEPTIONIST, ADMIN
- Path params:
  - id: uuid
- Response 200:
  {
    "success": true,
    "message": "Bill details",
    "data": {
      "id": "uuid",
      "billNumber": "PB-2025-000123",
      "patientId": "uuid",
      "items": [ ... ],
      "subtotal": 700.00,
      "totalTax": 0.00,
      "totalAmount": 700.00,
      "status": "PENDING",
      "paymentMethod": null,
      "paymentReference": null,
      "paidAt": null,
      "createdBy": "uuid",
      "updatedBy": "uuid-or-null",
      "notes": null,
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
  }

8) Update Bill Status
- PUT /api/v1/patient-billing/bills/:id/status
- Roles: PHARMACIST, RECEPTIONIST, ADMIN
- Body:
  {
    "status": "PAID",                    // PENDING|PAID|ESCALATED|DEFAULT
    "paymentMethod": "CASH|MPESA|INSURANCE",
    "paymentReference": "TXN123456"      // optional
  }
- Behavior:
  - On PAID: sets paidAt to now, stores paymentMethod/paymentReference.
  - On ESCALATED/DEFAULT: clears payment fields, maintains audit through updatedBy/updatedAt.
- Response 200:
  {
    "success": true,
    "message": "Bill status updated",
    "data": {
      "id": "uuid",
      "billNumber": "PB-2025-000123",
      "status": "PAID",
      "paymentMethod": "MPESA",
      "paymentReference": "TXN123456",
      "paidAt": "timestamp",
      "updatedAt": "timestamp"
    }
  }

Error Format (Typical)
- 400 Bad Request (validation)
  {
    "success": false,
    "message": "Validation error",
    "errors": [{ "field": "currentPrice", "message": "Must be > 0" }]
  }
- 401 Unauthorized (no/invalid token)
- 403 Forbidden (insufficient role)
- 404 Not Found (missing resource)
- 409 Conflict (duplicate)
- 500 Internal Server Error

Import Verification Checklist
- Script: [verify-omaera-import.js](verify-omaera-import.js)
- Checks:
  - Total row count > 0
  - No duplicate itemCodes
  - min(currentPrice) > 0
  - Null counts for packSize/taxCode summarized
  - Prints 10 recent samples
- Output JSON example:
  {
    "ok": true,
    "checks": {
      "totalRows": 3000,
      "distinctItemCodes": 3000,
      "duplicateItemCodes": 0,
      "nullPackSize": 412,
      "nullTaxCode": 0,
      "minPrice": 100,
      "maxPrice": 986000,
      "sanity": {
        "hasRows": true,
        "noDuplicates": true,
        "hasPositivePrices": true
      }
    },
    "samples": [ ... ],
    "errors": []
  }

Operational Notes
- Missing pack sizes are allowed (null).
- currentPrice is editable by authorized users; originalPrice stores the initially imported value.
- lastUpdatedBy is populated from the authenticated user on price updates.
- Bill numbers should be generated predictably (e.g., PB-YYYY-####), unique.
- Items array on bills should store sufficient denormalized info (code, description, packSize, unitPrice, qty, taxCode) for immutable receipt history.

References
- Database/Sequelize Bootstrap: [src/models/index.js](src/models/index.js)
- DB Connection: [src/config/database.js](src/config/database.js)
- Medication Catalog Model: [src/models/omaera-medication.model.js](src/models/omaera-medication.model.js)
- Pharmacy Bill Model: [src/models/pharmacy-bill.model.js](src/models/pharmacy-bill.model.js)
- Import (interactive): [import-omaera-medications.js](import-omaera-medications.js)
- Setup (create tables + import): [setup-patient-billing.js](setup-patient-billing.js)
- Verification: [verify-omaera-import.js](verify-omaera-import.js)
---
Update: Direct Billing Enhancements (2025-09-11)

- Custom per-line pricing is supported when creating bills:
  - For medication items, pass unitPriceOverride to override the catalog price.
  - For non-medication service items (e.g., CONSULTATION, HOME_VISIT), pass type: "CUSTOM" with description and unitPrice.
- New endpoint to fetch all bills for a specific patient:
  - GET /api/v1/patient-billing/patients/:patientId/bills
- Bill status now supports DEFAULT in addition to PENDING, PAID, and ESCALATED.
- Receptionist role is authorized for all endpoints in this module, including editing medication prices.

Create Pharmacy Bill (updated)
- POST /api/v1/patient-billing/bills
- Body (supports medication-backed and custom service lines):
  {
    "patientId": "uuid",
    "items": [
      {
        "medicationId": "uuid",               // or itemCode: "INJ213"
        "quantity": 2,
        "unitPriceOverride": 350.00,          // optional override for medication
        "notes": "Dispensed partial pack"
      },
      {
        "type": "CUSTOM",
        "description": "CONSULTATION - General",
        "quantity": 1,
        "unitPrice": 1000.00,
        "taxRate": 0,                         // optional
        "itemCode": "CONSULT_GENERAL",        // optional tagging
        "notes": "Walk-in consult"
      },
      {
        "type": "CUSTOM",
        "description": "HOME VISIT - Within Nairobi",
        "quantity": 1,
        "unitPrice": 3000.00,
        "taxRate": 0
      }
    ],
    "notes": "Customer prefers cash"
  }

- Behavior:
  - Medication lines are resolved by medicationId (preferred) or itemCode, pulling itemDescription, packSize, and taxCode.
  - For each medication line, if unitPriceOverride is provided, it is used instead of catalog currentPrice.
  - Custom lines (type=CUSTOM) require description and unitPrice; taxRate defaults to 0 if omitted.
  - Totals are computed per line (subtotal, taxAmount, total) and aggregated to subtotal, totalTax, totalAmount.
  - Bill number format PBYYYYMMDD#### (daily sequence).
  - Status defaults to PENDING.

Get All Bills for Patient (new)
- GET /api/v1/patient-billing/patients/:patientId/bills
- Query:
  - status: PENDING|PAID|ESCALATED|DEFAULT
  - startDate, endDate: ISO date range
  - page, limit: pagination
- Response 200:
  {
    "success": true,
    "count": 1,
    "total": 5,
    "bills": [ ... ]
  }

Update Medication Price (roles updated)
- PUT /api/v1/patient-billing/medications/:id/price
- Roles: PHARMACIST, RECEPTIONIST, ADMIN
- Body:
  {
    "currentPrice": 345.50,
    "isActive": true,
    "notes": "Adjusted per updated supplier list"
  }

Update Bill Status (accepted values updated)
- PUT /api/v1/patient-billing/bills/:id/status
- Body:
  {
    "status": "DEFAULT",                 // PENDING|PAID|ESCALATED|DEFAULT
    "paymentMethod": "CASH|MPESA|INSURANCE",
    "paymentReference": "TXN123456"
  }
- Behavior:
  - On PAID, sets paidAt and retains payment fields.
  - On other statuses (including DEFAULT), clears payment fields.

Database and Scripts
- Model: PharmacyBill status now includes DEFAULT:
  - See [PharmacyBill.schema](src/models/pharmacy-bill.model.js:41)
- Setup script updated to allow DEFAULT in status CHECK:
  - See [setup-patient-billing.js](setup-patient-billing.js:66)
- Idempotent migration/guard script created:
  - [migrate-patient-billing-tables.js](migrate-patient-billing-tables.js)
    - Ensures table exists, items JSONB NOT NULL DEFAULT '[]', status CHECK includes DEFAULT, and helpful indexes.
  - Run:
    - node migrate-patient-billing-tables.js

Controller Changes (for reference)
- Medication search extended with filters and sorting:
  - [PatientBillingController.searchMedications()](src/controllers/patient-billing.controller.js:52)
- Bill creation accepts medication lines with unitPriceOverride and custom service lines:
  - [PatientBillingController.createPharmacyBill()](src/controllers/patient-billing.controller.js:179)
- Fetch all bills (with filters) and patient-specific bills:
  - [PatientBillingController.getPharmacyBills()](src/controllers/patient-billing.controller.js:300)
  - [PatientBillingController.getPatientBills()](src/controllers/patient-billing.controller.js:332)
- Bill status update supports DEFAULT and clears payment fields when not PAID:
  - [PatientBillingController.updateBillStatus()](src/controllers/patient-billing.controller.js:360)

Routes (roles adjusted to include RECEPTIONIST everywhere)
- Price update includes RECEPTIONIST:
  - [patient-billing.route.js](src/routes/v1/patient-billing.route.js:30)
- New route to get patient bills:
  - [patient-billing.route.js](src/routes/v1/patient-billing.route.js:43)
---