# CCP Month-over-Month Import Guide

## 🎯 How It Works

The system tracks CCP patients across multiple months for different insurers:
- **Same patients** across months (MARCH-CIC, MAY-CIC, etc.)
- **No duplicates** - finds existing patients by ID or name
- **Monthly tracking** - creates separate CCP records per month
- **Insurer detection** - automatically extracts from sheet names

## 📋 Step-by-Step Process

### 1. Prepare Your Excel File
Structure your sheets like:
```
MARCH - CIC
APRIL - CIC  
MAY - CIC
MARCH - BRITAM
APRIL - BRITAM
```

### 2. Start the Server
```bash
npm run dev
```

### 3. Access Import Interface
Open: `http://localhost:3000/ccp-import.html`

### 4. Upload & Import
1. **Upload Excel file**
2. **Select doctor** (Georgina, Antony, or Esther)
3. **Preview data** - check detected insurers
4. **Import**

## 🔍 What Happens During Import

### Patient Processing:
- **Existing patient found**: Updates info, creates new monthly CCP record
- **New patient**: Creates patient + CCP record
- **Same patient, different month**: New CCP record for that month

### Insurer Detection:
- From sheet name: `MARCH - CIC` → Insurer: `CIC`
- Supported: CIC, BRITAM, MADISON, NHIF, AAR, JUBILEE, HERITAGE, RESOLUTION

### Monthly Tracking:
- Each sheet creates CCP records for that specific month/year
- Patient can have multiple CCP records (one per month)
- No duplicate patients, only duplicate monthly records

## 📊 Example Scenario

**File: `CCP-2025.xlsx`**
```
Sheet: MARCH - CIC (10 patients)
Sheet: APRIL - CIC (10 same patients)
Sheet: MAY - CIC (8 patients, 2 new)
```

**Result:**
- 12 unique patients created
- 28 CCP records created (10+10+8)
- All linked to CIC insurer
- Monthly progression tracked

## 🚀 Bulk Import (Alternative)

For large files:
```bash
node scripts/ccp-bulk-import.js "./your-file.xlsx" "georgina"
```

## ✅ Validation

Only requires:
- Patient ID
- Patient Name  
- Date Enrolled
- Doctor selection

Everything else stored as-is or null.

## 📈 Tracking Results

After import, you can:
- View patient progression across months
- Track insurer-specific data
- Monitor followup completion rates
- Generate monthly reports

The system maintains complete month-over-month tracking while preventing patient duplication.