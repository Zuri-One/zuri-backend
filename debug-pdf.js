#!/usr/bin/env node

const fs = require('fs');
const pdf = require('pdf-parse');

async function debugPDF() {
  try {
    const dataBuffer = fs.readFileSync('./Omaera price list.pdf');
    const pdfData = await pdf(dataBuffer);
    
    const lines = pdfData.text.split('\n');
    
    console.log('First 100 lines:');
    lines.slice(0, 100).forEach((line, index) => {
      if (line.trim()) {
        console.log(`${index + 1}: "${line}"`);
      }
    });
    
    console.log('\n\nLooking for table patterns...');
    lines.forEach((line, index) => {
      if (line.includes('GSKP001') || line.includes('Item Code') || line.includes('Tax Code')) {
        console.log(`Line ${index + 1}: "${line}"`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugPDF();