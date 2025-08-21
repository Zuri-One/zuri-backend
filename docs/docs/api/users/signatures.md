# User Signatures API

The User Signatures API allows users to upload, manage, and retrieve their digital signatures stored in Google Cloud Storage.

## Base URL
```
/api/v1/users
```

## Authentication
All signature endpoints require authentication via Bearer token.

## Endpoints

### Create/Upload Signature
Upload a new signature for the authenticated user.

**Endpoint:** `POST /signature`

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Request Body:**
- `signature` (file): Image file (PNG, JPEG, GIF, SVG)
- Maximum file size: 5MB

**Response:**
```json
{
  "success": true,
  "message": "Signature uploaded successfully",
  "signature": {
    "url": "https://storage.googleapis.com/bucket/signatures/user-uuid.png",
    "uploadedAt": "2024-12-01T10:30:00.000Z"
  }
}
```

### Get User Signature
Retrieve the current user's signature.

**Endpoint:** `GET /signature`

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "signature": {
    "url": "https://storage.googleapis.com/bucket/signatures/user-uuid.png",
    "uploadedAt": "2024-12-01T10:30:00.000Z"
  }
}
```

### Update Signature
Update the current user's signature.

**Endpoint:** `PUT /signature`

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Request Body:**
- `signature` (file): New image file (PNG, JPEG, GIF, SVG)
- Maximum file size: 5MB

**Response:**
```json
{
  "success": true,
  "message": "Signature updated successfully",
  "signature": {
    "url": "https://storage.googleapis.com/bucket/signatures/user-uuid-new.png",
    "uploadedAt": "2024-12-01T11:00:00.000Z"
  }
}
```

### Delete User Signature (Admin Only)
Delete a user's signature. This endpoint is restricted to administrators.

**Endpoint:** `DELETE /:userId/signature`

**Headers:**
- `Authorization: Bearer <admin_token>`

**Parameters:**
- `userId` (path): UUID of the user whose signature to delete

**Response:**
```json
{
  "success": true,
  "message": "Signature deleted successfully"
}
```

## Error Responses

### File Validation Errors
```json
{
  "success": false,
  "message": "Invalid file type. Only PNG, JPEG, GIF, and SVG files are allowed."
}
```

```json
{
  "success": false,
  "message": "File size too large. Maximum size is 5MB."
}
```

### Not Found
```json
{
  "success": false,
  "message": "No signature found"
}
```

## File Requirements
- **Supported formats:** PNG, JPEG, JPG, GIF, SVG
- **Maximum file size:** 5MB
- **Storage:** Google Cloud Storage
- **Access:** Public read access for signature URLs

## Security Notes
- Signatures are stored with unique filenames to prevent conflicts
- Old signatures are automatically deleted when new ones are uploaded
- Only the signature owner can upload/update their signature
- Only administrators can delete signatures
- All signature URLs are publicly accessible once uploaded