/**
 * UploadPage.jsx
 * Document upload form with progress bar, SHA-256 display on success,
 * and Section 63 certificate offer.
 */
import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import HashDisplay from '../components/HashDisplay.jsx';

const DOC_TYPES = ['FIR', 'Statement', 'Charge Sheet', 'Court Filing', 'Evidence', 'Forensic Report', 'Judgment', 'Other'];
const CLASSIFICATIONS = ['public', 'restricted', 'confidential', 'secret'];
const MAX_SIZE_MB = 50;

function UploadPage() {
  const { id: caseId } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '', type: 'FIR', classification: 'restricted',
    tags: '', ocrText: '',
  });
  const [file, setFile]         = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError]       = useState('');
  const [result, setResult]     = useState(null); // { sha256Hash, documentId, title }
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Max size is ${MAX_SIZE_MB}MB.`);
      return;
    }
    setFile(f);
    setError('');
    // Auto-fill title from filename if empty
    if (!form.title) {
      setForm(prev => ({ ...prev, title: f.name.replace(/\.[^.]+$/, '') }));
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setError('Please select a file to upload.'); return; }
    if (!form.title.trim()) { setError('Document title is required.'); return; }

    setUploading(true);
    setError('');
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', form.title.trim());
    formData.append('type', form.type);
    formData.append('classification', form.classification);
    formData.append('tags', form.tags);
    formData.append('ocrText', form.ocrText);
    if (caseId) formData.append('caseId', caseId);

    try {
      const res = await axiosInstance.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      setResult(res.data?.data || res.data);
      setProgress(100);
    } catch (e) {
      setError(e.response?.data?.error || e.response?.data?.message || 'Upload failed. Please try again.');

    } finally {
      setUploading(false);
    }
  };

  const downloadCertificate = async () => {
    try {
      const res = await axiosInstance.get(`/documents/${result.documentId || result._id}/certificate`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `certificate_${result.documentId || result._id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch { alert('Certificate generation failed'); }
  };

  return (
    <div>
      {/* ── Breadcrumb ────────────────────────────────────────── */}
      <nav className="mb-2">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <button className="btn btn-link p-0 text-decoration-none" onClick={() => navigate('/cases')}>Cases</button>
          </li>
          {caseId && (
            <li className="breadcrumb-item">
              <button className="btn btn-link p-0 text-decoration-none" onClick={() => navigate(`/cases/${caseId}`)}>
                Case
              </button>
            </li>
          )}
          <li className="breadcrumb-item active">Upload Document</li>
        </ol>
      </nav>

      {/* ── Page Header ───────────────────────────────────────── */}
      <div className="page-header">
        <h4 className="page-title mb-0">📤 Upload Document</h4>
        <div className="badge bg-warning text-dark">
          🔒 AES-256-GCM Encrypted Storage
        </div>
      </div>

      {/* ── Security Notice ───────────────────────────────────── */}
      <div className="alert alert-info d-flex gap-2 align-items-start mb-3">
        <span>🔐</span>
        <div className="small">
          <strong>Secure Upload:</strong> Files are encrypted with AES-256-GCM before storage.
          SHA-256 hash is computed server-side for tamper detection. A blockchain audit entry
          will be created automatically. All uploads comply with Section 63 of the IT Act, 2000.
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-7">
          {/* ── Success State ──────────────────────────────────── */}
          {result ? (
            <div className="card">
              <div className="card-header bg-success text-white fw-semibold">
                ✅ Upload Successful
              </div>
              <div className="card-body">
                <h5>{result.title}</h5>
                <div className="mb-3">
                  <div className="small text-muted mb-1">SHA-256 Hash (Tamper-Evident Fingerprint)</div>
                  <HashDisplay hash={result.sha256Hash} startChars={24} endChars={12} />
                </div>
                <div className="small text-muted mb-3">
                  Document ID: <span className="font-mono">{result.documentId || result._id}</span>
                </div>

                <div className="cert-box mb-3">
                  <div className="cert-seal">🏛️</div>
                  <h6 className="fw-bold mt-2">Section 63 IT Act Certificate</h6>
                  <p className="small text-muted">
                    A certificate of authenticity can be downloaded and presented as evidence
                    in court proceedings under Section 63 of the Information Technology Act, 2000.
                  </p>
                  <button className="btn btn-primary" onClick={downloadCertificate}>
                    📥 Download Section 63 Certificate
                  </button>
                </div>

                <div className="d-flex gap-2">
                  <button className="btn btn-outline-primary" onClick={() => navigate(`/documents/${result.documentId || result._id}`)}>
                    View Document →
                  </button>
                  {caseId && (
                    <button className="btn btn-outline-secondary" onClick={() => navigate(`/cases/${caseId}`)}>
                      Back to Case
                    </button>
                  )}
                  <button className="btn btn-danger" onClick={() => { setResult(null); setFile(null); setProgress(0); setForm({ title: '', type: 'FIR', classification: 'restricted', tags: '', ocrText: '' }); }}>
                    Upload Another
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ── Upload Form ──────────────────────────────────────── */
            <div className="card">
              <div className="card-header fw-semibold">Document Details</div>
              <div className="card-body">
                {error && <div className="alert alert-danger">{error}</div>}

                <form onSubmit={handleSubmit}>
                  {/* File Drop Zone */}
                  <div
                    className={`upload-zone mb-3 ${dragOver ? 'drag-over' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="upload-icon">{file ? '📄' : '☁️'}</div>
                    {file ? (
                      <div>
                        <div className="fw-semibold">{file.name}</div>
                        <div className="small text-muted">
                          {(file.size / 1024 / 1024).toFixed(2)} MB · Click to change
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="fw-semibold">Drop file here or click to browse</div>
                        <div className="small text-muted">PDF, images, Office docs · Max {MAX_SIZE_MB}MB</div>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="d-none"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                      onChange={(e) => handleFile(e.target.files[0])}
                    />
                  </div>

                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label fw-semibold small">Document Title *</label>
                      <input
                        className="form-control"
                        required
                        placeholder="e.g., FIR No. 123 - Complaint dated 01/10/2024"
                        value={form.title}
                        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Document Type *</label>
                      <select
                        className="form-select"
                        value={form.type}
                        onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                      >
                        {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Classification *</label>
                      <select
                        className="form-select"
                        value={form.classification}
                        onChange={e => setForm(f => ({ ...f, classification: e.target.value }))}
                      >
                        {CLASSIFICATIONS.map(c => (
                          <option key={c} value={c}>{c.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold small">Tags (comma-separated)</label>
                      <input
                        className="form-control"
                        placeholder="e.g., evidence, witness, forensic"
                        value={form.tags}
                        onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold small">OCR Text (optional)</label>
                      <textarea
                        className="form-control font-mono"
                        rows={4}
                        placeholder="Manually enter or paste extracted text for full-text search…"
                        value={form.ocrText}
                        style={{ fontSize: '0.8rem' }}
                        onChange={e => setForm(f => ({ ...f, ocrText: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {uploading && (
                    <div className="mt-3">
                      <div className="d-flex justify-content-between small mb-1">
                        <span>Uploading & encrypting…</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="progress" style={{ height: 8 }}>
                        <div
                          className="progress-bar progress-bar-striped progress-bar-animated bg-danger"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="d-flex gap-2 mt-3">
                    <button type="submit" className="btn btn-danger" disabled={uploading || !file}>
                      {uploading
                        ? <><span className="spinner-border spinner-border-sm me-1" />Uploading…</>
                        : '📤 Upload Document'
                      }
                    </button>
                    <button type="button" className="btn btn-outline-secondary" onClick={() => navigate(-1)}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* ── Info Panel ─────────────────────────────────────────── */}
        <div className="col-lg-5">
          <div className="card mb-3">
            <div className="card-header fw-semibold">📋 Upload Guidelines</div>
            <div className="card-body small">
              <ul className="mb-0 ps-3">
                <li className="mb-2">Maximum file size: <strong>{MAX_SIZE_MB}MB</strong></li>
                <li className="mb-2">Supported: PDF, JPEG, PNG, DOCX, XLSX</li>
                <li className="mb-2">All files are scanned and encrypted with <strong>AES-256-GCM</strong></li>
                <li className="mb-2">SHA-256 hash computed for tamper detection</li>
                <li className="mb-2">Audit entry created automatically</li>
                <li>Select highest applicable classification level</li>
              </ul>
            </div>
          </div>

          <div className="card">
            <div className="card-header fw-semibold">🏷️ Classification Guide</div>
            <div className="card-body small">
              {[
                { level: 'secret', color: 'danger', desc: 'Top-level sensitive. Restricted personnel only.' },
                { level: 'confidential', color: 'warning', desc: 'Sensitive. Authorized investigators only.' },
                { level: 'restricted', color: 'warning', desc: 'Limited distribution within the team.' },
                { level: 'public', color: 'success', desc: 'General access, no sensitive information.' },
              ].map(({ level, color, desc }) => (
                <div key={level} className={`clearance-${level} ps-2 mb-2 py-1`}>
                  <strong className={`text-${color}`}>{level.toUpperCase()}</strong>
                  <div className="text-muted">{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UploadPage;
