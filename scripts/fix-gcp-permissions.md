# Fix GCP Storage Permissions

## Issue
Service account `hms-receipt-bucket@zuri-health-450111.iam.gserviceaccount.com` lacks permissions for bucket `hms-receipt-bucket`.

## Quick Fix (via Google Cloud Console)

### Option 1: Grant IAM Role to Service Account
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **IAM & Admin > IAM**
3. Find your service account: `hms-receipt-bucket@zuri-health-450111.iam.gserviceaccount.com`
4. Click **Edit** (pencil icon)
5. Click **Add Another Role**
6. Select: **Storage Admin** or **Storage Object Admin**
7. Click **Save**

### Option 2: Grant Permissions via Bucket
1. Go to **Cloud Storage > Buckets**
2. Click on bucket: `hms-receipt-bucket`
3. Go to **Permissions** tab
4. Click **Grant Access**
5. Add principal: `hms-receipt-bucket@zuri-health-450111.iam.gserviceaccount.com`
6. Select role: **Storage Object Admin**
7. Click **Save**

### Option 3: Command Line (if you have gcloud CLI)
```bash
# Grant Storage Admin role
gcloud projects add-iam-policy-binding zuri-health-450111 \
    --member="serviceAccount:hms-receipt-bucket@zuri-health-450111.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

# Or grant bucket-specific permissions
gsutil iam ch serviceAccount:hms-receipt-bucket@zuri-health-450111.iam.gserviceaccount.com:objectAdmin gs://hms-receipt-bucket
```

## Test After Fix
Run this to verify permissions:
```bash
node scripts/test-gcp-config.js
```

## Required Permissions for Signatures
- `storage.objects.create` - Upload files
- `storage.objects.delete` - Delete old signatures  
- `storage.objects.get` - Read file metadata
- `storage.buckets.get` - Access bucket info

**Storage Object Admin** role includes all these permissions.