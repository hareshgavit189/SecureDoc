'use strict';

const Case = require('../models/Case');
const Document = require('../models/Document');
const AuditBlock = require('../models/AuditBlock');
const { addAudit } = require('../services/ledgerService');

// GET /cases
exports.listCases = async (req, res, next) => {
  try {
    const { status, category, q } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (q) filter.$or = [
      { title: { $regex: q, $options: 'i' } },
      { caseNo: { $regex: q, $options: 'i' } },
      { firNo: { $regex: q, $options: 'i' } },
    ];

    // Non-admin/SP/SHO users only see cases they are on the team of
    if (!['admin', 'sp', 'sho', 'auditor'].includes(req.user.role)) {
      filter.team = req.user.id;
    }

    const cases = await Case.find(filter)
      .populate('registeredBy', 'name role')
      .populate('team', 'name role department')
      .sort({ registeredAt: -1 })
      .lean();

    res.json({ success: true, data: cases });
  } catch (err) { next(err); }
};

// POST /cases
exports.createCase = async (req, res, next) => {
  try {
    const { caseNo, firNo, title, type, category, district, description, team } = req.body;
    if (!caseNo || !title) return res.status(400).json({ success: false, error: 'caseNo and title are required' });

    const c = await Case.create({
      caseNo, firNo, title, type, category, district, description,
      registeredBy: req.user.id,
      team: team || [req.user.id],
    });

    await addAudit({ userId: req.user.id, action: 'CASE_CREATE', caseId: c._id, ip: req.ip, metadata: { caseNo } });

    res.status(201).json({ success: true, data: c });
  } catch (err) { next(err); }
};

// GET /cases/:id
exports.getCase = async (req, res, next) => {
  try {
    const c = await Case.findById(req.params.id)
      .populate('registeredBy', 'name role department')
      .populate('team', 'name role department email');
    if (!c) return res.status(404).json({ success: false, error: 'Case not found' });

    // Check access
    const isTeam = c.team.some((m) => m._id.toString() === req.user.id);
    const hasAccess = ['admin', 'sp', 'sho', 'auditor'].includes(req.user.role) || isTeam;
    if (!hasAccess) return res.status(403).json({ success: false, error: 'Access denied' });

    await addAudit({ userId: req.user.id, action: 'CASE_VIEW', caseId: c._id, ip: req.ip });
    res.json({ success: true, data: c });
  } catch (err) { next(err); }
};

// PUT /cases/:id
exports.updateCase = async (req, res, next) => {
  try {
    const { title, status, category, district, description, firNo } = req.body;
    const c = await Case.findByIdAndUpdate(
      req.params.id,
      { title, status, category, district, description, firNo },
      { new: true, runValidators: true }
    );
    if (!c) return res.status(404).json({ success: false, error: 'Case not found' });

    await addAudit({ userId: req.user.id, action: 'CASE_UPDATE', caseId: c._id, ip: req.ip, metadata: { status } });
    res.json({ success: true, data: c });
  } catch (err) { next(err); }
};

// POST /cases/:id/team
exports.updateTeam = async (req, res, next) => {
  try {
    const { add = [], remove = [] } = req.body;
    const c = await Case.findById(req.params.id);
    if (!c) return res.status(404).json({ success: false, error: 'Case not found' });

    const teamSet = new Set(c.team.map((id) => id.toString()));
    add.forEach((id) => teamSet.add(id));
    remove.forEach((id) => teamSet.delete(id));

    c.team = Array.from(teamSet);
    await c.save();

    await addAudit({ userId: req.user.id, action: 'CASE_TEAM_UPDATE', caseId: c._id, ip: req.ip, metadata: { add, remove } });
    res.json({ success: true, data: { team: c.team } });
  } catch (err) { next(err); }
};

// GET /cases/:id/documents
exports.getCaseDocuments = async (req, res, next) => {
  try {
    const docs = await Document.find({ caseId: req.params.id, status: { $ne: 'deleted' } })
      .populate('uploadedBy', 'name role')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: docs });
  } catch (err) { next(err); }
};

// GET /cases/:id/timeline
exports.getCaseTimeline = async (req, res, next) => {
  try {
    const events = await AuditBlock.find({ caseId: req.params.id })
      .populate('userId', 'name role')
      .sort({ index: -1 })
      .limit(100)
      .lean();
    res.json({ success: true, data: events });
  } catch (err) { next(err); }
};
