'use strict';

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'sp', 'sho', 'io', 'forensic', 'prosecutor', 'court', 'auditor', 'citizen'],
      default: 'io',
    },
    department: { type: String, default: '' },
    clearance: {
      type: String,
      enum: ['public', 'restricted', 'confidential', 'secret'],
      default: 'restricted',
    },
    totpSecret: { type: String, default: '' },
    totpEnabled: { type: Boolean, default: false },
    publicKey: { type: String, default: '' },
    encPrivateKey: { type: String, default: '' },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    refreshTokenHash: { type: String, default: '' },
  },
  { timestamps: true }
);

// Virtual: is the account currently locked?
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

module.exports = mongoose.model('User', userSchema);
