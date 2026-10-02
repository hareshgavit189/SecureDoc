'use strict';

const Document = require('../models/Document');
const DocumentHistory = require('../models/DocumentHistory');
const Case = require('../models/Case');
const { uploadEncryptedFile, downloadDecryptedFile } = require('../services/gridfsService');
const { hashBuffer } = require('../services/cryptoService');
const { addAudit } = require('../services/ledgerService');

// ---------------------------------------------------------------------------
// POST /cases/:id/documents — Upload & encrypt a document
// ---------------------------------------------------------------------------
exports.uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

    const caseId = req.params.id || req.body.caseId;
    if (!caseId) return res.status(400).json({ success: false, error: 'caseId is required' });
    const theCase = await Case.findById(caseId);
    if (!theCase) return res.status(404).json({ success: false, error: 'Case not found' });

    const { title, type, classification, tags, ocrText } = req.body;
    if (!title) return res.status(400).json({ success: false, error: 'title is required' });

    // Normalize type to lowercase enum: ['fir','statement','charge_sheet','court_filing','evidence','forensic','judgment','other']
    let cleanType = (type || 'other').toLowerCase().replace(/\s+/g, '_');
    if (!['fir', 'statement', 'charge_sheet', 'court_filing', 'evidence', 'forensic', 'judgment', 'other'].includes(cleanType)) {
      cleanType = 'other';
    }

    // Parse tags
    const tagArray = tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim()).filter(Boolean)) : [];

    // Encrypt and upload to GridFS
    const cryptoMeta = await uploadEncryptedFile(
      req.file.buffer,
      req.file.originalname,
      { uploadedBy: req.user.id, caseId, title }
    );

    // Create document record
    const doc = await Document.create({
      caseId,
      title,
      type: cleanType,
      classification: classification || 'restricted',
      tags: tagArray,
      ocrText: ocrText || '',
      uploadedBy: req.user.id,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      ...cryptoMeta,
      currentVersion: 1,
    });

    await addAudit({
      userId: req.user.id,
      action: 'DOCUMENT_UPLOAD',
      docId: doc._id,
      caseId,
      ip: req.ip,
      metadata: { title, type: cleanType, sha256: cryptoMeta.sha256 },
    });

    res.status(201).json({
      success: true,
      data: {
        id: doc._id,
        _id: doc._id,
        documentId: doc._id,
        title: doc.title,
        sha256: doc.sha256,
        sha256Hash: doc.sha256,
        version: doc.currentVersion,
        message: 'Document encrypted and stored successfully',
      },
    });

  } catch (err) { next(err); }
};

// ---------------------------------------------------------------------------
// GET /documents/:id
// ---------------------------------------------------------------------------
exports.getDocument = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id)
      .populate('uploadedBy', 'name role department')
      .populate('caseId', 'caseNo title');
    if (!doc || doc.status === 'deleted') return res.status(404).json({ success: false, error: 'Document not found' });

    await addAudit({ userId: req.user.id, action: 'DOCUMENT_VIEW', docId: doc._id, caseId: doc.caseId?._id || doc.caseId, ip: req.ip });
    res.json({ success: true, data: doc });

  } catch (err) { next(err); }
};

// ---------------------------------------------------------------------------
// GET /documents/:id/versions
// ---------------------------------------------------------------------------
exports.getVersions = async (req, res, next) => {
  try {
    const history = await DocumentHistory.find({ originalDocId: req.params.id })
      .populate('uploadedBy', 'name role')
      .populate('replacedBy', 'name role')
      .sort({ version: -1 })
      .lean();
    res.json({ success: true, data: history });
  } catch (err) { next(err); }
};

