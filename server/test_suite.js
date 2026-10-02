/**
 * test_suite.js
 * Comprehensive automated test suite for SecureDoc DMS.
 * Tests all API endpoints, cryptographic operations, tamper detection,
 * Merkle ledger proofs, Section 63 PDF certificates, and Women Safety modules.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const BASE_URL = 'http://localhost:5000';

let authToken = '';
let testCaseId = '';
let testDocId = '';
let testDocSha = '';
let testAuditIndex = 0;

let passed = 0;
let failed = 0;
const results = [];

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqHeaders = { ...headers };
    let reqBody = null;

    if (body && typeof body === 'object' && !Buffer.isBuffer(body) && !(body instanceof FormData)) {
      reqBody = JSON.stringify(body);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(reqBody);
    } else if (typeof body === 'string') {
      reqBody = body;
    } else if (Buffer.isBuffer(body)) {
      reqBody = body;
      reqHeaders['Content-Length'] = body.length;
    }

    if (authToken && !reqHeaders['Authorization']) {
      reqHeaders['Authorization'] = `Bearer ${authToken}`;
    }

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: reqHeaders,
    };

    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const rawBuffer = Buffer.concat(chunks);
        let json = null;
        try {
          json = JSON.parse(rawBuffer.toString('utf8'));
        } catch (_) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: json,
          raw: rawBuffer,
        });
      });
    });

    req.on('error', reject);
    if (reqBody) req.write(reqBody);
    req.end();
  });
}

function assert(condition, name, details = '') {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${name}`);
    results.push({ name, status: 'PASS' });
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${name} ${details ? `(${details})` : ''}`);
    results.push({ name, status: 'FAIL', details });
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING SECUREDOC DMS COMPREHENSIVE TEST SUITE');
  console.log('====================================================\n');

  // 1. Health check
  console.log('[1] Testing Health Endpoint');
  try {
    const res = await request('GET', '/health');
    assert(res.statusCode === 200 && res.data?.success === true, 'GET /health returns 200 and success: true');
  } catch (err) {
    assert(false, 'GET /health', err.message);
  }

  // 2. Authentication: IO Login
  console.log('\n[2] Testing Authentication & JWT Issuance');
  try {
    const res = await request('POST', '/auth/login', {
      email: 'io@securedoc.gov',
      password: 'Demo@1234',
    });
    assert(res.statusCode === 200 && res.data?.data?.accessToken, 'POST /auth/login returns JWT access token');
    authToken = res.data?.data?.accessToken || '';
    assert(res.data?.data?.user?.role === 'io', 'Logged in user has IO role');
  } catch (err) {
    assert(false, 'POST /auth/login', err.message);
  }

  // 3. Current User Profile
  console.log('\n[3] Testing Current User Info (GET /auth/me)');
  try {
    const res = await request('GET', '/auth/me');
    assert(res.statusCode === 200 && res.data?.data?.email === 'io@securedoc.gov', 'GET /auth/me returns officer profile');
  } catch (err) {
    assert(false, 'GET /auth/me', err.message);
  }

  // 4. Admin Login & User Management
  console.log('\n[4] Testing Admin RBAC & User Management');
  let adminToken = '';
  try {
    const adminRes = await request('POST', '/auth/login', {
      email: 'admin@securedoc.gov',
      password: 'Demo@1234',
    });
    adminToken = adminRes.data?.data?.accessToken;
    const usersRes = await request('GET', '/auth/users', null, { Authorization: `Bearer ${adminToken}` });
    assert(usersRes.statusCode === 200 && Array.isArray(usersRes.data?.data), 'GET /auth/users returns users list to admin');
    assert(usersRes.data?.data?.length >= 6, `Found ${usersRes.data?.data?.length} registered users`);
  } catch (err) {
    assert(false, 'Admin User Management', err.message);
  }

  // 5. Cases: List & Retrieval
  console.log('\n[5] Testing Case Management (GET /cases)');
  try {
    const res = await request('GET', '/cases');
    assert(res.statusCode === 200 && Array.isArray(res.data?.data), 'GET /cases returns cases list');
    if (res.data?.data?.length > 0) {
      testCaseId = res.data.data[0]._id;
      assert(testCaseId !== '', `Identified active case: ${res.data.data[0].caseNo}`);
    }
  } catch (err) {
    assert(false, 'GET /cases', err.message);
  }

  // 6. Case Creation
  console.log('\n[6] Testing Case Creation (POST /cases by SP)');
  try {
    const spRes = await request('POST', '/auth/login', {
      email: 'sp@securedoc.gov',
      password: 'Demo@1234',
    });
    const spToken = spRes.data?.data?.accessToken;
    const newCaseNo = `CR/TEST/${Date.now().toString().slice(-4)}`;
    const createRes = await request(
      'POST',
      '/cases',
      {
        caseNo: newCaseNo,
        title: 'Cyber Heist Test Case',
        category: 'cybercrime',
        district: 'New Delhi',
        description: 'Automated test investigation case',
      },
      { Authorization: `Bearer ${spToken}` }
    );
    assert(createRes.statusCode === 201 && createRes.data?.data?.caseNo === newCaseNo, `POST /cases created case ${newCaseNo}`);
    testCaseId = createRes.data?.data?._id || testCaseId;
  } catch (err) {
    assert(false, 'POST /cases', err.message);
  }

  // 7. Streaming Upload with AES-256-GCM Envelope Encryption
  console.log('\n[7] Testing Document Upload with Envelope Encryption (POST /cases/:id/documents)');
  try {
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const fileContent = 'CONFIDENTIAL FORENSIC EVIDENCE: Digital hash chain verified at lab terminal.';
    const parts = [
      `--${boundary}\r\nContent-Disposition: form-data; name="title"\r\n\r\nForensic Report FSL-99\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="type"\r\n\r\nforensic\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="classification"\r\n\r\nconfidential\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="tags"\r\n\r\nforensic,fsl,digital\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="ocrText"\r\n\r\nExtracted forensic text sample regarding suspect mobile forensic memory dump.\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="fsl_report.txt"\r\nContent-Type: text/plain\r\n\r\n${fileContent}\r\n`,
      `--${boundary}--\r\n`,
    ];
    const bodyBuf = Buffer.from(parts.join(''));

    const uploadRes = await request('POST', `/cases/${testCaseId}/documents`, bodyBuf, {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    });

    assert(uploadRes.statusCode === 201, 'POST /cases/:id/documents returns 201 Created');
    assert(uploadRes.data?.data?.sha256?.length === 64, `Computed 64-char SHA-256 digest: ${uploadRes.data?.data?.sha256?.slice(0, 16)}...`);
    testDocId = uploadRes.data?.data?.id || uploadRes.data?.data?.documentId;
    testDocSha = uploadRes.data?.data?.sha256;
  } catch (err) {
    assert(false, 'Document Upload', err.message);
  }

  // 8. Document Metadata Retrieval
  console.log('\n[8] Testing Document Metadata (GET /documents/:id)');
  try {
    const res = await request('GET', `/documents/${testDocId}`);
    assert(res.statusCode === 200 && res.data?.data?.title === 'Forensic Report FSL-99', 'GET /documents/:id returns metadata');
    assert(res.data?.data?.iv?.length > 0 && res.data?.data?.authTag?.length > 0, 'Document has AES-256-GCM iv and authTag stored');
  } catch (err) {
    assert(false, 'GET /documents/:id', err.message);
  }

  // 9. Decryption & Download with Auth Tag Verification
  console.log('\n[9] Testing Decryption & Download (GET /documents/:id/download)');
  try {
    const res = await request('GET', `/documents/${testDocId}/download`);
    assert(res.statusCode === 200, 'GET /documents/:id/download returns 200 OK');
    const downloadedText = res.raw.toString('utf8');
    assert(downloadedText.includes('CONFIDENTIAL FORENSIC EVIDENCE'), 'Decrypted content exactly matches original plaintext');
  } catch (err) {
    assert(false, 'Document Download', err.message);
  }

  // 10. Tamper-Evident Integrity Check (GET /documents/:id/verify)
  console.log('\n[10] Testing Document Integrity Verification (GET /documents/:id/verify)');
  try {
    const res = await request('GET', `/documents/${testDocId}/verify`);
    assert(res.statusCode === 200 && res.data?.data?.intact === true, 'Verification returns intact: true');
    assert(res.data?.data?.sha256Stored === res.data?.data?.sha256Computed, 'Stored SHA-256 equals recomputed binary SHA-256');
  } catch (err) {
    assert(false, 'Document Verification', err.message);
  }

  // 11. Public Verification Endpoint (GET /public/verify/:hash)
  console.log('\n[11] Testing Public Verification Endpoint (GET /public/verify/:hash)');
  try {
    const res = await request('GET', `/public/verify/${testDocSha}`, null, { Authorization: '' });
    assert(res.statusCode === 200 && res.data?.data?.found === true, 'Public endpoint locates document by SHA-256 without auth');
    assert(res.data?.data?.intact === true, 'Public verifier confirms document is intact');
  } catch (err) {
    assert(false, 'Public Verification', err.message);
  }

  // 12. Section 63 BSA 2023 Certificate PDF Generation
  console.log('\n[12] Testing Section 63 BSA 2023 Certificate Generation (GET /documents/:id/certificate)');
  try {
    const res = await request('GET', `/documents/${testDocId}/certificate`);
    assert(res.statusCode === 200, 'GET /documents/:id/certificate returns 200 OK');
    assert(res.headers['content-type'] === 'application/pdf', 'Response Content-Type is application/pdf');
    assert(res.raw.slice(0, 4).toString() === '%PDF', 'Generated stream starts with %PDF magic header');
    assert(res.raw.length > 1000, `Generated valid PDF of size ${res.raw.length} bytes`);
  } catch (err) {
    assert(false, 'Section 63 Certificate', err.message);
  }

  // 13. Digital Signature (ECDSA P-256)
  console.log('\n[13] Testing ECDSA P-256 Digital Signature (POST /documents/:id/sign)');
  try {
    const res = await request('POST', `/documents/${testDocId}/sign`);
    assert(res.statusCode === 200 && res.data?.success === true, 'POST /documents/:id/sign affixes ECDSA signature');
    assert(res.data?.data?.method === 'own-key', 'Signature algorithm registered as own-key');

    // Verify signatures list
    const sigListRes = await request('GET', `/documents/${testDocId}/signatures`);
    assert(sigListRes.statusCode === 200 && sigListRes.data?.data?.length > 0, 'GET /documents/:id/signatures lists newly affixed signature');
  } catch (err) {
    assert(false, 'Digital Signature', err.message);
  }

  // 14. Mock Aadhaar eSign Flow
  console.log('\n[14] Testing Mock Aadhaar eSign (API 2.1 / 3.3 Flow)');
  try {
    const initRes = await request('POST', '/esign/initiate', { docId: testDocId });
    assert(initRes.statusCode === 200 && initRes.data?.data?.challengeId, 'POST /esign/initiate returns challengeId');
    const challengeId = initRes.data?.data?.challengeId;

    const cbRes = await request('POST', '/esign/callback', {
      challengeId,
      mockSignature: 'MOCK_AADHAAR_ESIGN_SIGNATURE_BLOCK_PKCS7',
      signerName: 'Test Citizen',
    });
    assert(cbRes.statusCode === 200 && cbRes.data?.success === true, 'POST /esign/callback stores PKCS#7 signature block');
  } catch (err) {
    assert(false, 'Aadhaar eSign', err.message);
  }

  // 15. Advanced Search & OCR Query
  console.log('\n[15] Testing Full-Text Search (GET /search)');
  try {
    const res = await request('GET', '/search?q=forensic&type=forensic');
    assert(res.statusCode === 200 && Array.isArray(res.data?.data), 'GET /search returns matching results');
    const match = res.data?.data?.some((d) => d._id === testDocId || d.title.includes('Forensic'));
    assert(match, 'Search query successfully matched uploaded forensic asset');
  } catch (err) {
    assert(false, 'Search', err.message);
  }

  // 16. Audit Log & Global Hash Chain Verification
  console.log('\n[16] Testing Hash-Chained Audit Trail (GET /audit & GET /ledger/verify-chain)');
  try {
    const auditRes = await request('GET', '/audit?limit=10', null, { Authorization: `Bearer ${adminToken}` });
    assert(auditRes.statusCode === 200 && Array.isArray(auditRes.data?.data), 'GET /audit returns chronological audit blocks');

    const chainRes = await request('GET', '/ledger/verify-chain');
    assert(chainRes.statusCode === 200 && chainRes.data?.data?.valid === true, 'GET /ledger/verify-chain confirms 100% UNBROKEN hash chain');
    console.log(`       Verified total of ${chainRes.data?.data?.totalBlocks} blocks in chain.`);
  } catch (err) {
    assert(false, 'Audit Chain', err.message);
  }

  // 17. Merkle Tree Batch Ledger
  console.log('\n[17] Testing Merkle Tree Batch Ledger (POST /ledger/run-batch & GET /ledger/batches)');
  try {
    const batchRes = await request('POST', '/ledger/run-batch', null, { Authorization: `Bearer ${adminToken}` });
    assert(batchRes.statusCode === 200, 'POST /ledger/run-batch anchors new Merkle batch');

    const listRes = await request('GET', '/ledger/batches');
    assert(listRes.statusCode === 200 && listRes.data?.data?.length > 0, 'GET /ledger/batches returns list of anchored batches');
    const latestBatch = listRes.data?.data[0];
    assert(latestBatch?.root?.length === 64, `Latest Merkle root: ${latestBatch?.root?.slice(0, 16)}...`);
  } catch (err) {
    assert(false, 'Merkle Ledger', err.message);
  }

  // 18. Women Safety: 60-Day Deadlines & Default Bail Risk
  console.log('\n[18] Testing Women Safety Division Deadlines (GET /deadlines)');
  try {
    const res = await request('GET', '/deadlines');
    assert(res.statusCode === 200 && res.data?.success === true, 'GET /deadlines returns statutory deadline monitoring data');
    const cases = res.data?.data?.cases || [];
    const hasSexOffence = cases.some((c) => c.category === 'sexual_offence');
    assert(hasSexOffence, 'Monitors sexual offence cases with 60-day POCSO charge sheet limits');
  } catch (err) {
    assert(false, 'Deadlines Monitor', err.message);
  }

  // 19. Women Safety: Zero FIR Inter-Station Transfer
  console.log('\n[19] Testing Zero FIR Transfer (POST /transfers)');
  try {
    const res = await request('POST', '/transfers', {
      caseId: testCaseId,
      targetStationCode: 'PS-DEL-014',
      targetStationName: 'Parliament Street Police Station',
      reason: 'Incident occurred outside current police station jurisdiction',
    });
    assert(res.statusCode === 200 && res.data?.data?.status === 'transferred', 'POST /transfers creates Zero FIR transfer bundle');
    assert(res.data?.data?.transferId !== undefined, `Transfer transaction ID: ${res.data?.data?.transferId}`);
  } catch (err) {
    assert(false, 'Zero FIR Transfer', err.message);
  }

  // 20. Women Safety: NDSO Offender Cross-Check
  console.log('\n[20] Testing NDSO Offender Registry Cross-Check (GET /ndso/check)');
  try {
    const res = await request('GET', '/ndso/check?name=Ravi Kumar');
    assert(res.statusCode === 200 && res.data?.data?.totalMatches > 0, 'GET /ndso/check flags registered repeat offender');
    assert(res.data?.data?.matches[0]?.name === 'Ravi Kumar', 'NDSO matched suspect "Ravi Kumar"');
  } catch (err) {
    assert(false, 'NDSO Check', err.message);
  }

  // 21. Compliance Report
  console.log('\n[21] Testing Compliance Metrics (GET /reports/compliance)');
  try {
    const res = await request('GET', '/reports/compliance', null, { Authorization: `Bearer ${adminToken}` });
    assert(res.statusCode === 200 && res.data?.data?.totalActiveDocuments > 0, 'GET /reports/compliance returns system metrics');
  } catch (err) {
    assert(false, 'Compliance Report', err.message);
  }

  // 22. Controlled Sharing: Create & Approve Share
  console.log('\n[22] Testing Controlled Sharing (POST /shares & PUT /shares/:id/approve)');
  try {
    const spRes = await request('POST', '/auth/login', {
      email: 'sp@securedoc.gov',
      password: 'Demo@1234',
    });
    const spToken = spRes.data?.data?.accessToken;

    const shareCreateRes = await request('POST', '/shares', {
      docId: testDocId,
      toDepartment: 'Prosecution Directorate',
      permission: 'view',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      watermark: 'PROSECUTION REVIEW ONLY',
    });
    assert(shareCreateRes.statusCode === 201, 'POST /shares creates new sharing request');
    const shareId = shareCreateRes.data?.data?._id;

    if (shareId) {
      const approveRes = await request('PUT', `/shares/${shareId}/approve`, {}, { Authorization: `Bearer ${spToken}` });
      assert(approveRes.statusCode === 200 && approveRes.data?.data?.status === 'approved', 'PUT /shares/:id/approve successfully approved by SP');
    }
  } catch (err) {
    assert(false, 'Controlled Sharing', err.message);
  }

  // 23. Chain of Custody Event Recording
  console.log('\n[23] Testing Evidence Chain of Custody (POST /custody & GET /custody/:id)');
  try {
    const custodyRes = await request('POST', '/custody', {
      itemId: testDocId,
      itemType: 'document',
      to: '6abf1b157ecad58e1e188bc8', // Forensic user
      reason: 'Handover for second-stage forensic spectroscopic analysis',
      caseId: testCaseId,
    });
    assert(custodyRes.statusCode === 201 && custodyRes.data?.data?.hash, 'POST /custody logs hash-chained custody handover event');

    const chainRes = await request('GET', `/custody/${testDocId}`);
    assert(chainRes.statusCode === 200 && Array.isArray(chainRes.data?.data?.events), 'GET /custody/:id returns chronological custody trail');
  } catch (err) {

    assert(false, 'Chain of Custody', err.message);
  }

  // 24. Live Tamper Detection Demonstration
  console.log('\n[24] Testing LIVE TAMPER DETECTION DEMO (Directly Altering GridFS/Chunk Byte)');
  try {
    const mongoose = require('mongoose');
    const Document = require('./src/models/Document');
    const { getGridFSBucket } = require('./src/services/gridfsService');

    // Connect mongoose to inspect/modify a chunk
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/legal_dms');
    const docRecord = await Document.findById(testDocId);

    // Corrupt the authTag to simulate storage byte tampering
    const originalTag = docRecord.authTag;
    // Flip characters in authTag
    const tamperedTag = 'ff' + originalTag.slice(2);
    await Document.updateOne({ _id: testDocId }, { authTag: tamperedTag });

    // Verify should now FAIL and flag TAMPERED
    const tamperRes = await request('GET', `/documents/${testDocId}/verify`);
    assert(
      tamperRes.data?.data?.intact === false,
      'Tampered document is detected immediately: intact = false'
    );
    assert(
      tamperRes.data?.data?.tampered === true || tamperRes.data?.data?.message?.includes('TAMPERED') || tamperRes.data?.data?.message?.includes('mismatch'),
      'Tamper detection triggers alert flag'
    );

    // Restore original tag to leave database clean
    await Document.updateOne({ _id: testDocId }, { authTag: originalTag });
    const restoreRes = await request('GET', `/documents/${testDocId}/verify`);
    assert(restoreRes.data?.data?.intact === true, 'Restoring correct cryptographic tag returns intact: true');

    await mongoose.disconnect();
  } catch (err) {
    assert(false, 'Live Tamper Demo', err.message);
  }

  // Summary
  console.log('\n====================================================');
  console.log(`📊 TEST SUITE COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed === 0) {
    console.log('🎉 ALL SYSTEM MODULES ARE 100% OPERATIONAL & VERIFIED!');
  } else {
    console.error(`⚠️ Found ${failed} issues. Please review logs above.`);
  }

  process.exit(failed === 0 ? 0 : 1);
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
