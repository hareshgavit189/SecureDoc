'use strict';

const Document = require('../models/Document');
const User = require('../models/User');
const Signature = require('../models/Signature');
const { generateKeyPair, signData, verifySignature } = require('../services/cryptoService');
const { addAudit } = require('../services/ledgerService');
const { v4: uuidv4 } = require('uuid');

// In-memory challenge store (use Redis in production)
const pendingChallenges = new Map();

// POST /documents/:id/sign
exports.signDocument = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc || doc.status === 'deleted') return res.status(404).json({ success: false, error: 'Document not found' });

    const user = await User.findById(req.user.id);

    // Generate key pair if user doesn't have one
    if (!user.publicKey || !user.encPrivateKey) {
      const { publicKey, privateKey } = generateKeyPair();
      await User.updateOne({ _id: user._id }, { publicKey, encPrivateKey: privateKey }); // In prod: encrypt privateKey with scrypt
      user.publicKey = publicKey;
      user.encPrivateKey = privateKey;
    }

    // Sign the document's SHA-256 hash
    const signature = signData(doc.sha256, user.encPrivateKey);
    const isValid = verifySignature(doc.sha256, signature, user.publicKey);

    if (!isValid) return res.status(500).json({ success: false, error: 'Signature verification failed' });

    const sig = await Signature.create({
      docId: doc._id,
      docVersionId: `v${doc.currentVersion}`,
      signerId: user._id,
      signature,
      method: 'own-key',
      signerPublicKey: user.publicKey,
      docHash: doc.sha256,
    });

    await addAudit({
      userId: user._id,
      action: 'DOCUMENT_SIGN',
      docId: doc._id,
      caseId: doc.caseId,
      ip: req.ip,
      metadata: { method: 'own-key', signatureId: sig._id },
    });

    res.json({
      success: true,
      data: {
        signatureId: sig._id,
        signature: signature.slice(0, 32) + '...',
        method: 'own-key',
        message: 'Document signed successfully with ECDSA P-256',
      },
    });
  } catch (err) { next(err); }
};

// GET /documents/:id/signatures
exports.getSignatures = async (req, res, next) => {
  try {
    const sigs = await Signature.find({ docId: req.params.id })
      .populate('signerId', 'name role department')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: sigs });
  } catch (err) { next(err); }
};

// POST /esign/initiate — Mock Aadhaar eSign flow
exports.initiateESign = async (req, res, next) => {
  try {
    const { docId } = req.body;
    const doc = await Document.findById(docId);
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });

    const challengeId = uuidv4();
    pendingChallenges.set(challengeId, {
      docId: doc._id.toString(),
      docHash: doc.sha256,
      userId: req.user.id,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 min
    });

    // In a real system, redirect to a licensed ESP's URL
    const redirectUrl = `http://localhost:5173/mock-esp?challenge=${challengeId}&hash=${doc.sha256}`;

    res.json({
      success: true,
      data: {
        challengeId,
        redirectUrl,
        message: 'MOCK eSign initiated. In production, this redirects to a CCA-licensed ESP.',
      },
    });
  } catch (err) { next(err); }
};

// POST /esign/callback — Mock ESP returns signed block
exports.esignCallback = async (req, res, next) => {
  try {
    const { challengeId, mockSignature, signerName } = req.body;
    const challenge = pendingChallenges.get(challengeId);

    if (!challenge || Date.now() > challenge.expiresAt) {
      return res.status(400).json({ success: false, error: 'Invalid or expired challenge' });
    }

    pendingChallenges.delete(challengeId);

    // In a real system, verify the PKCS#7 signature from ESP
    const sig = await Signature.create({
      docId: challenge.docId,
      docVersionId: 'esign',
      signerId: challenge.userId,
      signature: mockSignature || 'MOCK_ESIGN_SIG_' + challengeId,
      method: 'esign',
      pkcs7Ref: 'MOCK_PKCS7_' + challengeId,
      docHash: challenge.docHash,
    });

    await addAudit({
      userId: challenge.userId,
      action: 'DOCUMENT_ESIGN',
      docId: challenge.docId,
      ip: req.ip,
      metadata: { challengeId, method: 'esign' },
    });

    res.json({ success: true, data: { signatureId: sig._id, message: 'Mock eSign complete' } });
  } catch (err) { next(err); }
};
