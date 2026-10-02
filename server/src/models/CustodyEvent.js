'use strict';

const mongoose = require('mongoose');

const custodyEventSchema = new mongoose.Schema({
  itemId: { type: String, required: true }, // document _id or physical evidence ID
  itemType: { type: String, enum: ['document', 'physical'], default: 'document' },
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true },
  ts: { type: String, required: true },   // ISO timestamp
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', default: null },
  prevHash: { type: String, required: true }, // hash of previous custody event
  hash: { type: String, required: true },     // SHA-256 of this event
  location: { type: String, default: '' },
  notes: { type: String, default: '' },
});

custodyEventSchema.index({ itemId: 1, ts: 1 });

module.exports = mongoose.model('CustodyEvent', custodyEventSchema);
