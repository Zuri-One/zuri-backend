#!/usr/bin/env node

// scripts/import-omaera-robust.js
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const pdf = require('pdf-parse');
const { sequelize } = require('../src/config/database');

const DEFAULT_PDF = path.resolve(process.cwd(), 'Omaera price list.pdf');

function normalizeText(input) {
  let s = input || '';
  s = s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
  s = s.replace(/~+/g, '-');
  s = s.replace(/[#]{0,1}REF!?/gi, '');
  s = s.replace(/\bNETT\b/gi, '');
  s = s.replace(/\bCOLD\s*CHAIN\b/gi, '');
  s = s.replace(/\bFRIDGE\b/gi, '');
  // Normalize "30's" -> "30s"
  s = s.replace(/(\d+)\s*['’]s\b/gi, '$1s');
  // Ensure space between repeated pack tokens (e.g., "30s30s" -> "30s 30s")
  s = s.replace(/(\d+s)(?=\d)/gi, '$1 ');
  // Ensure space between units and following numbers (e.g., "ml10" -> "ml 10")
  s = s.replace(/(ml|g|mg|l|litre|liters?|vial|vials|amps?|tabs?|caps?)(?=\d)/gi, '$1 ');
  // Ensure space before units after a number (e.g., "10ml" -> "10 ml")
  s = s.replace(/(?<=\d)(ml|g|mg|l|litre|liters?|vial|vials|amps?|tabs?|caps?)/gi, ' $1');
  // Insert a space between tax and price when glued (e.g., "0.001,590.9" -> "0.00 1,590.9")
  s = s.replace(/(\d+\.\d{1,2})(?=(?:\d|,))/g, '$1 ');
  // Insert a space between item code and brand when glued (e.g., "MCLB063Olmat" -> "MCLB063 Olmat")
  s = s.replace(/([A-Z]{3,}[A-Za-z0-9-]*\d)([A-Za-z]+)/g, '$1 $2');
  // Collapse extra whitespace
  s = s.replace(/\s{2,}/g, ' ');
  return s.trim();
}

function looksLikeItemCode(tok1, tok2) {
  const raw1 = (tok1 || '');
  const raw2 = (tok2 || '');

  // Tokens like "mg60", "ml500", "cm45", etc. are NOT item codes.
  const UNIT_PREFIXES = new Set(['MG', 'ML', 'G', 'KG', 'L', 'LT', 'CM', 'MM', 'MCG', 'UG', 'IU']);

  const badPrefix = (code) => {
    const m = (code || '').toUpperCase().match(/^([A-Z]+)/);
    if (!m) return true;
    const pref = m[1];
    if (pref.length < 3) return true; // require at least 3 letters to avoid "MG", "ML", etc.
    if (UNIT_PREFIXES.has(pref)) return true;
    return false;
  };

  // Extract code from a raw token (preserving case to avoid eating brand name like "Ldnil")
  const extractFrom = (raw) => {
    if (!raw) return null;
    // Remove non-code noise but preserve case for suffix checks
    const cleaned = raw.replace(/[^A-Za-z0-9-]/g, '');
    // Base: 3+ leading letters then optional alnum/dash then at least one digit
    const m = cleaned.match(/^([A-Z]{3,}[A-Za-z0-9-]*\d+)/i);
    if (!m) return null;
    const base = m[1]; // as-is case
    // Suffix: include up to 6 chars ONLY if all are [A-Z0-9-] (uppercase/digits/dash).
    // Require suffix length >= 2 to avoid grabbing a single capital that starts a brand (e.g., 'L' in 'Ldnil').
    const after = cleaned.slice(base.length);
    let suf = '';
    for (let i = 0; i < after.length && i < 6; i++) {
      const ch = after[i];
      if (/[A-Z0-9-]/.test(ch)) {
        suf += ch;
      } else if (/[a-z]/.test(ch)) {
        // Stop at lowercase brand letters
        break;
      } else {
        break;
      }
    }
    if (suf.length < 2) suf = '';
    const code = (base + suf).toUpperCase();
    return badPrefix(code) ? null : code;
  };

  let code = extractFrom(raw1);
  let consumed = 1;

  if (!code) {
    const combined = raw1 + raw2;
    const code2 = extractFrom(combined);
    if (code2) {
      code = code2;
      consumed = 2;
    }
  }

  if (!code) return null;
  return { code, consumed };
}

function extractPrice(text) {
  const m = text.match(/(\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s*$/);
  if (!m) return null;
  const raw = m[0].trim();
  const price = parseFloat(raw.replace(/[^0-9.]/g, ''));
  if (!isFinite(price) || price <= 0) return null;
  const head = text.slice(0, text.length - raw.length).trim();
  return { price, head };
}

function extractTax(text) {
  // Find a VAT-like decimal near the end, prefer the rightmost value <= 0.25 (e.g., 0.00, 0.10, 0.16).
  const matches = Array.from(text.matchAll(/(\d+(?:\.\d{1,2}))/g)).map(m => m[1]);
  let raw = null;
  for (let i = matches.length - 1; i >= 0; i--) {
    const v = parseFloat(matches[i]);
    if (isFinite(v) && v <= 0.25) {
      raw = matches[i];
      break;
    }
  }
  if (!raw) {
    // Fallback: accept a trailing standalone "0" as zero tax
    const m0 = text.match(/(?:^|\s)(0)\s*$/);
    if (m0) {
      const head0 = text.slice(0, text.lastIndexOf(m0[1])).trim();
      return { taxCode: 0.0, head: head0 };
    }
    return null;
  }
  const taxCode = parseFloat(raw);
  const head = text.slice(0, text.lastIndexOf(raw)).trim();
  return { taxCode, head };
}

function extractPack(beforeTaxSection) {
  let remaining = beforeTaxSection;
  const patterns = [
    /(\d+\s*(?:x|\*|by)\s*\d+\s*(?:s|tabs?|caps?|amps?|vials?|ml|g|mg|l|litre|liters?)\b)$/i,
    /(\d+(?:\.\d+)?\s*(?:ml|g|mg|l|litre|liters?)\b)$/i,
    /(\d+\s*(?:tabs?|caps?|amps?|vials?|s)\b)$/i,
    /(\d+\s*['’]?s\b)$/i
  ];
  const parts = [];
  let matched = true;
  while (matched) {
    matched = false;
    for (const rx of patterns) {
      const m = remaining.match(rx);
      if (m) {
        parts.unshift(m[1].trim());
        remaining = remaining.slice(0, remaining.lastIndexOf(m[1])).trim();
        matched = true;
        break;
      }
    }
  }
  const packSize = parts.length ? parts.join(' ') : null;
  return { packSize, remaining };
}

function tryParseRow(buffer) {
  const text = normalizeText(buffer);
  if (!text || text.length < 12) return null;
  // price
  const priceRes = extractPrice(text);
  if (!priceRes) return null;
  // tax (must exist to avoid premature flush on strengths like "150")
  const taxRes = extractTax(priceRes.head);
  if (!taxRes) return null;
  // code + description + pack
  const { packSize, remaining } = extractPack(taxRes.head);
  const parts = remaining.split(/\s+/);
  if (parts.length < 2) return null;
  const codeGuess = looksLikeItemCode(parts[0], parts[1]);
  if (!codeGuess) return null;

  // Recover brand text glued to the code in the first token, e.g. "MCLB063Olmat"
  let suffixBrand = '';
  if (parts[0] && parts[0].length > codeGuess.code.length) {
    const rawSuffix = parts[0].substring(codeGuess.code.length);
    if (rawSuffix && /[A-Za-z]/.test(rawSuffix)) {
      // Keep alpha, digits, + and / - common in brand notations
      suffixBrand = rawSuffix.replace(/^[^A-Za-z+/-]+/, '').replace(/[^A-Za-z0-9+/-]+$/,'').trim();
    }
  }

  const tailDesc = parts.slice(codeGuess.consumed).join(' ').trim();
  const desc = [suffixBrand, tailDesc].filter(Boolean).join(' ').replace(/\s{2,}/g, ' ').trim();

  if (!desc || desc.length < 2) return null;
  return {
    itemCode: codeGuess.code,
    itemDescription: desc,
    packSize: packSize || null,
    taxCode: taxRes.taxCode ?? 0.0,
    price: priceRes.price
  };
}

// Split a line into segments starting at code-like tokens.
// Returns { pre, segs } where pre is any prefix text before the first code,
// and segs is an array of segments each beginning with a code.
function segmentLineByCodes(line) {
  const tokens = line.split(/\s+/).filter(Boolean);
  const starts = [];
  for (let i = 0; i < tokens.length; i++) {
    const guess = looksLikeItemCode(tokens[i], tokens[i + 1] || '');
    if (guess) starts.push(i);
  }
  if (starts.length === 0) return { pre: line, segs: [] };
  const pre = starts[0] > 0 ? tokens.slice(0, starts[0]).join(' ').trim() : '';
  const segs = [];
  for (let s = 0; s < starts.length; s++) {
    const start = starts[s];
    const end = s + 1 < starts.length ? starts[s + 1] : tokens.length;
    const seg = tokens.slice(start, end).join(' ').trim();
    if (seg) segs.push(seg);
  }
  return { pre, segs };
}
async function parsePdfToRows(pdfPath) {
  const dataBuffer = fs.readFileSync(pdfPath);
  const pdfData = await pdf(dataBuffer);
  const rawLines = pdfData.text.split('\n');
  const rows = [];
  const skipIfContains = [
    'Item Code',
    'Item Description',
    'Pack Size',
    'Tax Code',
    'Selling Price',
    'Updated Inventory',
    'OMAERA',
    'NB: PRICES'
  ];
  let buf = '';
  const flushTry = () => {
    const parsed = tryParseRow(buf);
    if (parsed) rows.push(parsed);
    buf = '';
  };
  for (let i = 0; i < rawLines.length; i++) {
    let line = normalizeText(rawLines[i]);
    if (!line) continue;
    if (skipIfContains.some((k) => line.includes(k))) continue;

    const split = segmentLineByCodes(line);

    // If there's no code in the line, just append entire line to buffer
    if (!split.segs || split.segs.length === 0) {
      buf = buf ? `${buf} ${line}` : line;
      // Opportunistic parse for long/price-terminated buffer
      if (buf.length > 120 || /(\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s*$/.test(buf)) {
        const parsedNow = tryParseRow(buf);
        if (parsedNow) {
          rows.push(parsedNow);
          buf = '';
        }
      }
      continue;
    }

    // Append any prefix text before the first code to the ongoing buffer
    if (split.pre) {
      buf = buf ? `${buf} ${split.pre}` : split.pre;
    }

    // Flush current buffer before handling code-led segments
    if (buf) {
      const parsedPrev = tryParseRow(buf);
      if (parsedPrev) rows.push(parsedPrev);
      buf = '';
    }

    // Process each segment that starts with a code
    for (const seg of split.segs) {
      if (buf) {
        const parsedPrev2 = tryParseRow(buf);
        if (parsedPrev2) {
          rows.push(parsedPrev2);
          buf = seg;
        } else {
          buf = `${buf} ${seg}`;
        }
      } else {
        buf = seg;
      }

      // Opportunistic parse whenever buffer looks complete/long
      if (buf.length > 120 || /(\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s*$/.test(buf)) {
        const parsedNow = tryParseRow(buf);
        if (parsedNow) {
          rows.push(parsedNow);
          buf = '';
        }
      }
    }
  }
  if (buf) {
    const parsedLast = tryParseRow(buf);
    if (parsedLast) rows.push(parsedLast);
  }

  // Salvage pass: directly try-parse any single line that ends with a price-like token
  // This captures rows that failed the segment/buffer heuristics (e.g., code+brand glued cases).
  const existingCodes = new Set(rows.map(r => r.itemCode));
  for (let i = 0; i < rawLines.length; i++) {
    let l = normalizeText(rawLines[i]);
    if (!l) continue;
    if (!/(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*$/.test(l)) continue; // must appear to end with price
    const parsed = tryParseRow(l);
    if (parsed && !existingCodes.has(parsed.itemCode)) {
      rows.push(parsed);
      existingCodes.add(parsed.itemCode);
    }
  }

  // Deduplicate by itemCode (keep last occurrence)
  const map = new Map();
  for (const r of rows) map.set(r.itemCode, r);
  return Array.from(map.values());
}

async function fetchExistingItemCodes() {
  const [rows] = await sequelize.query('SELECT "itemCode" FROM "OmaeraMedications";');
  const set = new Set();
  for (const r of rows) set.add(r.itemCode);
  return set;
}

async function importRows(rows, mode) {
  console.log(`\n💾 Import mode: ${mode === 'update' ? 'UPSERT (update existing)' : 'INSERT MISSING ONLY'}`);
  // Ensure table exists
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "OmaeraMedications" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "itemCode" VARCHAR(255) NOT NULL UNIQUE,
      "itemDescription" TEXT NOT NULL,
      "packSize" VARCHAR(255),
      "taxCode" DECIMAL(4,2) DEFAULT 0.00,
      "originalPrice" DECIMAL(10,2) NOT NULL,
      "currentPrice" DECIMAL(10,2) NOT NULL,
      "isActive" BOOLEAN DEFAULT true,
      "lastUpdatedBy" UUID,
      notes TEXT,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW()
    );
  `);
  let inserted = 0, updated = 0, skipped = 0, errors = 0;
  const existing = await fetchExistingItemCodes();
  for (const med of rows) {
    try {
      if (mode === 'insert' && existing.has(med.itemCode)) {
        skipped++;
        continue;
      }
      const q = `
        INSERT INTO "OmaeraMedications"
          ("itemCode","itemDescription","packSize","taxCode","originalPrice","currentPrice")
        VALUES
          (:itemCode,:itemDescription,:packSize,:taxCode,:price,:price)
        ON CONFLICT ("itemCode") DO UPDATE SET
          "itemDescription" = EXCLUDED."itemDescription",
          "packSize" = EXCLUDED."packSize",
          "taxCode" = EXCLUDED."taxCode",
          "originalPrice" = EXCLUDED."originalPrice",
          "currentPrice" = EXCLUDED."currentPrice",
          "updatedAt" = NOW();
      `;
      const doUpsert = (mode === 'update');
      if (doUpsert) {
        await sequelize.query(q, { replacements: {
          itemCode: med.itemCode,
          itemDescription: med.itemDescription,
          packSize: med.packSize,
          taxCode: med.taxCode,
          price: med.price
        }});
        if (existing.has(med.itemCode)) updated++; else inserted++;
      } else {
        await sequelize.query(`
          INSERT INTO "OmaeraMedications"
            ("itemCode","itemDescription","packSize","taxCode","originalPrice","currentPrice")
          VALUES
            (:itemCode,:itemDescription,:packSize,:taxCode,:price,:price)
          ON CONFLICT DO NOTHING;
        `, { replacements: {
          itemCode: med.itemCode,
          itemDescription: med.itemDescription,
          packSize: med.packSize,
          taxCode: med.taxCode,
          price: med.price
        }});
        if (existing.has(med.itemCode)) skipped++; else inserted++;
      }
      if ((inserted + updated) % 200 === 0) {
        console.log(`  ... progress: inserted=${inserted}, updated=${updated}, skipped=${skipped}`);
      }
    } catch (e) {
      errors++;
      console.error(`  ❌ Failed for ${med.itemCode}: ${e.message}`);
    }
  }
  console.log(`\n✅ Done. inserted=${inserted}, updated=${updated}, skipped=${skipped}, errors=${errors}`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { mode: 'insert', dryRun: false, limit: 0, pdfPath: DEFAULT_PDF, filter: '', help: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--help' || a === '-h') opts.help = true;
    else if (a === '--update') opts.mode = 'update';
    else if (a === '--insert' || a === '--insert-missing-only') opts.mode = 'insert';
    else if (a === '--dry' || a === '--dry-run') opts.dryRun = true;
    else if (a === '--limit') { const n = parseInt(args[i+1], 10); if (!isNaN(n)) { opts.limit = n; i++; } }
    else if (a === '--path' || a === '--pdf') { opts.pdfPath = path.resolve(process.cwd(), args[i+1]); i++; }
    else if (a === '--filter' || a === '-f') { opts.filter = String(args[i+1] || '').trim(); i++; }
  }
  return opts;
}

(async () => {
  let opts;
  try {
    opts = parseArgs();

    if (opts.help) {
      console.log(`Usage: node scripts/import-omaera-robust.js [options]

Options:
  --insert, --insert-missing-only   Insert only missing items (default)
  --update                          Upsert mode (insert or update existing)
  --dry, --dry-run                  Parse and preview without DB writes
  --pdf, --path <file>              Path to the Omaera price list PDF
  --limit <n>                       Limit number of sample rows shown/imported
  --filter, -f <regex>              Filter parsed rows by itemCode or description (preview)
  --help, -h                        Show this help

Examples:
  node scripts/import-omaera-robust.js --dry --limit 50
  node scripts/import-omaera-robust.js --dry --filter "Olmat|Ldnil|SMBA09|MCLB06(2|3)"
  node scripts/import-omaera-robust.js --insert
  node scripts/import-omaera-robust.js --update
`);
      process.exit(0);
    }

    const pdfPath = opts.pdfPath || DEFAULT_PDF;
    if (!fs.existsSync(pdfPath)) {
      console.error(`❌ PDF not found at ${pdfPath}`);
      process.exit(1);
    }
    console.log('🔍 Parsing PDF:', pdfPath);
    const rows = await parsePdfToRows(pdfPath);
    console.log(`📋 Parsed ${rows.length} candidate rows`);

    // Optional filter view to verify specific entries (e.g., Olmat/Ldnil or item codes)
    if (opts.filter) {
      const rx = new RegExp(opts.filter, 'i');
      const filtered = rows.filter(r => rx.test(r.itemCode || '') || rx.test(r.itemDescription || ''));
      console.log(`🔎 Filter "${opts.filter}" matched ${filtered.length} rows:`);
      filtered.forEach((m, idx) => {
        console.log(`${idx + 1}. ${m.itemCode} | ${m.itemDescription} | ${m.packSize || '-'} | tax=${m.taxCode} | price=${m.price}`);
      });

      // If no parsed rows matched, inspect raw PDF lines and attempt tryParseRow directly for diagnostics
      if (filtered.length === 0) {
        try {
          const dataBuffer2 = fs.readFileSync(pdfPath);
          const pdfData2 = await pdf(dataBuffer2);
          const rawLines2 = pdfData2.text.split('\n').map((l) => normalizeText(l));
          console.log(`🔧 Filter had 0 matches in parsed rows. Inspecting raw lines for "${opts.filter}"...`);
          let hits = 0;
          for (let i = 0; i < rawLines2.length; i++) {
            const line = rawLines2[i];
            if (!line) continue;
            if (rx.test(line)) {
              hits++;
              const parsed = tryParseRow(line);
              console.log(`Line ${i + 1}: "${line}"`);
              if (parsed) {
                console.log(`  -> tryParseRow: ${parsed.itemCode} | ${parsed.itemDescription} | ${parsed.packSize || '-'} | tax=${parsed.taxCode} | price=${parsed.price}`);
              } else {
                console.log(`  -> tryParseRow: FAILED`);
              }
            }
          }
          if (hits === 0) {
            console.log('No raw line matches found for this filter.');
          }
        } catch (e) {
          console.log('Filter diagnostics failed:', e?.message || e);
        }
      }
    }

    // Show samples (unfiltered)
    const sample = opts.limit && opts.limit > 0 ? rows.slice(0, opts.limit) : rows.slice(0, 20);
    sample.forEach((m, idx) => {
      console.log(`${idx + 1}. ${m.itemCode} | ${m.itemDescription} | ${m.packSize || '-'} | tax=${m.taxCode} | price=${m.price}`);
    });
    if (opts.dryRun) {
      console.log('\nℹ️ Dry-run: no database changes will be made.');
      process.exit(0);
    }
    await sequelize.authenticate();
    await importRows(opts.limit > 0 ? rows.slice(0, opts.limit) : rows, opts.mode);
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err?.message || err);
    try { await sequelize.close(); } catch (_e) {}
    process.exit(1);
  }
})();