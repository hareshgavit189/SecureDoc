'use strict';

const mongoose = require('mongoose');
const Document = require('../models/Document');
const Case = require('../models/Case');
const User = require('../models/User');
const { generateSection63Certificate } = require('../services/certificateService');

// ---------------------------------------------------------------------------
// GET /documents/:id/certificate
// ---------------------------------------------------------------------------
async function getCertificate(req, res, next) {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc || doc.status === 'deleted') {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    const [uploader, caseData] = await Promise.all([
      User.findById(doc.uploadedBy).select('name email role department clearance'),
      Case.findById(doc.caseId).select('caseNo firNo title category status district'),
    ]);

    const pdfBuffer = await generateSection63Certificate({
      document: doc.toObject(),
      uploader: uploader ? uploader.toObject() : { name: 'Unknown', email: '', role: '', department: '', clearance: '' },
      caseData: caseData ? caseData.toObject() : { caseNo: 'N/A', firNo: '', title: 'N/A', category: '', status: '', district: '' },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Section63_Certificate_${doc._id}.pdf"`
    );
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
}

module.exports = { getCertificate, generateCertificate: getCertificate };

