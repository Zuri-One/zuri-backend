# Medication Management API

Complete guide to managing medications and pharmacy operations in the ZuriHealth HMS system.

## Base Endpoint
```
/api/v1/medications/
```

## Overview

The medication management system handles:
- Medication inventory management
- Stock tracking and alerts
- Medication search and lookup
- Pharmacy operations
- Low stock monitoring

## Authentication & Authorization

All medication endpoints require authentication via JWT token:

```http
Authorization: Bearer <jwt_token>
```

### Role-Based Access

- **PHARMACIST**: Full access to medication management
- **DOCTOR**: View medications, search for prescribing
- **NURSE**: View medications for patient care
- **ADMIN**: Full access to all operations
- **Other Roles**: Limited read access

## Core Endpoints

### Medication Management
- `GET /api/v1/medications` - Get all medications
- `GET /api/v1/medications/{id}` - Get specific medication
- `GET /api/v1/medications/search` - Search medications
- `POST /api/v1/medications` - Create new medication (PHARMACY role)
- `PATCH /api/v1/medications/{id}` - Update medication (PHARMACY role)

### Stock Management
- `GET /api/v1/medications/low-stock` - Get low stock medications
- `PATCH /api/v1/medications/{id}/stock` - Update medication stock (PHARMACY role)

## Get All Medications

**Endpoint**: `GET /api/v1/medications`

**Authentication**: Required

### Query Parameters
- `category`: Filter by medication category
- `type`: Filter by medication type (tablet, capsule, syrup, injection)
- `inStock`: Filter by stock availability (true/false)
- `search`: Search by name or generic name
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

### Example Request
```http
GET /api/v1/medications?category=cardiovascular&type=tablet&inStock=true&page=1&limit=10
```

### Response
```json
{
  "success": true,
  "data": {
    "medications": [
      {
        "id": "med-uuid-1",
        "name": "Amlodipine",
        "genericName": "Amlodipine Besylate",
        "brandName": "Norvasc",
        "category": "Cardiovascular",
        "type": "tablet",
        "strength": "5mg",
        "dosageForm": "Tablet",
        "manufacturer": "Pfizer",
        "description": "Calcium channel blocker used to treat high blood pressure",
        "stock": {
          "currentStock": 500,
          "minimumStock": 50,
          "unitCost": 2.50,
          "sellingPrice": 5.00
        },
        "expiryDate": "2025-12-31",
        "isActive": true,
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "pages": 1
    }
  }
}
```

## Search Medications

**Endpoint**: `GET /api/v1/medications/search`

**Authentication**: Required

### Query Parameters
- `q`: Search query (name, generic name, brand name)
- `category`: Filter by category
- `type`: Filter by type
- `limit`: Number of results (default: 10)

### Example Request
```http
GET /api/v1/medications/search?q=blood pressure&category=cardiovascular&limit=5
```

### Response
```json
{
  "success": true,
  "data": {
    "medications": [
      {
        "id": "med-uuid-1",
        "name": "Amlodipine",
        "genericName": "Amlodipine Besylate",
        "brandName": "Norvasc",
        "strength": "5mg",
        "type": "tablet",
        "category": "Cardiovascular",
        "stock": {
          "currentStock": 500,
          "inStock": true
        },
        "price": 5.00
      }
    ],
    "searchInfo": {
      "query": "blood pressure",
      "totalResults": 1,
      "searchTime": 0.045
    }
  }
}
```

## Get Low Stock Medications

**Endpoint**: `GET /api/v1/medications/low-stock`

**Authentication**: Required

### Response
```json
{
  "success": true,
  "data": {
    "lowStockMedications": [
      {
        "id": "med-uuid-1",
        "name": "Insulin Glargine",
        "category": "Diabetes",
        "stock": {
          "currentStock": 15,
          "minimumStock": 20,
          "reorderLevel": 50,
          "stockPercentage": 7.5
        },
        "priority": "critical"
      }
    ],
    "summary": {
      "totalLowStock": 1,
      "criticalStock": 1
    }
  }
}
```

## Create Medication

**Endpoint**: `POST /api/v1/medications`

**Authentication**: Required (PHARMACY role)

### Request Body
```json
{
  "name": "Metformin",
  "genericName": "Metformin Hydrochloride",
  "brandName": "Glucophage",
  "category": "Diabetes",
  "type": "tablet",
  "strength": "500mg",
  "manufacturer": "Bristol-Myers Squibb",
  "description": "Biguanide antidiabetic medication",
  "stock": {
    "initialStock": 1000,
    "minimumStock": 100,
    "unitCost": 0.50,
    "sellingPrice": 1.00
  }
}
```

### Response
```json
{
  "success": true,
  "message": "Medication created successfully",
  "data": {
    "medication": {
      "id": "med-uuid-new",
      "name": "Metformin",
      "genericName": "Metformin Hydrochloride",
      "category": "Diabetes",
      "stock": {
        "currentStock": 1000,
        "minimumStock": 100
      },
      "createdAt": "2024-01-20T15:30:00Z"
    }
  }
}
```

## Update Stock

**Endpoint**: `PATCH /api/v1/medications/{id}/stock`

**Authentication**: Required (PHARMACY role)

### Request Body
```json
{
  "quantity": 500,
  "type": "received",
  "reason": "Stock replenishment",
  "reference": "PO000789"
}
```

### Stock Movement Types
- `received`: Stock received from supplier
- `dispensed`: Stock dispensed to patient
- `returned`: Stock returned from patient
- `expired`: Stock removed due to expiry
- `adjustment`: Stock adjustment

### Response
```json
{
  "success": true,
  "message": "Stock updated successfully",
  "data": {
    "medication": {
      "id": "med-uuid",
      "name": "Metformin",
      "stock": {
        "previousStock": 200,
        "currentStock": 700,
        "stockChange": 500
      }
    }
  }
}
```

## Integration Examples

### JavaScript - Medication Search
```javascript
class MedicationService {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
  }
  
  async searchMedications(query, filters = {}) {
    const params = new URLSearchParams({ q: query, ...filters });
    const response = await fetch(`${this.baseURL}/medications/search?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });
    
    return response.json();
  }
  
  async getLowStockMedications() {
    const response = await fetch(`${this.baseURL}/medications/low-stock`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });
    
    return response.json();
  }
  
  async updateStock(medicationId, stockData) {
    const response = await fetch(`${this.baseURL}/medications/${medicationId}/stock`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(stockData)
    });
    
    return response.json();
  }
}

// Usage
const medicationService = new MedicationService(
  'https://your-server.com/api/v1',
  'your-jwt-token'
);

// Search medications
const results = await medicationService.searchMedications('paracetamol');
console.log('Found:', results.data.medications.length);

// Check low stock
const lowStock = await medicationService.getLowStockMedications();
console.log('Low stock items:', lowStock.data.totalLowStock);
```

## Error Responses

### Medication Not Found
```json
{
  "success": false,
  "message": "Medication not found",
  "error": {
    "code": "MEDICATION_NOT_FOUND"
  }
}
```

### Insufficient Stock
```json
{
  "success": false,
  "message": "Insufficient stock for this operation",
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "currentStock": 50,
    "requestedQuantity": 100
  }
}
```

### Unauthorized Access
```json
{
  "success": false,
  "message": "Insufficient permissions for this operation",
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS"
  }
}
```