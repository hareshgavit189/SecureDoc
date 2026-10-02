'use strict';

const PDFDocument = require('pdfkit');
const os = require('os');

/**
 * generateSection63Certificate — generates a PDF certificate under
 * Section 63 of the Bharatiya Sakshya Adhiniyam 2023 (BSA 2023),
 * the successor to Section 65B of the Indian Evidence Act.
 *
 * @param {{ document, uploader, caseData }} params
 * @returns {Promise<Buffer>} PDF buffer
 */
function generateSection63Certificate({ document, uploader, caseData }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 60, size: 'A4' });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - 120; // accounting for margins

      // ── Header ──────────────────────────────────────────────────────────
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('CERTIFICATE UNDER SECTION 63', { align: 'center' })
        .fontSize(12)
        .text('Bharatiya Sakshya Adhiniyam, 2023 (BSA 2023)', { align: 'center' })
        .moveDown(0.3)
        .fontSize(10)
        .font('Helvetica')
        .text('(Formerly Section 65B, Indian Evidence Act, 1872)', { align: 'center' })
        .moveDown(1);

      // ── Divider ──────────────────────────────────────────────────────────
      doc
        .moveTo(60, doc.y)
        .lineTo(doc.page.width - 60, doc.y)
        .strokeColor('#333333')
        .stroke()
        .moveDown(1);

      // ── Case Information ─────────────────────────────────────────────────
      doc.font('Helvetica-Bold').fontSize(11).text('Case Information', { underline: true }).moveDown(0.4);

      const caseFields = [
        ['Case Number', caseData.caseNo || 'N/A'],
        ['Case Title', caseData.title || 'N/A'],
        ['FIR Number', caseData.firNo || 'N/A'],
        ['District', caseData.district || 'N/A'],
        ['Case Category', caseData.category || 'N/A'],
        ['Case Status', caseData.status || 'N/A'],
      ];

      doc.font('Helvetica').fontSize(10);
      for (const [label, value] of caseFields) {
        doc.text(`${label}:`, { continued: true, width: pageWidth }).text(`  ${value}`);
      }
      doc.moveDown(0.8);

      // ── Document Information ─────────────────────────────────────────────
      doc.font('Helvetica-Bold').fontSize(11).text('Document Information', { underline: true }).moveDown(0.4);

      const docFields = [
        ['Document Title', document.title || 'N/A'],
        ['Document Type', document.type || 'N/A'],
        ['Classification', document.classification || 'N/A'],
        ['Upload Date', document.createdAt ? new Date(document.createdAt).toUTCString() : 'N/A'],
        ['Document Version', String(document.currentVersion || 1)],
        ['Tags', (document.tags || []).join(', ') || 'None'],
      ];

      doc.font('Helvetica').fontSize(10);
      for (const [label, value] of docFields) {
        doc.text(`${label}:`, { continued: true, width: pageWidth }).text(`  ${value}`);
      }
      doc.moveDown(0.8);

      // ── Integrity Information ────────────────────────────────────────────
      doc.font('Helvetica-Bold').fontSize(11).text('Integrity Information', { underline: true }).moveDown(0.4);
      doc.font('Helvetica').fontSize(10);
      doc.text('SHA-256 Hash:', { continued: false, width: pageWidth });
      doc
        .font('Courier')
        .fontSize(9)
        .text(document.sha256 || 'N/A', { width: pageWidth })
        .font('Helvetica')
        .fontSize(10);
      doc.moveDown(0.8);

      // ── Uploader Information ─────────────────────────────────────────────
      doc.font('Helvetica-Bold').fontSize(11).text('Uploaded By', { underline: true }).moveDown(0.4);

      const uploaderFields = [
        ['Name', uploader.name || 'N/A'],
        ['Email', uploader.email || 'N/A'],
        ['Role', uploader.role || 'N/A'],
        ['Department', uploader.department || 'N/A'],
        ['Clearance', uploader.clearance || 'N/A'],
      ];

      doc.font('Helvetica').fontSize(10);
      for (const [label, value] of uploaderFields) {
        doc.text(`${label}:`, { continued: true, width: pageWidth }).text(`  ${value}`);
      }
      doc.moveDown(0.8);

      // ── System Information ───────────────────────────────────────────────
      doc.font('Helvetica-Bold').fontSize(11).text('System Information', { underline: true }).moveDown(0.4);
      doc.font('Helvetica').fontSize(10);
      doc.text(`Node.js Version:`, { continued: true, width: pageWidth }).text(`  ${process.version}`);
      doc.text(`Hostname:`, { continued: true, width: pageWidth }).text(`  ${os.hostname()}`);
      doc.text(`Certificate Generated At:`, { continued: true, width: pageWidth }).text(`  ${new Date().toUTCString()}`);
      doc.moveDown(0.8);

      // ── Divider ──────────────────────────────────────────────────────────
      doc
        .moveTo(60, doc.y)
        .lineTo(doc.page.width - 60, doc.y)
        .strokeColor('#333333')
        .stroke()
        .moveDown(0.6);

      // ── Certification Statement ──────────────────────────────────────────
      doc.font('Helvetica-Bold').fontSize(11).text('Certification Statement', { underline: true }).moveDown(0.4);
      doc
        .font('Helvetica')
        .fontSize(10)
        .text(
          `I hereby certify that the electronic record described above was produced by the SecureDoc Digital Document Management System. ` +
            `The SHA-256 hash recorded at the time of upload accurately represents the document as received by the system. ` +
            `This certificate is issued in compliance with Section 63 of the Bharatiya Sakshya Adhiniyam, 2023. ` +
            `The document identified above is authentic and its integrity can be verified at the URL below.`,
          { align: 'justify', width: pageWidth }
        )
        .moveDown(0.8);

      // ── Verification URL ─────────────────────────────────────────────────
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('Verification URL (scan or visit):', { width: pageWidth })
        .font('Courier')
        .fontSize(9)
        .fillColor('#0066cc')
        .text(`/public/verify/${document.sha256 || 'N/A'}`, { width: pageWidth })
        .fillColor('black')
        .moveDown(1.5);

      // ── Signature Block ──────────────────────────────────────────────────
      doc
        .font('Helvetica')
        .fontSize(10)
        .text('_______________________________', { width: pageWidth })
        .text('Authorised Signatory')
        .text('SecureDoc DMS — Automated Certificate')
        .text(`Date: ${new Date().toDateString()}`);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateSection63Certificate };
