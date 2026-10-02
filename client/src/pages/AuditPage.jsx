/**
 * AuditPage.jsx
 * Full audit log with filters, expandable rows, chain verification, and export.
 */
import React, { useEffect, useState, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import { formatDate, truncateHash } from '../utils/formatters';
import HashDisplay from '../components/HashDisplay.jsx';

const ACTION_OPTIONS = ['', 'upload', 'download', 'verify', 'sign', 'share', 'login', 'logout', 'delete', 'view'];

function AuditPage() {
  const [events, setEvents]       = useState([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [expanded, setExpanded]   = useState(new Set());

  // Filters
  const [action, setAction]       = useState('');
  const [userF, setUserF]         = useState('');
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');
  const [docId, setDocId]         = useState('');
  const [page, setPage]           = useState(1);
  const limit = 20;

  // Chain verify
  const [chainResult, setChainResult]   = useState(null);
  const [verifyingChain, setVerifyingChain] = useState(false);

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (action)   params.set('action', action);
      if (userF)    params.set('user', userF);
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo)   params.set('to', dateTo);
      if (docId)    params.set('documentId', docId);
      params.set('page', page);
      params.set('limit', limit);

      const res = await axiosInstance.get(`/audit?${params}`);
      const data = res.data;
      const evList = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : (data.events || []));
      setEvents(evList);
      setTotal(data.total || evList.length);

    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, [action, userF, dateFrom, dateTo, docId, page]);

  useEffect(() => { fetchAudit(); }, [fetchAudit]);

  const toggleExpand = (id) => {
    setExpanded(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const handleVerifyChain = async () => {
    setVerifyingChain(true);
    setChainResult(null);
    try {
      const res = await axiosInstance.get('/ledger/verify-chain');
      const r = res.data?.data || res.data;
      setChainResult({
        intact: r.valid !== undefined ? r.valid : (r.intact ?? false),
        totalBlocks: r.totalBlocks || 0,
        brokenAt: r.brokenAtIndex || r.brokenAt,
        error: r.error
      });
    } catch (e) {
      setChainResult({ intact: false, error: e.response?.data?.message || 'Chain verification failed' });
    } finally {
      setVerifyingChain(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (action)   params.set('action', action);
      if (userF)    params.set('user', userF);
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo)   params.set('to', dateTo);
      if (docId)    params.set('documentId', docId);
      params.set('limit', 10000);

      const res = await axiosInstance.get(`/audit?${params}`);
      const data = Array.isArray(res.data) ? res.data : res.data.events || [];
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `audit_log_${Date.now()}.json`;
      document.body.appendChild(a); a.click(); a.remove();
    } catch { alert('Export failed'); }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      {/* ── Page Header ───────────────────────────────────────── */}
      <div className="page-header">
        <h4 className="page-title mb-0">🔗 Audit Log</h4>
        <div className="d-flex gap-2">
          <button
            className="btn btn-primary"
            onClick={handleVerifyChain}
            disabled={verifyingChain}
          >
            {verifyingChain
              ? <><span className="spinner-border spinner-border-sm me-1" />Verifying Chain…</>
              : '🔗 Verify Merkle Chain'
            }
          </button>
          <button className="btn btn-outline-secondary" onClick={handleExport}>
            📥 Export JSON
          </button>
        </div>
      </div>

      {/* ── Chain Result ──────────────────────────────────────── */}
      {chainResult && (
        <div className={`alert ${chainResult.intact ? 'alert-success' : 'alert-danger'} mb-3`}>
          {chainResult.intact ? (
            <><strong>✅ Merkle Chain Intact</strong> — All {chainResult.totalBlocks} audit blocks verified successfully.</>
          ) : (
            <>
              <strong>❌ Chain Broken!</strong>{' '}
              {chainResult.brokenAt
                ? `Tampered block detected at index #${chainResult.brokenAt}.`
                : chainResult.error || 'Chain verification failed.'
              }
            </>
          )}
        </div>
      )}

      {/* ── Filter Bar ───────────────────────────────────────── */}
      <div className="card mb-3">
        <div className="card-body py-2">
          <div className="row g-2">
            <div className="col-md-2">
              <select className="form-select form-select-sm" value={action} onChange={e => { setAction(e.target.value); setPage(1); }}>
                <option value="">All Actions</option>
                {ACTION_OPTIONS.filter(Boolean).map(a => (
                  <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <input
                className="form-control form-control-sm"
                placeholder="User email / name"
                value={userF}
                onChange={e => { setUserF(e.target.value); setPage(1); }}
              />
            </div>
            <div className="col-md-2">
              <input
                type="date"
                className="form-control form-control-sm"
                value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              />
            </div>
            <div className="col-md-2">
              <input
                type="date"
                className="form-control form-control-sm"
                value={dateTo}
                onChange={e => { setDateTo(e.target.value); setPage(1); }}
              />
            </div>
            <div className="col-md-2">
              <input
                className="form-control form-control-sm"
                placeholder="Document ID"
                value={docId}
                onChange={e => { setDocId(e.target.value); setPage(1); }}
              />
            </div>
            <div className="col-md-1">
              <button
                className="btn btn-outline-secondary btn-sm w-100"
                onClick={() => { setAction(''); setUserF(''); setDateFrom(''); setDateTo(''); setDocId(''); setPage(1); }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* ── Table ─────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-danger" />
              <div className="text-muted mt-2">Loading audit log…</div>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <div style={{ fontSize: '2.5rem' }}>📋</div>
              <div>No audit events found</div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover table-sm mb-0">
                <thead>
                  <tr>
                    <th style={{ width: 30 }}>#</th>
                    <th>Timestamp (IST)</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Document</th>
                    <th>IP Hash</th>
                    <th>Block Hash</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event, i) => {
                    const isExpanded = expanded.has(event._id);
                    return (
                      <React.Fragment key={event._id || i}>
                        <tr>
                          <td className="text-muted small">{(page - 1) * limit + i + 1}</td>
                          <td className="small">{formatDate(event.ts || event.createdAt)}</td>
                          <td>
                            <div className="small fw-semibold">{event.userId?.name || event.performedBy?.name || 'System'}</div>
                            <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                              {event.userId?.role ? `${event.userId.role.toUpperCase()}${event.userId.department ? ` · ${event.userId.department}` : ''}` : (event.performedBy?.email || '')}
                            </div>
                          </td>
                          <td>
                            <span className={`badge bg-${
                              event.action === 'upload'   ? 'success' :
                              event.action === 'download' ? 'primary' :
                              event.action === 'delete'   ? 'danger'  :
                              event.action === 'login'    ? 'info'    :
                              'secondary'
                            }`}>
                              {event.action}
                            </span>
                          </td>
                          <td className="small text-truncate" style={{ maxWidth: 160 }}>
                            {event.docId?.title || event.caseId?.caseNo || event.document?.title || event.documentId || '—'}
                          </td>
                          <td><HashDisplay hash={event.ipHash} startChars={8} endChars={4} /></td>
                          <td><HashDisplay hash={event.hash} startChars={8} endChars={4} /></td>
                          <td>
                            <button
                              className="btn btn-link btn-sm p-0"
                              onClick={() => toggleExpand(event._id)}
                              title={isExpanded ? 'Collapse' : 'Expand'}
                            >
                              {isExpanded ? '▲' : '▼'}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="audit-row-expanded">
                            <td colSpan={8} className="p-3">
                              <div className="row g-2">
                                <div className="col-md-6">
                                  <div className="text-muted mb-1">Full Block Hash</div>
                                  <div className="font-mono" style={{ fontSize: '0.7rem', wordBreak: 'break-all' }}>
                                    {event.hash || '—'}
                                  </div>
                                </div>
                                <div className="col-md-6">
                                  <div className="text-muted mb-1">Previous Hash</div>
                                  <div className="font-mono" style={{ fontSize: '0.7rem', wordBreak: 'break-all' }}>
                                    {event.prevHash || event.previousHash || '—'}
                                  </div>
                                </div>
                                <div className="col-md-4">
                                  <div className="text-muted mb-1">Full IP Hash</div>
                                  <div className="font-mono" style={{ fontSize: '0.7rem' }}>{event.ipHash || '—'}</div>
                                </div>
                                <div className="col-md-4">
                                  <div className="text-muted mb-1">Document SHA-256</div>
                                  <div className="font-mono" style={{ fontSize: '0.7rem', wordBreak: 'break-all' }}>
                                    {event.metadata?.sha256 || event.docId?.sha256 || event.documentHash || '—'}
                                  </div>
                                </div>
                                <div className="col-md-4">
                                  <div className="text-muted mb-1">Metadata</div>
                                  <div className="font-mono" style={{ fontSize: '0.7rem' }}>
                                    {JSON.stringify(event.metadata || {})}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="card-footer d-flex align-items-center justify-content-between">
            <small className="text-muted">
              {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} events
            </small>
            <nav>
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setPage(p => p - 1)}>‹</button>
                </li>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pg = Math.max(1, page - 2) + i;
                  if (pg > totalPages) return null;
                  return (
                    <li key={pg} className={`page-item ${pg === page ? 'active' : ''}`}>
                      <button className="page-link" onClick={() => setPage(pg)}>{pg}</button>
                    </li>
                  );
                })}
                <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setPage(p => p + 1)}>›</button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}

export default AuditPage;
