'use strict';

const mongoose = require('mongoose');

const shareSchema = new mongoose.Schema(
  {
    docId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    toDepartment: { type: String, default: '' },
    permission: { type: String, enum: ['view', 'download'], default: 'view' },
    expiresAt: { type: Date, required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'expired'],
      default: 'pending',
    },
    watermark: { type: String, default: '' }, // watermark text to overlay on downloads
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Share', shareSchema);
