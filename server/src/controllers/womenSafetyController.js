'use strict';

const { v4: uuidv4 } = require('uuid');
const Case = require('../models/Case');
const Document = require('../models/Document');

// ---------------------------------------------------------------------------
// NDSO sample records (mock — replace with actual database/API in production)
// ---------------------------------------------------------------------------
const NDSO_RECORDS = [
  { name: 'Ravi Kumar', dob: '1985-03-12', crimes: ['sexual_offence'], registered: true },
  { name: 'Suresh Sharma', dob: '1979-07-22', crimes: ['trafficking'], registered: true },
  { name: 'Anil Verma', dob: '1990-11-05', crimes: ['sexual_offence', 'trafficking'], registered: true },
  { name: 'Deepak Singh', dob: '1983-02-28', crimes: ['cybercrime'], registered: true },
  { name: 'Mohan Lal', dob: '1975-09-15', crimes: ['sexual_offence'], registered: true },
];

// ---------------------------------------------------------------------------
// Helper — days since a date
// ---------------------------------------------------------------------------
function daysSince(date) {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// GET /deadlines
// ---------------------------------------------------------------------------
async function getDeadlines(req, res, next) {
  try {
    const cases = await Case.find({
      status: { $nin: ['closed', 'archived'] },
    })
      .populate('registeredBy', 'name role')
      .lean();

    const results = cases.map((c) => {
      const days = daysSince(c.registeredAt);
      let chargeSheetStatus = null;
      let bailRisk = null;

      // Sexual offence cases — charge sheet deadlines (CrPC/BNSS mandate 60 days)
      if (c.category === 'sexual_offence') {
        if (days < 45) chargeSheetStatus = 'green';
        else if (days < 50) chargeSheetStatus = 'amber';
        else if (days < 60) chargeSheetStatus = 'orange';
        else chargeSheetStatus = 'red';
      }

      // Default bail risk — BNSS s.187 (60 day / 90 day limits)
      const bail60Day = days >= 60;
      const bail90Day = days >= 90;
      if (bail90Day) bailRisk = 'critical'; // must file charge sheet or release
      else if (bail60Day) bailRisk = 'high';
      else bailRisk = 'normal';

      return {
        caseId: c._id,
        caseNo: c.caseNo,
        title: c.title,
        category: c.category,
        status: c.status,
        daysOpen: days,
        registeredAt: c.registeredAt,
        chargeSheetStatus,
        bailRisk,
      };
    });

    // e-FIR signature deadlines — documents of type 'fir' not yet signed
    const pendingFirDocs = await Document.find({
      type: 'fir',
      status: 'active',
      firSignedAt: { $exists: false },
      firSignDeadline: { $exists: true },
    })
      .populate('caseId', 'caseNo title')
      .lean();

    const firDeadlines = pendingFirDocs.map((d) => ({
      docId: d._id,
      title: d.title,
      caseNo: d.caseId?.caseNo,
      firSignDeadline: d.firSignDeadline,
      daysRemaining: Math.ceil((new Date(d.firSignDeadline) - Date.now()) / (1000 * 60 * 60 * 24)),
      overdue: d.firSignDeadline < new Date(),
    }));

    return res.json({
      success: true,
      data: {
        cases: results,
        firSignatureDeadlines: firDeadlines,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /transfers — Mock Zero FIR transfer
// ---------------------------------------------------------------------------
async function zeroFirTransfer(req, res, next) {
  try {
    const { caseId, targetStationCode, targetStationName, reason } = req.body;

    if (!caseId || !targetStationCode) {
      return res.status(400).json({ success: false, error: 'caseId and targetStationCode are required' });
    }

    const caseData = await Case.findById(caseId);
    if (!caseData) return res.status(404).json({ success: false, error: 'Case not found' });

    // Simulate encryption of case bundle (in production, encrypt actual documents)
    const bundle = {
      caseNo: caseData.caseNo,
      title: caseData.title,
      category: caseData.category,
      district: caseData.district,
      transferredAt: new Date().toISOString(),
      targetStation: targetStationCode,
      reason: reason || 'Zero FIR jurisdiction transfer',
    };

    const transferId = uuidv4();

    // In production: encrypt bundle, send to target station via secure channel
    // Here we simulate a successful transfer
    console.log(`[Zero FIR Transfer] ${transferId}: Case ${caseData.caseNo} → ${targetStationName || targetStationCode}`);

    return res.json({
      success: true,
      data: {
        transferId,
        status: 'transferred',
        caseNo: caseData.caseNo,
        targetStation: targetStationCode,
        targetStationName: targetStationName || targetStationCode,
        transferredAt: bundle.transferredAt,
        bundleRef: `bundle_${transferId}`, // reference to encrypted bundle in production
      },
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /ndso/check?name=&dob=
// ---------------------------------------------------------------------------
async function ndsoCheck(req, res, next) {
  try {
    const { name, dob } = req.query;

    if (!name && !dob) {
      return res.status(400).json({ success: false, error: 'Provide at least name or dob for NDSO check' });
    }

    const matches = NDSO_RECORDS.filter((r) => {
      const nameMatch = name
        ? r.name.toLowerCase().includes(name.toLowerCase())
        : true;
      const dobMatch = dob ? r.dob === dob : true;
      return nameMatch && dobMatch;
    });

    return res.json({
      success: true,
      data: {
        query: { name, dob },
        totalMatches: matches.length,
        matches: matches.map((m) => ({
          name: m.name,
          dob: m.dob,
          offenceTypes: m.crimes,
          registeredOffender: m.registered,
        })),
        disclaimer: 'This is mock NDSO data for development. Connect to actual NDSO API in production.',
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getDeadlines, zeroFirTransfer, ndsoCheck };
