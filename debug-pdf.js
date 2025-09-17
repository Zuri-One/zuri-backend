#!/usr/bin/env node

const fs = require('fs');
const pdf = require('pdf-parse');

function normalizeText(s) {
  return (s || '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/~+/g, '-')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

async function debugPDF() {
  try {
    const terms = process.argv.slice(2).filter(Boolean);
    const dataBuffer = fs.readFileSync('./Omaera price list.pdf');
    const pdfData = await pdf(dataBuffer);
    const lines = pdfData.text.split('\n').map((l) => normalizeText(l));

    if (terms.length === 0) {
      console.log('First 100 non-empty lines:');
      lines.filter(Boolean).slice(0, 100).forEach((line, index) => {
        console.log(`${index + 1}: "${line}"`);
      });

      console.log('\n\nLooking for table patterns...');
      lines.forEach((line, index) => {
        if (line.includes('Item Code') || line.includes('Tax Code')) {
          console.log(`Line ${index + 1}: "${line}"`);
        }
      });
      return;
    }

    const lcTerms = terms.map((t) => t.toLowerCase());
    let hits = 0;
    console.log(`Searching for terms: ${terms.join(', ')}`);
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l) continue;
      const ll = l.toLowerCase();
      if (lcTerms.some((t) => ll.includes(t))) {
        hits++;
        const prev = lines[i - 1] || '';
        const next = lines[i + 1] || '';
        console.log(`\nHit at line ${i + 1}:`);
        console.log(`  -1: "${prev}"`);
        console.log(`   0: "${l}"`);
        console.log(`  +1: "${next}"`);
      }
    }
    if (!hits) console.log('No matches found.');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugPDF();