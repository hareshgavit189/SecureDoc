'use strict';

const crypto = require('crypto');
const MerkleBatch = require('../models/MerkleBatch');
const AuditBlock = require('../models/AuditBlock');
const { v4: uuidv4 } = require('uuid');

// ---------------------------------------------------------------------------
// Core tree helpers
// ---------------------------------------------------------------------------

const sha = (buf) => crypto.createHash('sha256').update(buf).digest();

/**
 * Build a Merkle tree from an array of hex-string leaf hashes.
 * Returns an array of levels; each level is an array of Buffers.
 * levels[0] = leaves, levels[last] = [root].
 */
function buildMerkleTree(leaves) {
  if (!leaves || leaves.length === 0) return [];

  const bufLeaves = leaves.map((h) => Buffer.from(h, 'hex'));
  const levels = [bufLeaves];

  while (levels[levels.length - 1].length > 1) {
    const cur = levels[levels.length - 1];
    const next = [];
    for (let i = 0; i < cur.length; i += 2) {
      const left = cur[i];
      const right = cur[i + 1] || cur[i]; // duplicate last if odd
      next.push(sha(Buffer.concat([left, right])));
    }
    levels.push(next);
  }

  return levels;
}

/**
 * Get the Merkle root from an array of hex leaf hashes.
 * @returns {string} hex root, or '0'.repeat(64) if empty
 */
function getMerkleRoot(leaves) {
  if (!leaves || leaves.length === 0) return '0'.repeat(64);
  const levels = buildMerkleTree(leaves);
  return levels[levels.length - 1][0].toString('hex');
}

/**
 * Generate a Merkle proof for a leaf at position idx.
 * @param {string[][]} levels - from buildMerkleTree() (but as hex strings for storage)
 * @param {number} idx - leaf index
 * @returns {{ hash: string, left: boolean }[]}
 */
function getMerkleProof(leaves, idx) {
  const levels = buildMerkleTree(leaves);
  const proof = [];

  let i = idx;
  for (let l = 0; l < levels.length - 1; l++) {
    const sibIdx = i % 2 === 0 ? i + 1 : i - 1;
    const sib = levels[l][sibIdx] || levels[l][i]; // handle odd node
    proof.push({ hash: sib.toString('hex'), left: sibIdx < i });
    i = Math.floor(i / 2);
  }
  return proof;
}

/**
 * Verify a Merkle proof.
 * @param {string} leaf - hex
 * @param {{ hash: string, left: boolean }[]} proof
 * @param {string} root - hex
 * @returns {boolean}
 */
function verifyMerkleProof(leaf, proof, root) {
  let h = Buffer.from(leaf, 'hex');
  for (const p of proof) {
    const sibBuf = Buffer.from(p.hash, 'hex');
    h = p.left ? sha(Buffer.concat([sibBuf, h])) : sha(Buffer.concat([h, sibBuf]));
  }
  return h.toString('hex') === root;
}

// ---------------------------------------------------------------------------
// Batch job: collect unbatched audit blocks and anchor into a Merkle batch
// ---------------------------------------------------------------------------

/**
 * Find all audit block hashes not yet included in a batch,
 * build a Merkle tree, and save a MerkleBatch record.
 */
async function runMerkleBatch() {
  // Get hashes already covered by existing batches
  const batches = await MerkleBatch.find({}, { leaves: 1 }).lean();
  const coveredLeaves = new Set(batches.flatMap((b) => b.leaves));

  // Gather uncovered audit block hashes
  const allBlocks = await AuditBlock.find({}, { hash: 1 }).sort({ index: 1 }).lean();
  const newLeaves = allBlocks.map((b) => b.hash).filter((h) => !coveredLeaves.has(h));

  if (newLeaves.length === 0) {
    console.log('[Merkle] No new leaves to batch.');
    return null;
  }

  // Get the previous batch's root
  const lastBatch = await MerkleBatch.findOne().sort({ createdAt: -1 }).lean();
  const prevRoot = lastBatch ? lastBatch.root : '0'.repeat(64);

  const root = getMerkleRoot(newLeaves);

  const batch = await MerkleBatch.create({
    batchId: uuidv4(),
    leafCount: newLeaves.length,
    leaves: newLeaves,
    root,
    prevRoot,
    anchorRef: '',
    createdAt: new Date(),
  });

  console.log(`[Merkle] Batch created: ${batch.batchId} | ${newLeaves.length} leaves | root: ${root.slice(0, 16)}...`);
  return batch;
}

module.exports = {
  buildMerkleTree,
  getMerkleRoot,
  getMerkleProof,
  verifyMerkleProof,
  runMerkleBatch,
};
