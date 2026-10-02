'use strict';

const { hashString } = require('./cryptoService');
const AuditBlock = require('../models/AuditBlock');

// ---------------------------------------------------------------------------
// Add a hash-chained audit block
// ---------------------------------------------------------------------------

/**
 * Insert a new audit block. Each block's hash covers all its fields
 * plus the previous block's hash, creating a tamper-evident chain.
 *
 * @param {{ userId, action, docId, caseId, ip, metadata }} params
 * @returns {Promise<AuditBlock>}
 */
async function addAudit({ userId, action, docId = null, caseId = null, ip = '', metadata = {} }) {
  // Find the most recent block (highest index)
  const last = await AuditBlock.findOne().sort({ index: -1 }).lean();

  const normId = (val) => {
    if (!val) return null;
    return val._id ? val._id : val;
  };

  const block = {
    index: last ? last.index + 1 : 0,
    ts: new Date().toISOString(),
    userId: normId(userId),
    action,
    docId: normId(docId),
    caseId: normId(caseId),
    ipHash: ip ? hashString(ip) : '',
    prevHash: last ? last.hash : '0'.repeat(64),
    metadata: metadata || {},
  };

  // Hash of the entire block (excluding the hash field itself)
  block.hash = hashString(JSON.stringify(block));

  return AuditBlock.create(block);
}

// ---------------------------------------------------------------------------
// Verify the entire audit chain
// ---------------------------------------------------------------------------

/**
 * Walk all audit blocks in order and recompute each hash.
 * Returns { valid, brokenAtIndex, totalBlocks }
 */
async function verifyChain() {
  const blocks = await AuditBlock.find().sort({ index: 1 }).lean();

  if (blocks.length === 0) {
    return { valid: true, brokenAtIndex: null, totalBlocks: 0 };
  }

  const normId = (val) => {
    if (!val) return null;
    return val._id ? val._id : val;
  };

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const { hash, ...rest } = b;

    // Check prevHash linkage
    if (i > 0 && b.prevHash !== blocks[i - 1].hash) {
      return { valid: false, brokenAtIndex: b.index, totalBlocks: blocks.length, reason: 'prevHash mismatch' };
    }

    // Recompute hash
    // Build the same object that was hashed when the block was created
    const reconstructed = {
      index: rest.index,
      ts: rest.ts,
      userId: normId(rest.userId),
      action: rest.action,
      docId: normId(rest.docId),
      caseId: normId(rest.caseId),
      ipHash: rest.ipHash,
      prevHash: rest.prevHash,
      metadata: rest.metadata || {},
    };
    const recomputed = hashString(JSON.stringify(reconstructed));

    if (recomputed !== hash) {
      return { valid: false, brokenAtIndex: b.index, totalBlocks: blocks.length, reason: 'hash mismatch' };
    }
  }

  return { valid: true, brokenAtIndex: null, totalBlocks: blocks.length };
}


module.exports = { addAudit, verifyChain };
