# CCP Data Import System

A comprehensive system for importing Chronic Care Program (CCP) patient data from Excel files into the Zuri Health Management System.

## 🚀 Quick Setup

Run the complete setup with one command:

```bash
node scripts/setup-ccp-system.js
```

This will:
- Create the three CCP doctors (Georgina, Antony, Esther)
- Set up the import system
- Display next steps

## 👨⚕️ CCP Doctors

The system creates three specialized CCP doctors:

| Doctor | Email | Specialization |
|--------|-------|----------------|
| Dr. Georgina Nyaka | georgina.nyaka@zurihealth.com | Chronic Care, Internal Medicine |
| Dr. Antony Mwangi | antony.mwangi@zurihealth.com | Chronic Care, Family Medicine |
| Dr. Esther Wanjiku | esther.wanjiku@zurihealth.com | Chronic Care, Preventive Medicine |

**Default Password:** `Doctor@123`

## 📊 Import Methods

### 1. Web Interface (Recommended)

1. Start the server: `npm run dev`
2. Open: `http://localhost:3000/ccp-import.html`
3. Upload Excel file
4. Select attending doctor
5. Preview data
6. Import

### 2. Bulk Command Line Import

For large files or automated imports:

```bash
node scripts/ccp-bulk-import.js <excel-file-path> <doctor-name>
```

Examples:
```bash
node scripts/ccp-bulk-import.js "./data.xlsx" "georgina"
node scripts/ccp-bulk-import.js "./january-data.xlsx" "antony"
node scripts/ccp-bulk-import.js "./february-data.xlsx" "esther"
```

### 3. API Endpoint

```http
POST /api/v1/ccp/import
Content-Type: application/json
Authorization: Bearer <token>

{
  "data": { ... },
  "attendingDoctor": "georgina"
}
```

## 📋 Excel File Structure

The system expects Excel files with the following structure:

### Required Columns (by position):
- **Column C (2)**: CCP - ENROLLMENT (Patient ID)
- **Column D (3)**: ENROLLMENT STATUS
- **Column E (4)**: DATE ENROLLED
- **Column F (5)**: PATIENT'S NAME
- **Column G (6)**: GENDER
- **Column H (7)**: AGE(YRS)
- **Column I (8)**: CONTACT
- **Column J (9)**: NEXT OF KIN CONTACT
- **Column K (10)**: LOCATION
- **Column L (11)**: INSURANCE SCHEME

### Optional Columns:
- **Column M (12)**: KNOWN UNDERLYING CONDITION
- **Column N (13)**: LAB TEST DONE
- **Column O (14)**: DATE LAB TEST DONE
- **Column R (17)**: FOLLOW UP FREQUENCY
- **Column S (18)**: PREVIOUS FOLLOW-UP FEEDBACK
- **Column T (19)**: DUE FOLLOW UP DATE
- **Column U (20)**: FOLLOW UP STATUS
- **Column V (21)**: FOLLOW-UP FEEDBACK
- **Column W (22)**: MEDICATION PRESCRIBED
- **Column X (23)**: NEXT FOLLOW-UP DATE
- **Column AE (31)**: DISPACHMENT STATUS
- **Column AH (34)**: REFILL FREQUENCY
- **Column AI (35)**: REFILL DATE

### Sheet Naming Convention

Sheet names should include:
- **Month**: JANUARY, FEBRUARY, MARCH, etc.
- **Year**: 2024, 2025, etc.
- **Insurance Company**: The sheet name maps to the insurance provider

**Examples:**
- `JANUARY 2025 - NHIF`
- `FEBRUARY 2025 - MADISON`
- `MARCH 2025 - CIC`

### Excluded Sheets

The system automatically skips sheets containing:
- `TASK`
- `DISCONTINUATION`
- `DISCONTINUED`


## 🔧 Data Processing

### Patient Creation/Update

The system will:
1. **Search for existing patients** by:
   - Patient Number (CCP ID)
   - Name + Contact combination
2. **Create new patients** if not found
3. **Update existing patients** with new information
4. **Generate unique patient numbers** (ZH000001, ZH000002, etc.)

### CCP Record Management

For each patient, the system creates/updates:
- Monthly followup records
- Medication tracking
- Lab test history
- Followup status and feedback
- Next appointment scheduling

### Data Validation

The system validates:
- ✅ Patient ID presence
- ✅ Patient name presence
- ✅ Contact information format
- ✅ Date formats
- ✅ Gender normalization
- ✅ Insurance scheme parsing

## 🛡️ Error Handling & Rollback

### Automatic Rollback
If any error occurs during import, the entire transaction is rolled back, ensuring data integrity.

### Error Reporting
The system provides detailed error reports including:
- Invalid data entries
- Missing required fields
- Duplicate records
- Processing failures

### Validation Errors
Common validation errors and solutions:

| Error | Solution |
|-------|----------|
| Missing Patient ID | Ensure Column C has patient identifiers |
| Missing Patient Name | Ensure Column F has patient names |
| Invalid Phone Format | Use format: +254XXXXXXXXX or 07XXXXXXXX |
| Invalid Date Format | Use DD/MM/YYYY or MM/DD/YYYY |

## 📈 Import Statistics

After each import, you'll see:
- 📄 Sheets processed
- 👥 Total patients found
- ✅ Patients created
- 🔄 Patients updated
- 📋 CCP records created/updated
- ⚠️ Records skipped
- ❌ Errors encountered

## 🔍 Troubleshooting

### Common Issues

1. **Doctor not found**
   ```bash
   # Create doctors first
   node scripts/create-ccp-doctors.js
   ```

2. **Excel file not readable**
   - Ensure file is .xlsx or .xls format
   - Check file permissions
   - Verify file is not corrupted

3. **Database connection issues**
   - Check database is running
   - Verify connection string in .env
   - Ensure migrations are up to date

4. **Memory issues with large files**
   - Use bulk import script instead of web interface
   - Process files in smaller batches
   - Increase Node.js memory limit: `node --max-old-space-size=4096`

### Debug Mode

Enable detailed logging:
```bash
DEBUG=ccp-import node scripts/ccp-bulk-import.js file.xlsx georgina
```

## 🔐 Security Features

- ✅ Authentication required for API access
- ✅ Role-based authorization (ADMIN, DOCTOR)
- ✅ Input validation and sanitization
- ✅ SQL injection protection
- ✅ Transaction-based operations
- ✅ CSP headers for web interface

## 📚 API Documentation

Full API documentation available at: `http://localhost:3000/api-docs`

### Key Endpoints:
- `POST /api/v1/ccp/import` - Import CCP data
- `GET /api/v1/ccp/patients` - List CCP patients
- `GET /api/v1/ccp/followups` - List followup records
- `PUT /api/v1/ccp/followups/:id` - Update followup

## 🤝 Support

For issues or questions:
1. Check the error logs in the console
2. Verify Excel file format matches expected structure
3. Ensure all required doctors are created
4. Check database connectivity

## 📝 Notes

- The system preserves all original data from Excel files
- Insurance information is extracted from sheet names
- Patient numbers are auto-generated if not provided
- All dates are normalized to ISO format
- Phone numbers are normalized to international format (+254...)
- Medical conditions are stored in patient medical history
- Followup schedules are automatically calculated based on frequency