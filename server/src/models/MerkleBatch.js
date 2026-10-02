'use strict';

const mongoose = require('mongoose');

const merkleBatchSchema = new mongoose.Schema({
  batchId: { type: String, required: true, unique: true },
  leafCount: { type: Number, required: true },
  leaves: [{ type: String }], // audit block hashes included in this batch
  root: { type: String, required: true },
  prevRoot: { type: String, default: '0'.repeat(64) },
  anchorRef: { type: String, default: '' }, // optional testnet tx hash
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('MerkleBatch', merkleBatchSchema);
