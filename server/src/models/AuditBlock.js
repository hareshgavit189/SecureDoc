'use strict';

const mongoose = require('mongoose');

// Each block is immutable once inserted. No update or delete routes exist for this collection.
const auditBlockSchema = new mongoose.Schema(
  {
    index: { type: Number, required: true, unique: true },
    ts: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    action: { type: String, required: true },
    docId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', default: null },
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', default: null },
    ipHash: { type: String, default: '' },
    prevHash: { type: String, required: true },
    hash: { type: String, required: true, unique: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: false,  // ts field is managed manually for chain integrity
    // Disable update/replace operations at schema level as a safeguard
  }
);

auditBlockSchema.index({ docId: 1, ts: -1 });
auditBlockSchema.index({ caseId: 1, ts: -1 });
auditBlockSchema.index({ userId: 1, ts: -1 });

module.exports = mongoose.model('AuditBlock', auditBlockSchema);
