/**
 * CasesPage.jsx
 * Lists all cases with filters, status badges, and a New Case modal.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext.jsx';
import { formatDateOnly, getCaseStatusColor, getDaysOpen } from '../utils/formatters';

const STATUS_OPTIONS   = ['', 'open', 'investigation', 'charge_sheet', 'in_court', 'closed'];
const CATEGORY_OPTIONS = ['', 'murder', 'sexual_offence', 'theft', 'fraud', 'cybercrime', 'narcotics', 'other'];
const TYPE_OPTIONS     = ['FIR', 'Zero FIR', 'NDPS', 'POCSO', 'IT Act', 'BNS', 'Other'];

const STATUS_LABELS = {
  open: 'Open',
  investigation: 'Investigation',
  charge_sheet: 'Charge Sheet',
  in_court: 'In Court',
  closed: 'Closed',
};

// Roles allowed to create cases
const CAN_CREATE = ['admin', 'supervisor', 'io', 'investigator'];

function CasesPage() {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  // ── List state ───────────────────────────────────────────────
  const [cases, setCases]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  // ── Filters ──────────────────────────────────────────────────
  const [search, setSearch]     = useState('');
  const [statusF, setStatusF]   = useState('');
  const [catF, setCatF]         = useState('');
  const [page, setPage]         = useState(1);
  const limit = 15;

  // ── New Case Modal ───────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState({
    caseNo: '', firNo: '', title: '', type: 'FIR',
    category: 'other', district: '', description: '',
  });
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState('');

  // ── Fetch Cases ──────────────────────────────────────────────
  const fetchCases = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search)  params.set('search', search);
      if (statusF) params.set('status', statusF);
      if (catF)    params.set('category', catF);
      params.set('page', page);
      params.set('limit', limit);

      const res = await axiosInstance.get(`/cases?${params}`);
      const data = res.data;

      const casesList = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : (data.cases || []));
      setCases(casesList);
      setTotal(data.total || casesList.length);

    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load cases');
    } finally {
      setLoading(false);
    }
  }, [search, statusF, catF, page]);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  // ── Create Case ──────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      await axiosInstance.post('/cases', form);
      setShowModal(false);
      setForm({ caseNo: '', firNo: '', title: '', type: 'FIR', category: 'other', district: '', description: '' });
      fetchCases();
    } catch (e) {
      setSaveError(e.response?.data?.message || 'Failed to create case');
    } finally {
      setSaving(false);
    }
  };

  const canCreate = CAN_CREATE.includes(user?.role);
  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      {/* ── Page Header ───────────────────────────────────────── */}
      <div className="page-header">
        <h4 className="page-title mb-0">📁 Cases</h4>
        {canCreate && (
          <button className="btn btn-danger" onClick={() => setShowModal(true)}>
            ＋ New Case
          </button>
        )}
      </div>

      {/* ── Filter Bar ───────────────────────────────────────── */}
      <div className="card mb-3">
        <div className="card-body py-2">
          <div className="row g-2 align-items-center">
            <div className="col-md-5">
              <input
                className="form-control form-control-sm"
                placeholder="🔍 Search case no, title, FIR no…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <div className="col-md-3">
              <select className="form-select form-select-sm" value={statusF} onChange={(e) => { setStatusF(e.target.value); setPage(1); }}>
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.filter(Boolean).map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <select className="form-select form-select-sm" value={catF} onChange={(e) => { setCatF(e.target.value); setPage(1); }}>
                <option value="">All Categories</option>
                {CATEGORY_OPTIONS.filter(Boolean).map(c => (
                  <option key={c} value={c}>{c.replace('_', ' ').toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div className="col-md-1">
              <button className="btn btn-outline-secondary btn-sm w-100" onClick={() => { setSearch(''); setStatusF(''); setCatF(''); setPage(1); }}>
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Error ─────────────────────────────────────────────── */}
      {error && <div className="alert alert-danger">{error}</div>}

      {/* ── Table ─────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-danger" />
              <div className="text-muted mt-2">Loading cases…</div>
            </div>
          ) : cases.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <div style={{ fontSize: '3rem' }}>📁</div>
              <div>No cases found</div>
              {canCreate && (
                <button className="btn btn-danger mt-2" onClick={() => setShowModal(true)}>
                  Create First Case
                </button>
              )}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover table-sm mb-0">
                <thead>
                  <tr>
                    <th>Case No</th>
                    <th>FIR No</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Registered</th>
                    <th>Days Open</th>
                    <th>Team</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c) => {
                    const days = getDaysOpen(c.registeredAt);
                    const isSexual = c.category === 'sexual_offence';
                    return (
                      <tr key={c._id}>
                        <td className="font-mono small fw-semibold">{c.caseNo}</td>
                        <td className="small text-muted">{c.firNo || '—'}</td>
                        <td>
                          <div className="fw-semibold small">{c.title}</div>
                          <div className="text-muted" style={{ fontSize: '0.7rem' }}>{c.district}</div>
                        </td>
                        <td>
                          {isSexual ? (
                            <span className="badge bg-danger">🔴 SEXUAL OFFENCE</span>
                          ) : (
                            <span className="badge bg-secondary">{c.category?.replace('_', ' ').toUpperCase()}</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge bg-${getCaseStatusColor(c.status)}`}>
                            {STATUS_LABELS[c.status] || c.status}
                          </span>
                        </td>
                        <td className="small">{formatDateOnly(c.registeredAt)}</td>
                        <td>
                          <span className={`badge ${days >= 60 ? 'bg-danger' : days >= 45 ? 'bg-warning text-dark' : 'bg-light text-dark'}`}>
                            {days}d
                          </span>
                        </td>
                        <td className="small text-muted">{c.team?.length || 0}</td>
                        <td>
                          <div className="d-flex gap-1">
                            <button
                              className="btn btn-primary btn-sm py-0 px-2"
                              onClick={() => navigate(`/cases/${c._id}`)}
                            >
                              View
                            </button>
                            {canCreate && (
                              <button
                                className="btn btn-outline-secondary btn-sm py-0 px-2"
                                onClick={() => navigate(`/cases/${c._id}`)}
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Pagination ──────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="card-footer d-flex align-items-center justify-content-between">
            <small className="text-muted">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
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

      {/* ── New Case Modal ────────────────────────────────────── */}
      {showModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">📁 Register New Case</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)} />
              </div>
              <form onSubmit={handleCreate}>
                <div className="modal-body">
                  {saveError && <div className="alert alert-danger">{saveError}</div>}
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Case No *</label>
                      <input
                        className="form-control"
                        required
                        placeholder="e.g., CAS-2024-001"
                        value={form.caseNo}
                        onChange={e => setForm(f => ({ ...f, caseNo: e.target.value }))}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">FIR No</label>
                      <input
                        className="form-control"
                        placeholder="e.g., FIR/2024/00123"
                        value={form.firNo}
                        onChange={e => setForm(f => ({ ...f, firNo: e.target.value }))}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold small">Case Title *</label>
                      <input
                        className="form-control"
                        required
                        placeholder="Brief case title"
                        value={form.title}
                        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold small">Type</label>
                      <select
                        className="form-select"
                        value={form.type}
                        onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                      >
                        {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold small">Category</label>
                      <select
                        className="form-select"
                        value={form.category}
                        onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      >
                        {CATEGORY_OPTIONS.filter(Boolean).map(c => (
                          <option key={c} value={c}>{c.replace('_', ' ').toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold small">District</label>
                      <input
                        className="form-control"
                        placeholder="e.g., South Delhi"
                        value={form.district}
                        onChange={e => setForm(f => ({ ...f, district: e.target.value }))}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold small">Description</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        placeholder="Brief description of the case…"
                        value={form.description}
                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-danger" disabled={saving}>
                    {saving
                      ? <><span className="spinner-border spinner-border-sm me-1" />Saving…</>
                      : '📁 Register Case'
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CasesPage;
