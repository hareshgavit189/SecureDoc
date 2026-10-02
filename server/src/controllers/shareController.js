'use strict';

const Share = require('../models/Share');
const Document = require('../models/Document');
const { addAudit } = require('../services/ledgerService');

// ---------------------------------------------------------------------------
// POST /shares — Create share request
// ---------------------------------------------------------------------------
async function createShare(req, res, next) {
  try {
    const { docId, toUser, toDepartment, permission, expiresAt, watermark } = req.body;

    const doc = await Document.findById(docId);
    if (!doc || doc.status === 'deleted') {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    if (!toUser && !toDepartment) {
      return res.status(400).json({ success: false, error: 'Either toUser or toDepartment is required' });
    }
    if (!expiresAt) {
      return res.status(400).json({ success: false, error: 'expiresAt is required' });
    }

    const share = await Share.create({
      docId,
      fromUser: req.user.id,
      toUser: toUser || undefined,
      toDepartment: toDepartment || '',
      permission: permission || 'view',
      expiresAt: new Date(expiresAt),
      watermark: watermark || '',
    });

    await addAudit({
      userId: req.user.id,
      action: 'SHARE_CREATE',
      docId: doc._id,
      caseId: doc.caseId,
      ip: req.ip,
      metadata: { shareId: share._id, toUser, toDepartment, permission },
    });

    return res.status(201).json({ success: true, data: share });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /shares — List shares for current user (as sender or recipient)
// ---------------------------------------------------------------------------
async function listShares(req, res, next) {
  try {
    const userId = req.user.id;
    const department = req.user.department;

    const shares = await Share.find({
      $or: [
        { fromUser: userId },
        { toUser: userId },
        { toDepartment: department, toDepartment: { $ne: '' } },
      ],
    })
      .populate('docId', 'title type classification')
      .populate('fromUser', 'name role')
      .populate('toUser', 'name role department')
      .populate('approvedBy', 'name role')
      .sort({ createdAt: -1 });

    // Mark expired
    const now = new Date();
    const results = shares.map((s) => {
      const obj = s.toObject();
      if (s.status === 'approved' && s.expiresAt < now) {
        obj.status = 'expired';
      }
      return obj;
    });

    return res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// PUT /shares/:id/approve
// ---------------------------------------------------------------------------
async function approveShare(req, res, next) {
  try {
    const share = await Share.findById(req.params.id);
    if (!share) return res.status(404).json({ success: false, error: 'Share not found' });
    if (share.status !== 'pending') {
      return res.status(400).json({ success: false, error: `Share is already ${share.status}` });
    }

    share.status = 'approved';
    share.approvedBy = req.user.id;
    share.approvedAt = new Date();
    await share.save();

    await addAudit({
      userId: req.user.id,
      action: 'SHARE_APPROVE',
      docId: share.docId,
      ip: req.ip,
      metadata: { shareId: share._id },
    });

    return res.json({ success: true, data: share });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// PUT /shares/:id/reject
// ---------------------------------------------------------------------------
async function rejectShare(req, res, next) {
  try {
    const share = await Share.findById(req.params.id);
    if (!share) return res.status(404).json({ success: false, error: 'Share not found' });
    if (share.status !== 'pending') {
      return res.status(400).json({ success: false, error: `Share is already ${share.status}` });
    }

    share.status = 'rejected';
    await share.save();

    await addAudit({
      userId: req.user.id,
      action: 'SHARE_REJECT',
      docId: share.docId,
      ip: req.ip,
      metadata: { shareId: share._id },
    });

    return res.json({ success: true, data: share });
  } catch (err) {
    next(err);
  }
}

module.exports = { createShare, listShares, approveShare, rejectShare };
