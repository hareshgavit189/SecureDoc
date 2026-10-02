'use strict';

const mongoose = require('mongoose');

// DocumentHistory stores immutable snapshots of previous document versions.
// Records are never updated or deleted.
const documentHistorySchema = new mongoose.Schema(
  {
    originalDocId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },
    title: { type: String, required: true },
    type: { type: String },
    classification: { type: String },
    tags: [{ type: String }],
    version: { type: Number, required: true },
    fileId: { type: mongoose.Schema.Types.ObjectId },
    sha256: { type: String, default: '' },
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
    replacedAt: { type: Date, default: Date.now },
    replacedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DocumentHistory', documentHistorySchema);
