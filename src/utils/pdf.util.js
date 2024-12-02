const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const { uploadToStorage } = require('./storage.util');

const generateLabReport = async (labTest) => {
  try {
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      }
    });

    
    // Stream to temporary file
    const tempPath = path.join(__dirname, `../temp/${labTest.id}.pdf`);
    const writeStream = fs.createWriteStream(tempPath);
    doc.pipe(writeStream);

    // Add hospital logo and header
    await addHeader(doc);

    // Add patient information
    await addPatientInfo(doc, labTest);

    // Add test information
    await addTestInfo(doc, labTest);

    // Add results
    await addResults(doc, labTest);

    // Add footer with signatures
    await addFooter(doc, labTest);

    // Finalize PDF
    doc.end();

    // Wait for write stream to finish
    await new Promise(resolve => writeStream.on('finish', resolve));

    // Upload to storage and get URL
    const reportUrl = await uploadToStorage(tempPath, `lab-reports/${labTest.id}.pdf`);

    // Clean up temporary file
    fs.unlinkSync(tempPath);

    return { url: reportUrl };
  } catch (error) {
    console.error('Error generating lab report:', error);
    throw error;
  }
};

async function addHeader(doc) {
  // Add logo
  doc.image(path.join(__dirname, '../assets/logo.png'), 50, 45, { width: 50 })
    .fontSize(20)
    .text('ZURI HEALTH LABORATORY', 110, 50)
    .fontSize(12)
    .text('123 Medical Center Drive', 110, 75)
    .text('Contact: +1234567890', 110, 90)
    .moveDown(2);
}

async function addPatientInfo(doc, labTest) {
  doc.fontSize(14)
    .text('LABORATORY REPORT', { align: 'center' })
    .moveDown()
    .fontSize(10);

  // Create a grid for patient information
  const grid = {
    x: 50,
    y: doc.y,
    columnWidth: 250
  };

  doc.text('Patient Information:', grid.x, grid.y, { underline: true })
    .moveDown();

  doc.text(`Patient Name: ${labTest.patient.name}`, grid.x)
    .text(`Patient ID: ${labTest.patientId}`, grid.x + grid.columnWidth)
    .moveDown()
    .text(`Referring Doctor: ${labTest.referringDoctor.name}`, grid.x)
    .text(`Test ID: ${labTest.id}`, grid.x + grid.columnWidth)
    .moveDown(2);
}

async function addTestInfo(doc, labTest) {
  doc.fontSize(12)
    .text('Test Information:', { underline: true })
    .moveDown()
    .fontSize(10);

  const testInfo = [
    ['Test Type:', labTest.testType],
    ['Category:', labTest.testCategory],
    ['Specimen Type:', labTest.specimenType],
    ['Specimen ID:', labTest.specimenId],
    ['Collection Date:', moment(labTest.specimenCollectedAt).format('YYYY-MM-DD HH:mm')],
    ['Report Date:', moment(labTest.testCompletedAt).format('YYYY-MM-DD HH:mm')]
  ];

  const tableWidth = 500;
  const columnWidth = tableWidth / 2;
  let yPosition = doc.y;

  testInfo.forEach(([label, value]) => {
    doc.text(label, 50, yPosition)
      .text(value, 50 + columnWidth, yPosition);
    yPosition += 20;
  });

  doc.moveDown(2);
}

async function addResults(doc, labTest) {
  doc.fontSize(12)
    .text('Test Results:', { underline: true })
    .moveDown()
    .fontSize(10);

  // Headers
  const headers = ['Parameter', 'Result', 'Unit', 'Reference Range', 'Flag'];
  const columnWidths = [150, 100, 80, 120, 50];
  let xPosition = 50;
  headers.forEach((header, index) => {
    doc.text(header, xPosition, doc.y, { width: columnWidths[index], align: 'left' });
    xPosition += columnWidths[index];
  });

  doc.moveDown();

  // Results
  Object.entries(labTest.results).forEach(([parameter, value]) => {
    xPosition = 50;
    const normalRange = labTest.normalRanges[parameter];
    const unit = labTest.units[parameter];
    const flag = determineFlag(value, normalRange);

    [parameter, value, unit, normalRange, flag].forEach((item, index) => {
      doc.text(String(item), xPosition, doc.y, { 
        width: columnWidths[index], 
        align: 'left'
      });
      xPosition += columnWidths[index];
    });
    doc.moveDown();
  });

  // Add interpretation if exists
  if (labTest.interpretation) {
    doc.moveDown()
      .fontSize(12)
      .text('Interpretation:', { underline: true })
      .moveDown()
      .fontSize(10)
      .text(labTest.interpretation);
  }

  // Add notes if exists
  if (labTest.technicianNotes) {
    doc.moveDown()
      .fontSize(12)
      .text('Notes:', { underline: true })
      .moveDown()
      .fontSize(10)
      .text(labTest.technicianNotes);
  }
}

