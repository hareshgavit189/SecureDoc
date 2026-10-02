'use strict';

/**
 * seedData.js — standalone seed script
 * Run with: node src/utils/seedData.js
 *
 * Creates demo users, cases, documents (metadata only), audit blocks,
 * and runs a Merkle batch.
 */

require('dotenv').config();

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true' && !process.argv.includes('--allow-demo-seed')) {
  throw new Error('Demo seeding is disabled in production. Set ALLOW_DEMO_SEED=true only for an isolated demo database.');
}

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Models
const User = require('../models/User');
const Case = require('../models/Case');
const Document = require('../models/Document');
const AuditBlock = require('../models/AuditBlock');
const MerkleBatch = require('../models/MerkleBatch');
const Signature = require('../models/Signature');
const Share = require('../models/Share');
const CustodyEvent = require('../models/CustodyEvent');
const DocumentHistory = require('../models/DocumentHistory');

// Services
const { addAudit } = require('../services/ledgerService');
const { runMerkleBatch } = require('../services/merkleService');
const { hashString } = require('../services/cryptoService');

const DEMO_PASSWORD = 'Demo@1234';

// ---------------------------------------------------------------------------
// Demo users
// ---------------------------------------------------------------------------
const DEMO_USERS = [
  { name: 'Admin User', email: 'admin@securedoc.gov', role: 'admin', department: 'Administration', clearance: 'secret' },
  { name: 'SP Rajesh Kumar', email: 'sp@securedoc.gov', role: 'sp', department: 'District SP Office', clearance: 'secret' },
  { name: 'IO Priya Sharma', email: 'io@securedoc.gov', role: 'io', department: 'Crime Branch', clearance: 'confidential' },
  { name: 'Dr. Meera Forensics', email: 'forensic@securedoc.gov', role: 'forensic', department: 'Forensic Lab', clearance: 'confidential' },
  { name: 'Adv. Rahul Prosecutor', email: 'prosecutor@securedoc.gov', role: 'prosecutor', department: 'Public Prosecution', clearance: 'restricted' },
  { name: 'Citizen John Doe', email: 'citizen@example.com', role: 'citizen', department: '', clearance: 'public' },
];

// ---------------------------------------------------------------------------
// Demo cases (registeredAt is offset for deadline testing)
// ---------------------------------------------------------------------------
function daysAgoDate(d) {
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000);
}

const DEMO_CASES_TEMPLATE = [
  {
    caseNo: 'CR/001/2026',
    firNo: 'FIR-001/2026',
    title: 'Armed Robbery at City Bank',
    category: 'general',
    status: 'investigation',
    district: 'Mumbai Central',
    description: 'Armed robbery at City Bank, Dadar. Three suspects involved.',
    daysOld: 10,
  },
  {
    caseNo: 'CR/002/2026',
    firNo: 'FIR-002/2026',
    title: 'Sexual Assault Case - Andheri',
    category: 'sexual_offence',
    status: 'investigation',
    district: 'Andheri West',
    description: 'Sexual assault case reported. Victim statement recorded.',
    daysOld: 48, // amber alert (45–50 days)
  },
  {
    caseNo: 'CR/003/2026',
    firNo: 'FIR-003/2026',
    title: 'Sexual Offence - Bandra',
    category: 'sexual_offence',
    status: 'investigation',
    district: 'Bandra East',
    description: 'Case registered under POCSO. Victim minor, age 14.',
    daysOld: 55, // orange alert (50–60 days)
  },
  {
    caseNo: 'CR/004/2026',
    firNo: 'FIR-004/2026',
    title: 'Online Fraud - Cybercrime Cell',
    category: 'cybercrime',
    status: 'charge_sheet',
    district: 'Pune',
    description: 'Online banking fraud via phishing. Victims: 45 individuals.',
    daysOld: 30,
  },
  {
    caseNo: 'CR/005/2026',
    firNo: 'FIR-005/2026',
    title: 'Human Trafficking Ring',
    category: 'trafficking',
    status: 'in_court',
    district: 'Nagpur',
    description: 'Dismantled trafficking ring. 12 victims rescued.',
    daysOld: 120,
  },
];

