'use strict';

const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['fir', 'statement', 'charge_sheet', 'court_filing', 'evidence', 'forensic', 'judgment', 'other'],
      default: 'other',
    },
    classification: {
      type: String,
      enum: ['public', 'restricted', 'confidential', 'secret'],
      default: 'restricted',
    },
    tags: [{ type: String, trim: true }],
    currentVersion: { type: Number, default: 1 },
    // GridFS file reference
    fileId: { type: mongoose.Schema.Types.ObjectId },
    sha256: { type: String, default: '' },
    // AES-256-GCM crypto metadata (all hex strings)
    iv: { type: String, default: '' },
    authTag: { type: String, default: '' },
    wrappedKey: { type: String, default: '' },
    wrapIv: { type: String, default: '' },
    wrapTag: { type: String, default: '' },
    originalName: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    fileSize: { type: Number, default: 0 },
    ocrText: { type: String, default: '' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['active', 'archived', 'deleted'],
      default: 'active',
    },
    // e-FIR specific
    firSignedAt: { type: Date },
    firSignDeadline: { type: Date },
  },
  { timestamps: true }
);

// Full-text search index
documentSchema.index({ title: 'text', tags: 'text', ocrText: 'text' });
// Compound query index
documentSchema.index({ caseId: 1, type: 1 });

module.exports = mongoose.model('Document', documentSchema);