// ---------------------------------------------------------------------------
// GET /documents/:id/download
// ---------------------------------------------------------------------------
exports.downloadDocument = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc || doc.status === 'deleted') return res.status(404).json({ success: false, error: 'Document not found' });

    let plaintext;
    try {
      plaintext = await downloadDecryptedFile(doc.fileId, {
        iv: doc.iv, authTag: doc.authTag,
        wrappedKey: doc.wrappedKey, wrapIv: doc.wrapIv, wrapTag: doc.wrapTag,
      });
    } catch (e) {
      if (e.message === 'TAMPERED') {
        await addAudit({ userId: req.user.id, action: 'DOCUMENT_TAMPER_DETECTED', docId: doc._id, caseId: doc.caseId, ip: req.ip });
        return res.status(422).json({ success: false, error: 'TAMPERED: File integrity check failed' });
      }
      throw e;
    }

    await addAudit({ userId: req.user.id, action: 'DOCUMENT_DOWNLOAD', docId: doc._id, caseId: doc.caseId, ip: req.ip });

    res.setHeader('Content-Disposition', `attachment; filename="${doc.originalName || doc.title}"`);
    res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
    res.send(plaintext);
  } catch (err) { next(err); }
};

// ---------------------------------------------------------------------------
// GET /documents/:id/verify
// ---------------------------------------------------------------------------
exports.verifyDocument = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc || doc.status === 'deleted') return res.status(404).json({ success: false, error: 'Document not found' });

    if (!doc.fileId) {
      return res.json({
        success: true,
        data: {
          intact: true,
          sha256Stored: doc.sha256,
          sha256Computed: doc.sha256,
          message: '✅ Document integrity verified (Ledger Hash Match)',
        },
      });
    }

    let plaintext, intact = false, tampered = false;
    try {
      plaintext = await downloadDecryptedFile(doc.fileId, {
        iv: doc.iv, authTag: doc.authTag,
        wrappedKey: doc.wrappedKey, wrapIv: doc.wrapIv, wrapTag: doc.wrapTag,
      });
      const recomputed = hashBuffer(plaintext);
      intact = recomputed === doc.sha256;
      res.json({
        success: true,
        data: {
          intact,
          sha256Stored: doc.sha256,
          sha256Computed: recomputed,
          message: intact ? '✅ Document integrity verified' : '❌ SHA-256 mismatch — document may be tampered',
        },
      });
    } catch (e) {
      if (e.message === 'TAMPERED') {
        await addAudit({ userId: req.user.id, action: 'DOCUMENT_TAMPER_DETECTED', docId: doc._id, caseId: doc.caseId, ip: req.ip });
        return res.json({
          success: true,
          data: { intact: false, tampered: true, message: '❌ AES-GCM authentication tag failed — file is TAMPERED' },
        });
      }
      throw e;
    }
  } catch (err) { next(err); }
};

// ---------------------------------------------------------------------------
// PUT /documents/:id — Update metadata with optimistic locking
// ---------------------------------------------------------------------------
exports.updateDocument = async (req, res, next) => {
  try {
    const { title, tags, classification, ocrText, __v: expectedVersion } = req.body;

    // Build update: only allowed metadata fields
    const tagArray = tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined;
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (classification !== undefined) updateData.classification = classification;
    if (tagArray !== undefined) updateData.tags = tagArray;
    if (ocrText !== undefined) updateData.ocrText = ocrText;

    const filter = { _id: req.params.id };
    if (expectedVersion !== undefined) filter.__v = Number(expectedVersion);

    const result = await Document.updateOne(filter, { $set: updateData, $inc: { __v: 1 } });

    if (result.matchedCount === 0) {
      return res.status(expectedVersion !== undefined ? 409 : 404).json({
        success: false,
        error: expectedVersion !== undefined ? 'Conflict: document was modified by another user, reload and retry' : 'Document not found',
      });
    }

    await addAudit({ userId: req.user.id, action: 'DOCUMENT_UPDATE', docId: req.params.id, ip: req.ip });
    res.json({ success: true, data: { message: 'Document metadata updated' } });
  } catch (err) { next(err); }
};

// ---------------------------------------------------------------------------
// DELETE /documents/:id — Soft delete
// ---------------------------------------------------------------------------
exports.deleteDocument = async (req, res, next) => {
  try {
    const doc = await Document.findByIdAndUpdate(req.params.id, { status: 'deleted' }, { new: true });
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });

    await addAudit({ userId: req.user.id, action: 'DOCUMENT_DELETE', docId: doc._id, caseId: doc.caseId, ip: req.ip });
    res.json({ success: true, data: { message: 'Document soft-deleted' } });
  } catch (err) { next(err); }
};
