/**
 * SearchPage.jsx
 * Advanced Legal Document & OCR Full-Text Search.
 * Queries title, tags, and OCR text extracted from evidentiary assets,
 * respecting clearance levels and classification bounds.
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance, { API_BASE } from '../api/axiosInstance';
import ClassificationBadge from '../components/ClassificationBadge';
import HashDisplay from '../components/HashDisplay';
import { formatDate } from '../utils/formatters';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [docType, setDocType] = useState('');
  const [classification, setClassification] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const executeSearch = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (query.trim()) params.q = query.trim();
      if (docType) params.type = docType;
      if (classification) params.classification = classification;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const res = await axiosInstance.get('/search', { params });
      if (res.data?.success) {
        setResults(res.data.data || []);
        setTotal(res.data.total || 0);
        setSearched(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Search failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial load: show recent documents
    executeSearch();
  }, []);

  const handleReset = () => {
    setQuery('');
    setDocType('');
    setClassification('');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div className="container-fluid p-4">
      {/* Header */}
      <div className="mb-4">
        <h2 className="fw-bold mb-1">🔍 Advanced Legal Document & OCR Search</h2>
        <p className="text-muted small mb-0">
          Full-text indexing over document titles, forensic tags, and OCR-extracted witness statements / FIRs
        </p>
      </div>

      {/* Filter Form Card */}
      <div className="card shadow-sm border-0 mb-4 bg-light">
        <div className="card-body p-4">
          <form onSubmit={executeSearch}>
            {/* Primary Search Bar */}
            <div className="input-group input-group-lg mb-3">
              <span className="input-group-text bg-white border-end-0">
                🔎
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search by keywords, witness names, BNS sections, vehicle numbers, forensic findings..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button className="btn btn-primary px-4 fw-semibold" type="submit" disabled={loading}>
                {loading ? <span className="spinner-border spinner-border-sm" /> : 'Search Ledger'}
              </button>
            </div>

            {/* Filter Row */}
            <div className="row g-3">
              <div className="col-md-3">
                <label className="form-label small fw-semibold text-secondary">Document Category</label>
                <select
                  className="form-select form-select-sm"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                >
                  <option value="">All Document Types</option>
                  <option value="fir">FIR / e-FIR</option>
                  <option value="statement">Witness Statement (s.180 BNSS)</option>
                  <option value="charge_sheet">Charge Sheet (s.193 BNSS)</option>
                  <option value="forensic">Forensic Report (FSL)</option>
                  <option value="court_filing">Court Filing / Bail Order</option>
                  <option value="evidence">Digital Evidence Asset</option>
                  <option value="judgment">Court Judgment</option>
                </select>
              </div>

              <div className="col-md-3">
                <label className="form-label small fw-semibold text-secondary">Security Classification</label>
                <select
                  className="form-select form-select-sm"
                  value={classification}
                  onChange={(e) => setClassification(e.target.value)}
                >
                  <option value="">All Clearances</option>
                  <option value="public">Public</option>
                  <option value="restricted">Restricted</option>
                  <option value="confidential">Confidential</option>
                  <option value="secret">Secret</option>
                </select>
              </div>

              <div className="col-md-3">
                <label className="form-label small fw-semibold text-secondary">Registered From</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              <div className="col-md-3">
                <label className="form-label small fw-semibold text-secondary">Registered To</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>

            {/* Reset / Actions */}
            <div className="d-flex justify-content-end gap-2 mt-3">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={handleReset}
              >
                Clear Filters
              </button>
            </div>
          </form>

          {error && <div className="alert alert-danger mt-3 py-2 small mb-0">{error}</div>}
        </div>
      </div>

      {/* Results Section */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white py-3 d-flex align-items-center justify-content-between">
          <span className="fw-bold">
            {searched ? `Found ${total} Matching Records` : 'Recent Ingested Documents'}
          </span>
          <span className="small text-muted">
            Displaying Page 1 of {Math.ceil(total / 20) || 1}
          </span>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <span className="spinner-border text-primary me-2" />
              Searching indexed evidence repository...
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <div className="fs-1 mb-2">📂</div>
              <h5>No Documents Match Your Query</h5>
              <p className="small text-muted">
                Try widening date ranges or removing specific security classification filters.
              </p>
            </div>
          ) : (
            <div className="list-group list-group-flush">
              {results.map((doc) => (
                <div key={doc._id} className="list-group-item p-3 list-group-item-action">
                  <div className="d-flex align-items-start justify-content-between gap-3">
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                        <Link
                          to={`/documents/${doc._id}`}
                          className="fw-bold text-primary fs-6 text-decoration-none"
                        >
                          {doc.title}
                        </Link>
                        <span className="badge bg-secondary text-uppercase" style={{ fontSize: '0.65rem' }}>
                          {doc.type}
                        </span>
                        <ClassificationBadge classification={doc.classification} />
                        <span className="badge bg-light text-dark border">
                          v{doc.currentVersion}
                        </span>
                      </div>

                      <div className="small text-muted mb-2">
                        Case:{' '}
                        <strong>
                          {doc.caseId?.caseNo || 'Unassigned'} — {doc.caseId?.title || ''}
                        </strong>
                        <span className="mx-2">•</span>
                        Uploaded by: {doc.uploadedBy?.name || 'Officer'}
                        <span className="mx-2">•</span>
                        {formatDate(doc.createdAt)}
                      </div>

                      {/* OCR Text Snippet if available */}
                      {doc.ocrText && (
                        <div
                          className="p-2 rounded bg-light border text-secondary small font-monospace mb-2"
                          style={{ maxHeight: '70px', overflow: 'hidden' }}
                        >
                          <span className="fw-bold text-dark font-sans-serif">OCR Excerpt:</span>{' '}
                          {doc.ocrText.slice(0, 240)}...
                        </div>
                      )}

                      {/* Tags */}
                      {doc.tags?.length > 0 && (
                        <div className="d-flex gap-1 flex-wrap">
                          {doc.tags.map((tag, i) => (
                            <span key={i} className="badge bg-light text-dark border small">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="text-end d-flex flex-column align-items-end gap-2 flex-shrink-0">
                      <HashDisplay hash={doc.sha256} />
                      <div className="d-flex gap-2">
                        <Link to={`/documents/${doc._id}`} className="btn btn-sm btn-outline-primary">
                          View Asset
                        </Link>
                        <a
                          href={`${API_BASE}/documents/${doc._id}/certificate`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-sm btn-outline-secondary"
                          title="Section 63 Certificate"
                        >
                          🧾 Cert
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
