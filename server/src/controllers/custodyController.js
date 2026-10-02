'use strict';

const CustodyEvent = require('../models/CustodyEvent');
const { hashString } = require('../services/cryptoService');
const { addAudit } = require('../services/ledgerService');

// ---------------------------------------------------------------------------
// POST /custody — Record a custody transfer
// ---------------------------------------------------------------------------
async function recordCustody(req, res, next) {
  try {
    const { itemId, itemType, reason, caseId } = req.body;
    const toUser = req.body.toUser || req.body.to;

    if (!itemId || !toUser || !reason) {
      return res.status(400).json({ success: false, error: 'itemId, to/toUser, and reason are required' });
    }

    // Get last event for this item to chain hashes
    const lastEvent = await CustodyEvent.findOne({ itemId }).sort({ ts: -1 }).lean();
    const prevHash = lastEvent ? lastEvent.hash : '0'.repeat(64);
    const ts = new Date().toISOString();

    // Build hashable block
    const blockData = {
      itemId,
      itemType: itemType || 'document',
      from: req.user.id,
      to: toUser,
      reason,
      ts,
      prevHash,
    };

    const hash = hashString(JSON.stringify(blockData));

    const event = await CustodyEvent.create({
      itemId,
      itemType: itemType || 'document',
      from: req.user.id,
      to: toUser,
      reason,
      ts,
      prevHash,
      hash,
      caseId: caseId || null,
    });


    await addAudit({
      userId: req.user.id,
      action: 'CUSTODY_TRANSFER',
      caseId: caseId || null,
      ip: req.ip,
      metadata: { itemId, itemType, toUser, reason },
    });

    return res.status(201).json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /custody/:itemId — Get full custody chain
// ---------------------------------------------------------------------------
async function getCustodyChain(req, res, next) {
  try {
    const { itemId } = req.params;

    const events = await CustodyEvent.find({ itemId })
      .populate('from', 'name role department')
      .populate('to', 'name role department')
      .populate('caseId', 'caseNo title')
      .sort({ ts: 1 });

    // Verify chain integrity
    let chainIntact = true;
    let prevHash = '0'.repeat(64);

    for (const event of events) {
      const blockData = {
        itemId: event.itemId,
        itemType: event.itemType,
        from: event.from?._id?.toString() || event.from?.toString(),
        to: event.to?._id?.toString() || event.to?.toString(),
        reason: event.reason,
        ts: event.ts,
        prevHash: event.prevHash,
      };
      const expectedHash = hashString(JSON.stringify(blockData));

      if (event.hash !== expectedHash || event.prevHash !== prevHash) {
        chainIntact = false;
        break;
      }
      prevHash = event.hash;
    }

    return res.json({
      success: true,
      data: {
        itemId,
        chainIntact,
        events,
        totalEvents: events.length,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { recordCustody, getCustodyChain };
