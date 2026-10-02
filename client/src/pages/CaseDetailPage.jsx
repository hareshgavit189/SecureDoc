/**
 * CaseDetailPage.jsx
 * Case detail with tabbed view: Documents, Team, Timeline, Custody Chain.
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext.jsx';
import { formatDate, formatDateOnly, getDaysOpen, getCaseStatusColor } from '../utils/formatters';
import ClassificationBadge from '../components/ClassificationBadge.jsx';
import HashDisplay from '../components/HashDisplay.jsx';

const STATUS_LABELS = {
  open: 'Open', investigation: 'Investigation',
  charge_sheet: 'Charge Sheet', in_court: 'In Court', closed: 'Closed',
};

const CAN_UPLOAD = ['admin', 'sp', 'sho', 'supervisor', 'io', 'investigator'];

function CaseDetailPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [caseData, setCaseData] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [timeline, setTimeline]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [activeTab, setActiveTab] = useState('documents');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [caseRes, docsRes, auditRes] = await Promise.allSettled([
          axiosInstance.get(`/cases/${id}`),
          axiosInstance.get(`/cases/${id}/documents`),
          axiosInstance.get(`/audit?caseId=${id}&limit=50`),
        ]);

        if (caseRes.status === 'fulfilled') setCaseData(caseRes.value.data?.data || caseRes.value.data);
        if (docsRes.status === 'fulfilled') {
          const d = docsRes.value.data?.data || docsRes.value.data;
          setDocuments(Array.isArray(d) ? d : (d.documents || []));
        }
        if (auditRes.status === 'fulfilled') {
          const a = auditRes.value.data?.data || auditRes.value.data;
          setTimeline(Array.isArray(a) ? a : (a.events || []));
        }
      } catch (e) {
        setError('Failed to load case details');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleVerify = async (docId) => {
    try {
      const res = await axiosInstance.get(`/documents/${docId}/verify`);
      const data = res.data?.data || res.data;
      alert(data.intact ? '✅ Document Intact' : '❌ TAMPERED!');
    } catch { alert('Verification failed'); }
  };


  const handleSign = async (docId) => {
    try {
      await axiosInstance.post(`/documents/${docId}/sign`);
      alert('✅ Document signed successfully');
    } catch { alert('Signing failed'); }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-danger" style={{ width: '2.5rem', height: '2.5rem' }} />
        <div className="text-muted mt-2">Loading case…</div>
      </div>
    );
  }

  if (error || !caseData) {
    return <div className="alert alert-danger">{error || 'Case not found'}</div>;
  }

  const days = getDaysOpen(caseData.registeredAt);
  const canUpload = CAN_UPLOAD.includes(user?.role);

  return (
    <div>
      {/* ── Breadcrumb ────────────────────────────────────────── */}
      <nav aria-label="breadcrumb" className="mb-2">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <button className="btn btn-link p-0 text-decoration-none" onClick={() => navigate('/cases')}>Cases</button>
          </li>
          <li className="breadcrumb-item active">{caseData.caseNo}</li>
        </ol>
      </nav>

      {/* ── Case Header ───────────────────────────────────────── */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="d-flex align-items-start justify-content-between flex-wrap gap-2">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <h4 className="mb-0 fw-bold">{caseData.title}</h4>
                <span className={`badge bg-${getCaseStatusColor(caseData.status)}`}>
                  {STATUS_LABELS[caseData.status] || caseData.status}
                </span>
                {caseData.category === 'sexual_offence' && (
                  <span className="badge bg-danger">🔴 SEXUAL OFFENCE</span>
                )}
              </div>
              <div className="text-muted small d-flex flex-wrap gap-3">
                <span>📋 {caseData.caseNo}</span>
                {caseData.firNo && <span>📄 FIR: {caseData.firNo}</span>}
                <span>📅 Registered: {formatDateOnly(caseData.registeredAt)}</span>
                <span>📍 {caseData.district}</span>
              </div>
              {caseData.description && (
                <p className="text-muted small mt-2 mb-0">{caseData.description}</p>
              )}
            </div>
            <div className="text-center">
              <div
                className={`fs-2 fw-bold ${days >= 60 ? 'text-danger' : days >= 45 ? 'text-warning' : 'text-success'}`}
              >
                {days}
              </div>
              <div className="small text-muted">Days Open</div>
              {days >= 60 && (
                <span className="badge bg-danger mt-1">⚠️ DEADLINE PASSED</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────── */}
      <ul className="nav nav-tabs mb-3 border-bottom-0">
        {[
          { key: 'documents', label: `📄 Documents (${documents.length})` },
          { key: 'team',      label: `👥 Team (${caseData.team?.length || 0})` },
          { key: 'timeline',  label: '📅 Timeline' },
          { key: 'custody',   label: '🔗 Custody Chain' },
        ].map(tab => (
          <li key={tab.key} className="nav-item">
            <button
              className={`nav-link ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          </li>
        ))}
      </ul>

      {/* ── Documents Tab ─────────────────────────────────────── */}
      {activeTab === 'documents' && (
        <div className="card">
          <div className="card-header d-flex align-items-center justify-content-between">
            <span className="fw-semibold">Documents</span>
            {canUpload && (
              <button className="btn btn-danger btn-sm" onClick={() => navigate(`/cases/${id}/upload`)}>
                📤 Upload Document
              </button>
            )}
          </div>
          <div className="card-body p-0">
            {documents.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <div style={{ fontSize: '2.5rem' }}>📂</div>
                <div>No documents yet</div>
                {canUpload && (
                  <button className="btn btn-danger mt-2" onClick={() => navigate(`/cases/${id}/upload`)}>
                    Upload First Document
                  </button>
                )}
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover table-sm mb-0">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Type</th>
                      <th>Classification</th>
                      <th>Ver.</th>
                      <th>Uploaded</th>
                      <th>SHA-256</th>
                      <th>Integrity</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => (
                      <tr
                        key={doc._id}
                        className={`clearance-${doc.classification?.toLowerCase()}`}
                      >
                        <td>
                          <div className="fw-semibold small">{doc.title}</div>
                          {doc.tags?.length > 0 && (
                            <div>
                              {doc.tags.slice(0, 3).map(t => (
                                <span key={t} className="badge bg-light text-dark me-1" style={{ fontSize: '0.65rem' }}>{t}</span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td><span className="badge bg-secondary small">{doc.type}</span></td>
                        <td><ClassificationBadge classification={doc.classification} /></td>
                        <td className="text-muted small">v{doc.version || 1}</td>
                        <td className="small">{formatDate(doc.uploadedAt || doc.createdAt)}</td>
                        <td><HashDisplay hash={doc.sha256Hash} startChars={10} endChars={6} /></td>
                        <td>
                          {doc.integrityStatus === 'intact'
                            ? <span className="badge badge-intact">✅ Intact</span>
                            : doc.integrityStatus === 'tampered'
                            ? <span className="badge badge-tampered">❌ Tampered</span>
                            : <span className="badge bg-secondary">Unverified</span>
                          }
                        </td>
                        <td>
                          <div className="d-flex gap-1 flex-wrap">
                            <button className="btn btn-primary btn-sm py-0 px-1" onClick={() => navigate(`/documents/${doc._id}`)}>View</button>
                            <button className="btn btn-outline-secondary btn-sm py-0 px-1" onClick={() => handleVerify(doc._id)}>Verify</button>
                            <button className="btn btn-outline-success btn-sm py-0 px-1" onClick={() => handleSign(doc._id)}>Sign</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Team Tab ──────────────────────────────────────────── */}
      {activeTab === 'team' && (
        <div className="card">
          <div className="card-header fw-semibold">Investigation Team</div>
          <div className="card-body">
            {(!caseData.team || caseData.team.length === 0) ? (
              <div className="text-muted text-center py-3">No team members assigned</div>
            ) : (
              <div className="row g-3">
                {caseData.team.map((member, i) => (
                  <div key={i} className="col-md-6">
                    <div className="d-flex align-items-center gap-3 p-3 rounded border">
                      <div
                        className="d-flex align-items-center justify-content-center rounded-circle bg-primary text-white fw-bold"
                        style={{ width: 40, height: 40, flexShrink: 0 }}
                      >
                        {(member.user?.name || member.name || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="fw-semibold">{member.user?.name || member.name}</div>
                        <div className="small text-muted">{member.user?.email || member.email}</div>
                        <span className="badge bg-warning text-dark mt-1" style={{ fontSize: '0.65rem' }}>
                          {member.role}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Timeline Tab ──────────────────────────────────────── */}
      {activeTab === 'timeline' && (
        <div className="card">
          <div className="card-header fw-semibold">📅 Case Timeline</div>
          <div className="card-body">
            {timeline.length === 0 ? (
              <div className="text-muted text-center py-3">No audit events yet</div>
            ) : (
              <div style={{ position: 'relative', paddingLeft: '1.5rem' }}>
                <div style={{
                  position: 'absolute', left: '0.6rem', top: 0, bottom: 0,
                  width: 2, background: '#dee2e6'
                }} />
                {timeline.map((event, i) => (
                  <div key={event._id || i} className="d-flex gap-3 mb-3" style={{ position: 'relative' }}>
                    <div style={{
                      position: 'absolute', left: '-0.85rem', top: '0.25rem',
                      width: 12, height: 12, borderRadius: '50%',
                      background: '#0f3460', border: '2px solid #fff', flexShrink: 0,
                    }} />
                    <div className="ms-2">
                      <div className="small text-muted">{formatDate(event.createdAt)}</div>
                      <div className="fw-semibold small">
                        <span className="badge bg-primary me-1">{event.action}</span>
                        {event.document?.title || event.documentId}
                      </div>
                      <div className="small text-muted">by {event.performedBy?.name || event.performedBy?.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Custody Chain Tab ─────────────────────────────────── */}
      {activeTab === 'custody' && (
        <div className="card">
          <div className="card-header fw-semibold">🔗 Chain of Custody</div>
          <div className="card-body">
            {timeline.filter(e => ['upload', 'download', 'transfer', 'sign', 'share'].includes(e.action)).length === 0 ? (
              <div className="text-muted text-center py-3">No custody events recorded</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr><th>Time</th><th>Event</th><th>Actor</th><th>Document</th><th>IP Hash</th></tr>
                  </thead>
                  <tbody>
                    {timeline
                      .filter(e => ['upload', 'download', 'transfer', 'sign', 'share'].includes(e.action))
                      .map((e, i) => (
                        <tr key={i}>
                          <td className="small">{formatDate(e.createdAt)}</td>
                          <td><span className="badge bg-info text-dark">{e.action}</span></td>
                          <td className="small">{e.performedBy?.name || e.performedBy?.email}</td>
                          <td className="small">{e.document?.title || e.documentId || '—'}</td>
                          <td><HashDisplay hash={e.ipHash} startChars={8} endChars={4} /></td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CaseDetailPage;
