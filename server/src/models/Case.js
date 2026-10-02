'use strict';

const mongoose = require('mongoose');

const caseSchema = new mongoose.Schema(
  {
    caseNo: { type: String, required: true, unique: true, trim: true },
    firNo: { type: String, default: '', trim: true },
    title: { type: String, required: true, trim: true },
    type: { type: String, default: 'general', trim: true },
    category: {
      type: String,
      enum: ['general', 'sexual_offence', 'trafficking', 'cybercrime', 'homicide', 'other'],
      default: 'general',
    },
    status: {
      type: String,
      enum: ['open', 'investigation', 'charge_sheet', 'in_court', 'closed', 'archived'],
      default: 'open',
    },
    registeredAt: { type: Date, default: Date.now },
    registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    team: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    district: { type: String, default: '', trim: true },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Case', caseSchema);
