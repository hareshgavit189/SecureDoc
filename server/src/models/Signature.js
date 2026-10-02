'use strict';

const mongoose = require('mongoose');

const signatureSchema = new mongoose.Schema(
  {
    docId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    docVersionId: { type: String, default: '' },
    signerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    signature: { type: String, required: true }, // hex-encoded ECDSA signature
    method: { type: String, enum: ['own-key', 'esign'], default: 'own-key' },
    pkcs7Ref: { type: String, default: '' }, // reference to PKCS#7 block for eSign
    signerPublicKey: { type: String, default: '' }, // snapshot of signer's public key
    docHash: { type: String, default: '' }, // SHA-256 of document at time of signing
  },
  { timestamps: true }
);

module.exports = mongoose.model('Signature', signatureSchema);
