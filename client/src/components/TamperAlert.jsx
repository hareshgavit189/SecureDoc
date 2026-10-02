/**
 * TamperAlert.jsx
 * Dramatic full-width animated alert for tampered documents.
 * Uses pulse-red CSS animation defined in index.css.
 */
import React from 'react';
import { formatDate } from '../utils/formatters';

function TamperAlert({ detectedAt, docTitle }) {
  return (
    <div className="tamper-alert-bar d-flex align-items-center justify-content-between px-3 py-2 mb-3">
      <div className="d-flex align-items-center gap-2">
        <span style={{ fontSize: '1.4rem' }}>⚠️</span>
        <div>
          <div className="fw-bold fs-6">
            DOCUMENT INTEGRITY COMPROMISED — TAMPERED
          </div>
          {docTitle && (
            <div className="small opacity-90">Document: {docTitle}</div>
          )}
        </div>
      </div>
      <div className="text-end">
        <div className="small opacity-90">Detected at</div>
        <div className="fw-semibold small">
          {detectedAt ? formatDate(detectedAt) : formatDate(new Date())}
        </div>
      </div>
    </div>
  );
}

export default TamperAlert;
