'use strict';

const Document = require('../models/Document');

const CLEARANCE_ORDER = ['public', 'restricted', 'confidential', 'secret'];

// ---------------------------------------------------------------------------
// GET /search?q=&type=&caseId=&classification=&dateFrom=&dateTo=
// ---------------------------------------------------------------------------
async function search(req, res, next) {
  try {
    const { q, type, caseId, classification, dateFrom, dateTo, page = 1, limit = 20 } = req.query;

    const userClearanceLevel = CLEARANCE_ORDER.indexOf(req.user.clearance);

    // Build filter
    const filter = { status: { $ne: 'deleted' } };

    // Text search
    if (q && q.trim()) {
      filter.$text = { $search: q.trim() };
    }

    if (type) filter.type = type;
    if (caseId) filter.caseId = caseId;
    if (classification) filter.classification = classification;

    // Date range on createdAt
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    // Only return documents at or below the user's clearance level
    const accessibleClassifications = CLEARANCE_ORDER.slice(0, userClearanceLevel + 1);
    filter.classification = { $in: accessibleClassifications };

    // If a specific classification was requested, intersect
    if (classification && accessibleClassifications.includes(classification)) {
      filter.classification = classification;
    } else if (classification && !accessibleClassifications.includes(classification)) {
      // User requested a classification above their level — return empty
      return res.json({ success: true, data: [], total: 0, page: Number(page), pages: 0 });
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [docs, total] = await Promise.all([
      Document.find(filter, q ? { score: { $meta: 'textScore' } } : {})
        .populate('uploadedBy', 'name role')
        .populate('caseId', 'caseNo title')
        .sort(q ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Document.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: docs,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { search };
