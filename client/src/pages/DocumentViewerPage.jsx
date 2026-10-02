/**
 * DocumentViewerPage.jsx
 * Full document viewer with metadata panel, integrity check, signatures,
 * shares, version history, and comments.
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { formatDate } from '../utils/formatters';
import ClassificationBadge from '../components/ClassificationBadge.jsx';
import HashDisplay from '../components/HashDisplay.jsx';
import TamperAlert from '../components/TamperAlert.jsx';

function DocumentViewerPage() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [doc, setDoc]               = useState(null);
  const [integrity, setIntegrity]   = useState(null); // { intact, computedHash, storedHash }
  const [loading, setLoading]       = useState(true);
  const [verifying, setVerifying]   = useState(false);
  const [error, setError]           = useState('');
  const [activeTab, setActiveTab]   = useState('info');

  // Share form state
  const [shareEmail, setShareEmail]       = useState('');
  const [shareExpiry, setShareExpiry]     = useState('');
  const [shareLoading, setShareLoading]   = useState(false);
  const [shares, setShares]               = useState([]);

  // Comment state
  const [comment, setComment]             = useState('');
  const [comments, setComments]           = useState([]);
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    const fetchDoc = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get(`/documents/${id}`);
        const docData = res.data?.data || res.data;
        setDoc(docData);
        setShares(docData.shares || []);
        setComments(docData.comments || []);

        // Also fetch signatures
        try {
          const sigRes = await axiosInstance.get(`/documents/${id}/signatures`);
          if (sigRes.data?.success) {
            setDoc((prev) => ({ ...prev, signatures: sigRes.data.data }));
          }
        } catch (_) {}
      } catch (e) {
        setError(e.response?.data?.error || e.response?.data?.message || 'Document not found');
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [id]);

  // Auto-verify on load
  useEffect(() => {
    if (doc && !integrity) handleVerify();
  }, [doc]);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await axiosInstance.get(`/documents/${id}/verify`);
      const data = res.data?.data || res.data;
      setIntegrity(data);
    } catch {
      setIntegrity(null);
    } finally {
      setVerifying(false);
    }
  };


  const handleDownload = async () => {
    try {
      const res = await axiosInstance.get(`/documents/${id}/download`, { responseType: 'blob' });
      const contentDisposition = res.headers['content-disposition'] || '';
      const filename = contentDisposition.match(/filename="(.+)"/)?.[1] || `document_${id}`;
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a   = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch { alert('Download failed'); }
  };

  const handleSign = async () => {
    try {
      const res = await axiosInstance.post(`/documents/${id}/sign`);
      alert('✅ Document signed successfully');
      // Refresh doc
      const docRes = await axiosInstance.get(`/documents/${id}`);
      setDoc(docRes.data);
    } catch (e) { alert(e.response?.data?.message || 'Signing failed'); }
  };

  const handleShare = async (e) => {
    e.preventDefault();
    setShareLoading(true);
    try {
      const res = await axiosInstance.post(`/documents/${id}/share`, {
        sharedWith: shareEmail,
        expiresAt: shareExpiry || undefined,
      });
      setShares(prev => [...prev, res.data]);
      setShareEmail('');
      setShareExpiry('');
    } catch (e) { alert(e.response?.data?.message || 'Share failed'); }
    finally { setShareLoading(false); }
  };

  const handleRevokeShare = async (shareId) => {
    try {
      await axiosInstance.delete(`/documents/${id}/share/${shareId}`);
      setShares(prev => prev.filter(s => s._id !== shareId));
    } catch { alert('Revoke failed'); }
  };

  const handleCertificate = async () => {
    try {
      const res = await axiosInstance.get(`/documents/${id}/certificate`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a   = document.createElement('a'); a.href = url;
      a.download = `certificate_${id}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
    } catch { alert('Certificate generation failed'); }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setCommentLoading(true);
    try {
      const res = await axiosInstance.post(`/documents/${id}/comments`, { text: comment });
      setComments(prev => [...prev, res.data]);
      setComment('');
    } catch { alert('Comment failed'); }
    finally { setCommentLoading(false); }
  };

  const handleNewVersion = () => navigate(`/cases/${doc?.caseId}/upload`);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-danger" style={{ width: '2.5rem', height: '2.5rem' }} />
        <div className="text-muted mt-2">Loading document…</div>
      </div>
    );
  }

  if (error || !doc) {
    return <div className="alert alert-danger m-3">{error || 'Document not found'}</div>;
  }

  const isTampered = integrity && !integrity.intact;

  return (
    <div>
      {/* Tamper Alert */}
      {isTampered && <TamperAlert docTitle={doc.title} detectedAt={new Date()} />}

      {/* ── Breadcrumb ────────────────────────────────────────── */}
      <nav className="mb-2">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <button className="btn btn-link p-0 text-decoration-none" onClick={() => navigate('/cases')}>Cases</button>
          </li>
          {doc.case && (
            <li className="breadcrumb-item">
              <button className="btn btn-link p-0 text-decoration-none" onClick={() => navigate(`/cases/${doc.case._id || doc.caseId}`)}>
                {doc.case.caseNo || 'Case'}
              </button>
            </li>
          )}
          <li className="breadcrumb-item active">Document</li>
        </ol>
      </nav>

      <div className="row g-3">
        {/* ── Left: Metadata Panel ──────────────────────────────── */}
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between">
              <span className="fw-semibold">Document Info</span>
              <ClassificationBadge classification={doc.classification} />
            </div>
            <div className="card-body small">
              <div className="mb-2">
                <div className="text-muted">Title</div>
                <div className="fw-semibold">{doc.title}</div>
              </div>
              <div className="mb-2">
                <div className="text-muted">Type</div>
                <span className="badge bg-secondary">{doc.type}</span>
              </div>
              <div className="mb-2">
                <div className="text-muted">Version</div>
                <span>v{doc.version || 1}</span>
              </div>
              <div className="mb-2">
                <div className="text-muted">Uploaded by</div>
                <div>{doc.uploadedBy?.name || doc.uploadedBy?.email || '—'}</div>
              </div>
              <div className="mb-2">
                <div className="text-muted">Upload Date</div>
                <div>{formatDate(doc.uploadedAt || doc.createdAt)}</div>
              </div>
              <div className="mb-2">
                <div className="text-muted">Tags</div>
                <div>
                  {doc.tags?.length > 0
                    ? doc.tags.map(t => <span key={t} className="badge bg-light text-dark me-1">{t}</span>)
                    : '—'
                  }
                </div>
              </div>
              <div className="mb-3">
                <div className="text-muted mb-1">SHA-256 Hash</div>
                <HashDisplay hash={doc.sha256 || doc.sha256Hash} />
              </div>

              {/* Integrity Badge */}
              <div className="mb-2">
                <div className="text-muted mb-1">Integrity Status</div>
                {verifying ? (
                  <span className="badge bg-secondary">
                    <span className="spinner-border spinner-border-sm me-1" style={{ width: '0.6rem', height: '0.6rem' }} />
                    Verifying…
                  </span>
                ) : integrity ? (
                  integrity.intact
                    ? <span className="badge badge-intact fs-6">✅ INTACT</span>
                    : <span className="badge badge-tampered fs-6">❌ TAMPERED</span>
                ) : (
                  <span className="badge bg-secondary">Not verified</span>
                )}
                <button className="btn btn-link btn-sm p-0 ms-2" onClick={handleVerify}>
                  Re-verify
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="card-footer">
              <div className="d-grid gap-2">
                <button className="btn btn-primary btn-sm" onClick={handleDownload}>
                  📥 Download
                </button>
                <button className="btn btn-success btn-sm" onClick={handleSign}>
                  ✍️ Sign Document
                </button>
                <button className="btn btn-outline-primary btn-sm" onClick={handleCertificate}>
                  🏛️ Section 63 Certificate
                </button>
                <button className="btn btn-outline-secondary btn-sm" onClick={handleNewVersion}>
                  📤 Upload New Version
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Tabs ───────────────────────────────────────── */}
        <div className="col-lg-8">
          <ul className="nav nav-tabs mb-3">
            {[
              { key: 'info',     label: 'ℹ️ Details' },
              { key: 'sigs',     label: `✍️ Signatures (${doc.signatures?.length || 0})` },
              { key: 'shares',   label: `🔗 Shares (${shares.length})` },
              { key: 'versions', label: '📋 Versions' },
              { key: 'comments', label: `💬 Notes (${comments.length})` },
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

          {/* Details */}
          {activeTab === 'info' && (
            <div className="card">
              <div className="card-body">
                {integrity && (
                  <div className={`alert ${integrity.intact ? 'alert-success' : 'alert-danger'} small mb-3`}>
                    <strong>{integrity.intact ? '✅ Integrity Verified' : '❌ Integrity Compromised'}</strong>
                    <table className="table table-sm mt-2 mb-0">
                      <tbody>
                        <tr><td className="text-muted">Stored Hash</td><td className="font-mono" style={{ fontSize: '0.7rem' }}>{integrity.sha256Stored || integrity.storedHash}</td></tr>
                        <tr><td className="text-muted">Computed Hash</td><td className="font-mono" style={{ fontSize: '0.7rem' }}>{integrity.sha256Computed || integrity.computedHash}</td></tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {doc.ocrText && (
                  <div>
                    <h6 className="fw-semibold">Extracted Text (OCR)</h6>
                    <pre className="bg-light p-3 rounded small" style={{ whiteSpace: 'pre-wrap', maxHeight: 400, overflow: 'auto' }}>
                      {doc.ocrText}
                    </pre>
                  </div>
                )}
                {!doc.ocrText && (
                  <div className="text-muted text-center py-4">
                    <div style={{ fontSize: '2rem' }}>📄</div>
                    <div>No extracted text available</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Signatures */}
          {activeTab === 'sigs' && (
            <div className="card">
              <div className="card-header fw-semibold">Digital Signatures</div>
              <div className="card-body">
                {!doc.signatures || doc.signatures.length === 0 ? (
                  <div className="text-muted text-center py-3">No signatures yet</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm">
                      <thead><tr><th>Signer</th><th>Method</th><th>Timestamp</th><th>Status</th></tr></thead>
                      <tbody>
                        {doc.signatures.map((sig, i) => (
                          <tr key={i}>
                            <td className="small">{sig.signer?.name || sig.signer?.email || '—'}</td>
                            <td><span className="badge bg-info text-dark">{sig.method || 'ECDSA'}</span></td>
                            <td className="small">{formatDate(sig.timestamp)}</td>
                            <td><span className="badge badge-intact">✅ Valid</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Shares */}
          {activeTab === 'shares' && (
            <div className="card">
              <div className="card-header fw-semibold">Shared Access</div>
              <div className="card-body">
                {/* Share Form */}
                <form onSubmit={handleShare} className="mb-3">
                  <div className="row g-2 align-items-end">
                    <div className="col-md-5">
                      <label className="form-label small fw-semibold">Share with (email)</label>
                      <input
                        className="form-control form-control-sm"
                        type="email"
                        placeholder="officer@securedoc.gov"
                        value={shareEmail}
                        onChange={e => setShareEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Expiry Date</label>
                      <input
                        className="form-control form-control-sm"
                        type="date"
                        value={shareExpiry}
                        onChange={e => setShareExpiry(e.target.value)}
                      />
                    </div>
                    <div className="col-md-3">
                      <button className="btn btn-primary btn-sm w-100" type="submit" disabled={shareLoading}>
                        {shareLoading ? <span className="spinner-border spinner-border-sm" /> : '🔗 Share'}
                      </button>
                    </div>
                  </div>
                </form>

                {shares.length === 0 ? (
                  <div className="text-muted text-center py-2">No active shares</div>
                ) : (
                  <table className="table table-sm">
                    <thead><tr><th>Shared With</th><th>By</th><th>Expires</th><th>Actions</th></tr></thead>
                    <tbody>
                      {shares.map(s => (
                        <tr key={s._id}>
                          <td className="small">{s.sharedWith?.email || s.sharedWith}</td>
                          <td className="small">{s.sharedBy?.name || '—'}</td>
                          <td className="small">{s.expiresAt ? formatDate(s.expiresAt) : 'No expiry'}</td>
                          <td>
                            <button className="btn btn-danger btn-sm py-0 px-1" onClick={() => handleRevokeShare(s._id)}>
                              Revoke
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Versions */}
          {activeTab === 'versions' && (
            <div className="card">
              <div className="card-header fw-semibold">Version History</div>
              <div className="card-body">
                {!doc.versions || doc.versions.length === 0 ? (
                  <div className={`version-item current`}>
                    <div className="d-flex justify-content-between">
                      <span className="fw-semibold">v{doc.version || 1} (Current)</span>
                      <span className="badge badge-intact">Current</span>
                    </div>
                    <div className="small text-muted">{formatDate(doc.uploadedAt || doc.createdAt)}</div>
                    <div className="small mt-1">
                      <HashDisplay hash={doc.sha256Hash} startChars={12} endChars={8} />
                    </div>
                  </div>
                ) : (
                  doc.versions.map((v, i) => (
                    <div key={i} className={`version-item ${i === 0 ? 'current' : ''}`}>
                      <div className="d-flex justify-content-between">
                        <span className="fw-semibold">v{v.version}</span>
                        {i === 0 && <span className="badge badge-intact">Current</span>}
                      </div>
                      <div className="small text-muted">{formatDate(v.uploadedAt)}</div>
                      <div className="small text-muted">by {v.uploadedBy?.name || '—'}</div>
                      <div className="small mt-1"><HashDisplay hash={v.sha256Hash} startChars={12} endChars={8} /></div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Comments / Notes */}
          {activeTab === 'comments' && (
            <div className="card">
              <div className="card-header fw-semibold">Investigation Notes</div>
              <div className="card-body">
                {/* Add comment */}
                <form onSubmit={handleComment} className="mb-3">
                  <textarea
                    className="form-control mb-2"
                    rows={3}
                    placeholder="Add an investigation note…"
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                  />
                  <button className="btn btn-primary btn-sm" type="submit" disabled={commentLoading}>
                    {commentLoading ? <span className="spinner-border spinner-border-sm" /> : '💬 Add Note'}
                  </button>
                </form>

                {comments.length === 0 ? (
                  <div className="text-muted text-center py-2">No notes yet</div>
                ) : (
                  comments.map((c, i) => (
                    <div key={i} className="mb-2 p-3 rounded bg-light border">
                      <div className="d-flex justify-content-between">
                        <span className="fw-semibold small">{c.author?.name || c.author?.email || 'Unknown'}</span>
                        <span className="text-muted small">{formatDate(c.createdAt)}</span>
                      </div>
                      <div className="mt-1">{c.text}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DocumentViewerPage;
