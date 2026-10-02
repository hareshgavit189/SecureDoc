'use strict';

const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const { encryptFile, decryptFile, hashBuffer } = require('./cryptoService');

/**
 * Get a GridFSBucket instance using the mongoose connection's underlying db.
 */
function getGridFSBucket() {
  return new GridFSBucket(mongoose.connection.db, { bucketName: 'fs', chunkSizeBytes: 255 * 1024 });
}

/**
 * Encrypt a file buffer and upload to GridFS.
 * Returns all crypto metadata needed for later decryption.
 *
 * @param {Buffer} fileBuffer - raw file bytes
 * @param {string} filename - original filename
 * @param {object} metadata - extra metadata to store with the file
 * @returns {{ fileId, sha256, iv, authTag, wrappedKey, wrapIv, wrapTag }}
 */
async function uploadEncryptedFile(fileBuffer, filename, metadata = {}) {
  // Compute SHA-256 of original (pre-encryption) bytes
  const sha256 = hashBuffer(fileBuffer);

  // Encrypt
  const { encryptedData, iv, authTag, wrappedKey, wrapIv, wrapTag } = encryptFile(fileBuffer);
  const encryptedBuffer = Buffer.from(encryptedData, 'hex');

  // Upload to GridFS
  const bucket = getGridFSBucket();
  const uploadStream = bucket.openUploadStream(filename, {
    metadata: { ...metadata, sha256, iv, authTag, wrappedKey, wrapIv, wrapTag, encrypted: true },
  });

  await new Promise((resolve, reject) => {
    uploadStream.on('finish', resolve);
    uploadStream.on('error', reject);
    uploadStream.end(encryptedBuffer);
  });

  return {
    fileId: uploadStream.id,
    sha256,
    iv,
    authTag,
    wrappedKey,
    wrapIv,
    wrapTag,
  };
}

/**
 * Download a file from GridFS and decrypt it.
 * Throws Error('TAMPERED') if decryption authentication fails.
 *
 * @param {mongoose.Types.ObjectId|string} fileId
 * @param {{ iv, authTag, wrappedKey, wrapIv, wrapTag }} cryptoMeta - hex strings
 * @returns {Buffer} - plaintext file bytes
 */
async function downloadDecryptedFile(fileId, cryptoMeta) {
  const bucket = getGridFSBucket();
  const downloadStream = bucket.openDownloadStream(
    typeof fileId === 'string' ? new mongoose.Types.ObjectId(fileId) : fileId
  );

  const chunks = [];
  await new Promise((resolve, reject) => {
    downloadStream.on('data', (chunk) => chunks.push(chunk));
    downloadStream.on('end', resolve);
    downloadStream.on('error', reject);
  });

  const encryptedBuffer = Buffer.concat(chunks);
  const { iv, authTag, wrappedKey, wrapIv, wrapTag } = cryptoMeta;

  // decryptFile throws 'TAMPERED' if auth tag fails
  return decryptFile(
    encryptedBuffer.toString('hex'),
    iv, authTag, wrappedKey, wrapIv, wrapTag
  );
}

/**
 * Delete a file from GridFS by its ObjectId.
 */
async function deleteFile(fileId) {
  const bucket = getGridFSBucket();
  await bucket.delete(
    typeof fileId === 'string' ? new mongoose.Types.ObjectId(fileId) : fileId
  );
}

module.exports = { getGridFSBucket, uploadEncryptedFile, downloadDecryptedFile, deleteFile };
