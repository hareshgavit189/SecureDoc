'use strict';

const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Master Key
// ---------------------------------------------------------------------------
function getMasterKey() {
  const hex = process.env.MASTER_KEY_HEX || '';
  if (!/^[a-f0-9]{64}$/i.test(hex) || /^0+$/i.test(hex)) {
    throw new Error('MASTER_KEY_HEX must be a non-zero 64-character hexadecimal key');
  }
  return Buffer.from(hex, 'hex');
}

// ---------------------------------------------------------------------------
// AES-256-GCM Envelope Encryption
// ---------------------------------------------------------------------------

/**
 * Encrypt a buffer using AES-256-GCM with envelope encryption.
 * A random per-file data key is generated and wrapped with the master key.
 * @param {Buffer} inputBuffer - plaintext bytes
 * @returns {{ encryptedData: string, iv: string, authTag: string,
 *             wrappedKey: string, wrapIv: string, wrapTag: string }} - all hex
 */
function encryptFile(inputBuffer) {
  const masterKey = getMasterKey();

  // Generate random data key + IV
  const dataKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);

  // Encrypt plaintext
  const cipher = crypto.createCipheriv('aes-256-gcm', dataKey, iv);
  const encrypted = Buffer.concat([cipher.update(inputBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Wrap data key with master key
  const wrapIv = crypto.randomBytes(12);
  const wrap = crypto.createCipheriv('aes-256-gcm', masterKey, wrapIv);
  const wrappedKey = Buffer.concat([wrap.update(dataKey), wrap.final()]);
  const wrapTag = wrap.getAuthTag();

  return {
    encryptedData: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    wrappedKey: wrappedKey.toString('hex'),
    wrapIv: wrapIv.toString('hex'),
    wrapTag: wrapTag.toString('hex'),
  };
}

/**
 * Decrypt a file encrypted by encryptFile().
 * Throws Error('TAMPERED') if authentication fails.
 * @returns {Buffer} plaintext
 */
function decryptFile(encryptedDataHex, ivHex, authTagHex, wrappedKeyHex, wrapIvHex, wrapTagHex) {
  const masterKey = getMasterKey();

  // Unwrap data key
  const wrapIv = Buffer.from(wrapIvHex, 'hex');
  const wrapTag = Buffer.from(wrapTagHex, 'hex');
  const wrappedKey = Buffer.from(wrappedKeyHex, 'hex');

  let dataKey;
  try {
    const unwrap = crypto.createDecipheriv('aes-256-gcm', masterKey, wrapIv);
    unwrap.setAuthTag(wrapTag);
    dataKey = Buffer.concat([unwrap.update(wrappedKey), unwrap.final()]);
  } catch {
    throw new Error('TAMPERED');
  }

  // Decrypt file
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encryptedData = Buffer.from(encryptedDataHex, 'hex');

  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', dataKey, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
  } catch {
    throw new Error('TAMPERED');
  }
}

// ---------------------------------------------------------------------------
// Hashing
// ---------------------------------------------------------------------------
function hashBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function hashString(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

function encryptSecret(secret) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getMasterKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return JSON.stringify({
    iv: iv.toString('hex'),
    data: ciphertext.toString('hex'),
    tag: cipher.getAuthTag().toString('hex'),
  });
}

function decryptSecret(payload) {
  const encrypted = JSON.parse(payload);
  const decipher = crypto.createDecipheriv('aes-256-gcm', getMasterKey(), Buffer.from(encrypted.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(encrypted.tag, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted.data, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}

// ---------------------------------------------------------------------------
// Digital Signatures (ECDSA P-256)
// ---------------------------------------------------------------------------
function generateKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'P-256',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { publicKey, privateKey };
}

function signData(data, privateKeyPem) {
  const sign = crypto.createSign('SHA256');
  sign.update(typeof data === 'string' ? data : JSON.stringify(data));
  sign.end();
  return sign.sign(privateKeyPem, 'hex');
}

function verifySignature(data, signatureHex, publicKeyPem) {
  try {
    const verify = crypto.createVerify('SHA256');
    verify.update(typeof data === 'string' ? data : JSON.stringify(data));
    verify.end();
    return verify.verify(publicKeyPem, signatureHex, 'hex');
  } catch {
    return false;
  }
}

module.exports = {
  getMasterKey,
  encryptFile,
  decryptFile,
  hashBuffer,
  hashString,
  encryptSecret,
  decryptSecret,
  signData,
  verifySignature,
  generateKeyPair,
};