async function addFooter(doc, labTest) {
    doc.moveDown(4);
  
    // Create signature blocks
    const signatureWidth = 200;
    const signatureLine = '________________________';
    
    // Lab Technician signature
    doc.text('Performed by:', 50, doc.y)
      .moveDown()
      .text(signatureLine, 50)
      .fontSize(8)
      .text(labTest.technician.name, 50)
      .text('Lab Technician', 50)
      .text(`Date: ${moment(labTest.testCompletedAt).format('YYYY-MM-DD HH:mm')}`, 50);
  
    // Verifier signature (if verified)
    if (labTest.verifiedById) {
      doc.fontSize(10)
        .text('Verified by:', 300, doc.y - 60)
        .moveDown()
        .text(signatureLine, 300)
        .fontSize(8)
        .text(labTest.verifier.name, 300)
        .text('Lab Supervisor', 300)
        .text(`Date: ${moment(labTest.verifiedAt).format('YYYY-MM-DD HH:mm')}`, 300);
    }
  
    // Add critical value notification if applicable
    if (labTest.isCritical) {
      doc.moveDown(2)
        .fontSize(12)
        .fillColor('red')
        .text('*** CRITICAL VALUE ALERT ***', { align: 'center' })
        .text(`Notified to: ${labTest.notifiedTo}`, { align: 'center' })
        .text(`Date/Time: ${moment(labTest.notifiedAt).format('YYYY-MM-DD HH:mm')}`, { align: 'center' })
        .fillColor('black');
    }
  
    // Add footer with page numbers
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      
      // Add page numbers
      doc.fontSize(8)
        .text(
          `Page ${i + 1} of ${pageCount}`,
          50,
          doc.page.height - 50,
          { align: 'center' }
        );
  
      // Add disclaimer
      doc.fontSize(6)
        .text(
          'This report is electronically generated and is valid without signature. For any queries, please contact the laboratory.',
          50,
          doc.page.height - 30,
          { align: 'center' }
        );
    }
  }
  
  function determineFlag(value, normalRange) {
    if (!normalRange || !value) return '';
  
    try {
      const numericValue = parseFloat(value);
      if (isNaN(numericValue)) return '';
  
      if (typeof normalRange === 'object') {
        if (normalRange.min !== undefined && normalRange.max !== undefined) {
          if (numericValue < normalRange.min) return 'L';
          if (numericValue > normalRange.max) return 'H';
        }
      } else if (typeof normalRange === 'string') {
        // Handle ranges in string format (e.g., "10-20")
        const [min, max] = normalRange.split('-').map(Number);
        if (!isNaN(min) && !isNaN(max)) {
          if (numericValue < min) return 'L';
          if (numericValue > max) return 'H';
        }
      }
    } catch (error) {
      console.error('Error determining flag:', error);
    }
  
    return '';
  }
  
  // Helper function to format values with units
  function formatValueWithUnit(value, unit) {
    if (!value) return '';
    return unit ? `${value} ${unit}` : value;
  }
  
  // Helper function to format reference ranges
  function formatReferenceRange(range) {
    if (!range) return '';
    
    if (typeof range === 'object') {
      if (range.min !== undefined && range.max !== undefined) {
        return `${range.min} - ${range.max}`;
      }
      return '';
    }
    
    return range;
  }
  
  module.exports = {
    generateLabReport,
    formatValueWithUnit,
    formatReferenceRange,
    determineFlag
  };