// ---------------------------------------------------------------------------
// Document types per case
// ---------------------------------------------------------------------------
const DOC_TEMPLATES = [
  { title: 'First Information Report', type: 'fir', classification: 'restricted' },
  { title: 'Witness Statement', type: 'statement', classification: 'confidential' },
  { title: 'Forensic Evidence Report', type: 'forensic', classification: 'confidential' },
];

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------
async function seed() {
  console.log('[Seed] Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('[Seed] Connected.');

  // ── Clear all collections ───────────────────────────────────────────────
  console.log('[Seed] Clearing collections...');
  await Promise.all([
    User.deleteMany({}),
    Case.deleteMany({}),
    Document.deleteMany({}),
    AuditBlock.deleteMany({}),
    MerkleBatch.deleteMany({}),
    Signature.deleteMany({}),
    Share.deleteMany({}),
    CustodyEvent.deleteMany({}),
    DocumentHistory.deleteMany({}),
  ]);
  console.log('[Seed] Collections cleared.');

  // ── Create users ─────────────────────────────────────────────────────────
  console.log('[Seed] Creating demo users...');
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const users = await User.insertMany(
    DEMO_USERS.map((u) => ({ ...u, passwordHash }))
  );

  const adminUser = users.find((u) => u.role === 'admin');
  const ioUser = users.find((u) => u.role === 'io');
  const spUser = users.find((u) => u.role === 'sp');
  const forensicUser = users.find((u) => u.role === 'forensic');

  for (const u of users) {
    await addAudit({ userId: u._id, action: 'USER_REGISTER', ip: '127.0.0.1', metadata: { email: u.email } });
  }
  console.log(`[Seed] Created ${users.length} users.`);

  // ── Create cases ─────────────────────────────────────────────────────────
  console.log('[Seed] Creating demo cases...');
  const cases = [];
  for (const tmpl of DEMO_CASES_TEMPLATE) {
    const { daysOld, ...caseData } = tmpl;
    const newCase = await Case.create({
      ...caseData,
      registeredAt: daysAgoDate(daysOld),
      registeredBy: adminUser._id,
      team: [adminUser._id, ioUser._id, spUser._id, forensicUser._id],
    });
    cases.push(newCase);
    await addAudit({
      userId: adminUser._id,
      action: 'CASE_CREATE',
      caseId: newCase._id,
      ip: '127.0.0.1',
      metadata: { caseNo: newCase.caseNo },
    });
  }
  console.log(`[Seed] Created ${cases.length} cases.`);

  // ── Create documents (metadata only, no actual file) ─────────────────────
  console.log('[Seed] Creating demo documents...');
  let totalDocs = 0;
  for (const c of cases) {
    for (const docTmpl of DOC_TEMPLATES) {
      // Mock SHA-256 for demo purposes
      const mockSha256 = hashString(`${c.caseNo}-${docTmpl.title}-${Date.now()}-${Math.random()}`);

      const doc = await Document.create({
        caseId: c._id,
        title: `${docTmpl.title} — ${c.caseNo}`,
        type: docTmpl.type,
        classification: docTmpl.classification,
        tags: [c.category, c.district, docTmpl.type],
        sha256: mockSha256,
        // Mock encryption fields (no actual file — for demo display only)
        iv: 'a'.repeat(24),
        authTag: 'b'.repeat(32),
        wrappedKey: 'c'.repeat(64),
        wrapIv: 'd'.repeat(24),
        wrapTag: 'e'.repeat(32),
        ocrText: `Demo OCR text for ${docTmpl.title} in case ${c.caseNo}. This document is for demonstration purposes.`,
        uploadedBy: ioUser._id,
        firSignDeadline: docTmpl.type === 'fir' ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) : undefined,
      });

      await addAudit({
        userId: ioUser._id,
        action: 'DOCUMENT_UPLOAD',
        docId: doc._id,
        caseId: c._id,
        ip: '127.0.0.1',
        metadata: { title: doc.title, sha256: mockSha256, type: doc.type },
      });

      totalDocs++;
    }
  }
  console.log(`[Seed] Created ${totalDocs} documents.`);

  // ── Run Merkle batch ──────────────────────────────────────────────────────
  console.log('[Seed] Running Merkle batch...');
  const batch = await runMerkleBatch();
  if (batch) {
    console.log(`[Seed] Merkle batch: ${batch.batchId} | root: ${batch.root} | leaves: ${batch.leafCount}`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════');
  console.log('  Seed complete!');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Users:     ${users.length}`);
  console.log(`  Cases:     ${cases.length}`);
  console.log(`  Documents: ${totalDocs}`);
  console.log(`  Merkle:    ${batch ? '1 batch created' : 'no new blocks'}`);
  console.log('\n  Demo credentials (all):');
  console.log('  Password: Demo@1234');
  for (const u of users) {
    console.log(`  • ${u.email.padEnd(35)} [${u.role}]`);
  }
  console.log('═══════════════════════════════════════════════\n');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('[Seed] Error:', err);
  process.exit(1);
});
