'use strict';

const { verifyChain: verifyAuditChain } = require('../services/ledgerService');
const { getMerkleProof, verifyMerkleProof } = require('../services/merkleService');
const { downloadDecryptedFile } = require('../services/gridfsService');
const { hashBuffer } = require('../services/cryptoService');
const Document = require('../models/Document');
const AuditBlock = require('../models/AuditBlock');
const MerkleBatch = require('../models/MerkleBatch');

// GET /ledger/verify-chain
exports.verifyChain = async (req, res, next) => {
  try {
    const result = await verifyAuditChain();
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// GET /ledger/proof/:docId
exports.getMerkleProof = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.docId);
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });

    // Find audit blocks for this document
    const blocks = await AuditBlock.find({ docId: doc._id }).sort({ index: 1 }).lean();
    if (blocks.length === 0) return res.json({ success: true, data: { message: 'No audit blocks for this document yet' } });

    // Find the MerkleBatch that contains the first block's hash
    const leafHash = blocks[0].hash;
    const batch = await MerkleBatch.findOne({ leaves: leafHash });
    if (!batch) return res.json({ success: true, data: { message: 'Not yet included in a Merkle batch. Run batch job first.' } });

    const idx = batch.leaves.indexOf(leafHash);
    const proof = getMerkleProof(batch.leaves, idx);
    const valid = verifyMerkleProof(leafHash, proof, batch.root);

    res.json({
      success: true,
      data: {
        docId: doc._id,
        leafHash,
        batchId: batch.batchId,
        merkleRoot: batch.root,
        prevRoot: batch.prevRoot,
        proof,
        valid,
        batchCreatedAt: batch.createdAt,
      },
    });
  } catch (err) { next(err); }
};

// GET /public/verify/:hash  (no auth required)
exports.publicVerify = async (req, res, next) => {
  try {
    const { hash } = req.params;
    const doc = await Document.findOne({ sha256: hash, status: 'active' })
      .populate('uploadedBy', 'name role department')
      .populate('caseId', 'caseNo title');

    if (!doc) {
      return res.json({
        success: true,
        data: { found: false, message: 'No document found with this hash' },
      });
    }

    // Try to re-verify integrity
    let intact = true;
    if (doc.fileId) {
      try {
        const plaintext = await downloadDecryptedFile(doc.fileId, {
          iv: doc.iv, authTag: doc.authTag,
          wrappedKey: doc.wrappedKey, wrapIv: doc.wrapIv, wrapTag: doc.wrapTag,
        });
        const recomputed = hashBuffer(plaintext);
        intact = recomputed === hash;
      } catch {
        intact = false;
      }
    } else {
      intact = Boolean(doc.sha256 && doc.sha256 === hash);
    }

    res.json({
      success: true,
      data: {
        found: true,
        intact,
        document: {
          id: doc._id,
          title: doc.title,
          type: doc.type,
          classification: doc.classification,
          sha256: doc.sha256,
          uploadedBy: doc.uploadedBy,
          case: doc.caseId,
          uploadedAt: doc.createdAt,
          version: doc.currentVersion,
        },
        verifiedAt: new Date().toISOString(),
      },
    });
  } catch (err) { next(err); }
};

// GET /ledger/batches
exports.listBatches = async (req, res, next) => {
  try {
    const batches = await MerkleBatch.find().sort({ createdAt: -1 }).limit(50).lean();
    res.json({ success: true, data: batches });
  } catch (err) { next(err); }
};

// POST /ledger/run-batch
exports.runBatchManual = async (req, res, next) => {
  try {
    const { runMerkleBatch } = require('../services/merkleService');
    const batch = await runMerkleBatch();
    res.json({
      success: true,
      data: batch || { message: 'All audit blocks are already anchored in existing Merkle batches.' },
    });
  } catch (err) { next(err); }
};

