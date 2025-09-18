# Patient Update API

Endpoint to update a patient's record, including personal information, contact details, identification, next of kin, medical history, insurance info, registration notes, and payment scheme.

This endpoint is accessible to roles:
- ADMIN
- DOCTOR
- RECEPTIONIST

Server behavior
- Phone normalization: telephone1 and telephone2 are normalized to E.164 (+254...) on save.
- Required: telephone1 must not be empty.
- JSON fields (medicalHistory, insuranceInfo, nextOfKin) are merged to preserve existing keys when partial updates are sent.
- Email uniqueness: Patient email remains unique; updates that violate uniqueness will fail with a database constraint error.

API Summary
- Method: PATCH
- URL: /api/v1/patient/:id
- Auth: Bearer token (JWT)
- Roles: ADMIN, DOCTOR, RECEPTIONIST
- Content-Type: application/json

Request Parameters
- Path params:
  - id (string, UUID): Patient ID to update

Body Schema (partial updates allowed)
{
  "surname": "string",
  "otherNames": "string",
  "email": "string (email format)",
  "dateOfBirth": "YYYY-MM-DD",
  "sex": "MALE | FEMALE | OTHER",
  "telephone1": "string (required if provided; normalized to +254...)",
  "telephone2": "string",
  "postalAddress": "string",
  "postalCode": "string",
  "occupation": "string",
  "idType": "NATIONAL_ID | BIRTH_CERTIFICATE | PASSPORT | DRIVING_LICENSE | STUDENT_ID | MILITARY_ID | ALIEN_ID",
  "idNumber": "string",
  "nationality": "string",
  "town": "string",
  "residence": "string",

  "nextOfKin": {
    "name": "string",
    "relationship": "string",
    "contact": "string (phone)",
    // alias "phone" accepted and mapped to "contact"
  },

  "medicalHistory": {
    "existingConditions": ["string", "..."],
    "allergies": ["string", "..."]
  },

  "insuranceInfo": {
    "scheme": "string",
    "provider": "string",
    "membershipNumber": "string",
    "principalMember": "string"
  },

  "registrationNotes": "string",

  "paymentScheme": {
    "type": "CASH | INSURANCE",
    "provider": "string (required if type != CASH)",
    "policyNumber": "string",
    "memberNumber": "string" // alias "membershipNumber" also accepted
  }
}

Validation Rules
- telephone1: cannot be set to empty/null; normalized to E.164 format.
- nextOfKin: if any of name/relationship/contact is provided, all three are required; phone alias accepted and stored as contact.
- paymentScheme: type is required; if type != CASH, provider is required. memberNumber is optional by design.
- sex and email are uppercased/lowercased respectively by server prior to save (sex uppercased, email lowercased).
- JSON fields are merged into existing values rather than overwritten completely.

Responses
- 200 OK
  {
    "success": true,
    "message": "Patient details updated successfully",
    "patient": { ...safePatient }
  }

- 400 Bad Request
  - Missing required fields in partial updates (e.g., telephone1 set to empty)
  - Invalid nextOfKin partial (if one core field provided, all required)
  - Invalid or incomplete paymentScheme

- 401 Unauthorized
  - Missing or invalid bearer token

- 403 Forbidden
  - Authenticated but role not in [ADMIN, DOCTOR, RECEPTIONIST]

- 404 Not Found
  - Patient id not found

Example cURL
# Update personal and contact info
curl -X PATCH \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "surname": "Doe",
    "otherNames": "Jane A.",
    "telephone1": "0712345678",
    "telephone2": "+254700000000",
    "residence": "Kilimani",
    "town": "Nairobi",
    "email": "JANE.DOE@example.com"
  }' \
  https://<backend>/api/v1/patient/1b2d0c2c-4f9c-4fa9-9c8e-123456789abc

# Update next of kin (partial update allowed, merged server-side)
curl -X PATCH \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "nextOfKin": {
      "name": "John Doe",
      "relationship": "Husband",
      "contact": "0722000111"
    }
  }' \
  https://<backend>/api/v1/patient/1b2d0c2c-4f9c-4fa9-9c8e-123456789abc

# Update payment scheme to insurance
curl -X PATCH \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentScheme": {
      "type": "INSURANCE",
      "provider": "Britam",
      "policyNumber": "POL-123-456",
      "memberNumber": "MBR-789"
    }
  }' \
  https://<backend>/api/v1/patient/1b2d0c2c-4f9c-4fa9-9c8e-123456789abc

Notes for Frontend
- You can send only fields that need to be updated; others will remain unchanged.
- For JSON fields (nextOfKin, medicalHistory, insuranceInfo) you may send only the keys you want to change; the server merges with existing record.
- If you need to clear an optional field, send it as null (where allowed). Required fields like telephone1 cannot be cleared.
- The server normalizes phone numbers to E.164 (+254...) for telephone1 and telephone2.
- Errors will detail the first validation encountered; adjust and retry.

Implementation Pointers (Backend References)
- Route: PATCH /api/v1/patient/:id is added in src/routes/v1/patient.route.js using authenticate and role-based authorization.
- Controller handler: updatePatientDetails merges and validates the above fields and saves on the Patient instance to trigger model hooks (including phone normalization).
