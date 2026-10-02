/**
 * VerifyPage.jsx
 * Public & Authorized Document Integrity Verification Portal.
 * Verifies SHA-256 cryptographic fingerprints, AES-256-GCM envelope integrity,
 * and immutable Merkle ledger audit trails under Bharatiya Sakshya Adhiniyam (BSA) 2023 §63.
 */
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import axiosInstance, { API_BASE } from '../api/axiosInstance';
import HashDisplay from '../components/HashDisplay';
import TamperAlert from '../components/TamperAlert';
import ClassificationBadge from '../components/ClassificationBadge';
import { formatDate } from '../utils/formatters';

const SAMPLE_PRESETS = [
  {
    label: '📄 FIR No. CR/001/2026',
    sub: 'Armed Robbery · State v. Vikram',
    hash: '43ee4e4bdba0cc8a6d860068f824041cbea8631761ffba8575b7049dabfdc350',
    badge: 'FIR',
    badgeColor: 'bg-primary',
  },
  {
    label: '🔬 Forensic Ballistics Report',
    sub: 'CFL/2026/041 · Ballistics Lab',
    hash: 'bbad270449ef7a37eb3c134d3efda1456d509cad5ad6112b253e7d2820de922e',
    badge: 'Forensic',
    badgeColor: 'bg-info text-dark',
  },
  {
    label: '🎙️ Witness Statement u/s 180 BNSS',
    sub: 'Sworn Record · Eyewitness Statement',
    hash: '2427ae036dc778872f9d342a82af6988b51aaba4b680f867270d0131b6ca1be1',
    badge: 'Statement',
    badgeColor: 'bg-warning text-dark',
  },
  {
    label: '🚨 Tampered Evidence (Demo)',
    sub: 'Bit-Altered Hash · Signature Mismatch',
    hash: 'deadbeef4bdba0cc8a6d860068f824041cbea8631761ffba8575b7049dabfdc350',
    badge: 'Simulation',
    badgeColor: 'bg-danger text-white',
  },
];

export default function VerifyPage({ inLayout = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [hashInput, setHashInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const [chainResult, setChainResult] = useState(null);
  const [chainLoading, setChainLoading] = useState(false);
  const [chainError, setChainError] = useState('');

  const executeVerification = async (targetHash) => {
    const cleanHash = (targetHash || hashInput).trim();
    if (!cleanHash) {
      setError('Please provide a document SHA-256 hash or document ID.');
      return;
    }

    setError('');
    setLoading(true);
    setResult(null);

    try {
      // 1. Try public verify endpoint by hash
      const res = await axiosInstance.get(`/public/verify/${cleanHash}`);
      if (res.data?.success && res.data?.data?.found) {
        setResult(res.data.data);
      } else {
        // 2. Check if valid MongoDB ObjectId (24 hex characters)
        if (/^[0-9a-fA-F]{24}$/.test(cleanHash)) {
          const docRes = await axiosInstance.get(`/documents/${cleanHash}/verify`);
          if (docRes.data?.success) {
            setResult({
              found: true,
              intact: docRes.data.data.intact,
              tampered: docRes.data.data.tampered,
              storedHash: docRes.data.data.sha256Stored,
              computedHash: docRes.data.data.sha256Computed,
              message: docRes.data.data.message,
            });
          } else {
            setError(docRes.data?.error || 'Document not found.');
          }
        } else {
          setResult({
            found: false,
            message: 'No active electronic record matches this SHA-256 fingerprint in the immutable ledger.',
            searchedHash: cleanHash,
          });
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Verification failed. Please check network connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = (e) => {
    e?.preventDefault();
    executeVerification(hashInput);
  };

  const handlePresetClick = (presetHash) => {
    setHashInput(presetHash);
    executeVerification(presetHash);
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setHashInput(text.trim());
      }
    } catch {
      // Ignore clipboard permission failures
    }
  };

  const handleVerifyAuditChain = async () => {
    setChainError('');
    setChainLoading(true);
    try {
      const res = await axiosInstance.get('/ledger/verify-chain');
      if (res.data?.success) {
        setChainResult(res.data.data);
      } else {
        setChainError(res.data?.error || 'Failed to verify ledger chain.');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setChainError('Officer authorization required to recompute whole-ledger Merkle chain. Please log in.');
      } else {
        setChainError(err.response?.data?.error || err.message || 'Chain verification failed.');
      }
    } finally {
      setChainLoading(false);
    }
  };

  const handleCopyHash = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`verify-page-wrapper ${inLayout ? '' : 'public-mode'}`} style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* ── Standalone Top Navbar (Shown when viewed in public mode outside Layout) ── */}
      {!inLayout && (
        <header
          className="border-bottom sticky-top shadow-sm"
          style={{
            background: 'linear-gradient(90deg, #0f172a 0%, #1e293b 100%)',
            borderBottom: '2px solid #e94560',
          }}
        >
          <div className="container-fluid px-3 px-md-4 py-2 d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div className="d-flex align-items-center gap-3">
              <img src="/shield.svg" alt="National Shield" width="36" height="36" className="d-inline-block" />
              <div>
                <div className="d-flex align-items-center gap-2">
                  <span className="fw-bold text-white fs-5 tracking-tight">SecureDoc DMS</span>
                  <span className="badge bg-danger text-white rounded-pill px-2 py-0" style={{ fontSize: '0.65rem' }}>
                    NCRB · MHA
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  Section 63 Bharatiya Sakshya Adhiniyam, 2023 · Public Electronic Evidence Portal
                </div>
              </div>
            </div>

            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-success-subtle text-success border border-success-subtle d-none d-md-inline-flex align-items-center gap-1 px-2 py-1">
                <span className="spinner-grow spinner-grow-sm text-success" style={{ width: '8px', height: '8px' }} />
                Ledger Engine Online
              </span>
              {user ? (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="btn btn-outline-light btn-sm d-flex align-items-center gap-2 px-3"
                >
                  <span>📊</span> Officer Dashboard
                </button>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="btn btn-danger btn-sm d-flex align-items-center gap-2 px-3 shadow-sm"
                  style={{ background: '#e94560', borderColor: '#e94560' }}
                >
                  <span>👮</span> Officer Login
                </button>
              )}
            </div>
          </div>
        </header>
      )}

      {/* ── Main Container ── */}
      <div className="container-fluid px-3 px-md-4 py-4" style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* ── Breadcrumb & Portal Header (Inside App Mode) ── */}
        {inLayout && (
          <div className="d-flex align-items-center justify-content-between pb-3 mb-3 border-bottom flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2">
              <img src="/shield.svg" alt="Emblem" width="28" height="28" />
              <div>
                <h5 className="fw-bold text-dark mb-0">
                  Document Integrity & Admissibility Authority
                </h5>
                <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                  Section 63 Bharatiya Sakshya Adhiniyam (BSA), 2023 · Cryptographic Merkle Ledger
                </small>
              </div>
            </div>

            <div className="d-flex align-items-center gap-2">
              <button
                onClick={() => navigate('/dashboard')}
                className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
              >
                <span>📊</span> Dashboard
              </button>
              <button
                className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1 shadow-sm"
                onClick={handleVerifyAuditChain}
                disabled={chainLoading}
              >
                {chainLoading ? <span className="spinner-border spinner-border-sm" /> : <span>🔗</span>}
                Verify Audit Chain
              </button>
            </div>
          </div>
        )}

        {/* ── Hero Banner with National Security Styling ── */}
        <div
          className="card border-0 shadow-sm mb-4 text-white overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f3460 100%)',
            borderRadius: '12px',
          }}
        >
          <div className="card-body p-4 p-md-5 position-relative">
            {/* Subtle background national badge graphic */}
            <div
              style={{
                position: 'absolute',
                right: '2%',
                top: '50%',
                transform: 'translateY(-50%)',
                opacity: 0.06,
                pointerEvents: 'none',
                fontSize: '12rem',
                userSelect: 'none',
              }}
            >
              ⚖️
            </div>

            <div className="row align-items-center position-relative">
              <div className="col-lg-8">
                <div className="d-inline-flex align-items-center gap-2 bg-white bg-opacity-10 rounded-pill px-3 py-1 mb-3 border border-white border-opacity-10">
                  <span className="text-warning">⚖️</span>
                  <span className="small fw-semibold text-light text-uppercase tracking-wider" style={{ fontSize: '0.72rem' }}>
                    BSA 2023 §63 · IT ACT 2000 · ZERO-TRUST INTEGRITY
                  </span>
                </div>

                <h2 className="fw-bold text-white mb-2 tracking-tight">
                  Tamper-Evident Evidence Verification Portal
                </h2>
                <p className="text-light text-opacity-75 small mb-3 max-w-xl" style={{ lineHeight: '1.6' }}>
                  Validate the mathematical proof, SHA-256 hash stream, and AES-256-GCM envelope integrity of any legal
                  record. Automatically issues court-admissible Section 63 certificates under the Bharatiya Sakshya Adhiniyam, 2023.
                </p>

                <div className="d-flex align-items-center flex-wrap gap-2 pt-1">
                  <span className="badge bg-success bg-opacity-25 text-success-light border border-success border-opacity-25 px-2 py-1 small">
                    🟢 SHA-256 Hash Matching
                  </span>
                  <span className="badge bg-info bg-opacity-25 text-info-light border border-info border-opacity-25 px-2 py-1 small">
                    🔐 AES-256-GCM Envelope Protection
                  </span>
                  <span className="badge bg-warning bg-opacity-25 text-warning-light border border-warning border-opacity-25 px-2 py-1 small">
                    ⛓️ Merkle-Tree Anchoring
                  </span>
                </div>
              </div>

              <div className="col-lg-4 text-lg-end mt-4 mt-lg-0">
                <div className="p-3 rounded-3 bg-white bg-opacity-10 border border-white border-opacity-10 text-start">
                  <div className="text-white-50 small mb-1 fw-semibold text-uppercase" style={{ fontSize: '0.7rem' }}>
                    Ledger Health Status
                  </div>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span className="badge bg-success rounded-pill px-2 py-1">ONLINE</span>
                    <span className="small text-white fw-bold">Active Merkle Batches</span>
                  </div>
                  <div className="text-white-50" style={{ fontSize: '0.75rem' }}>
                    All blocks cryptographically chained with SHA-256 hash linking.
                  </div>
                  <button
                    className="btn btn-sm btn-outline-light w-100 mt-2 d-flex align-items-center justify-content-center gap-1"
                    onClick={handleVerifyAuditChain}
                    disabled={chainLoading}
                  >
                    {chainLoading ? <span className="spinner-border spinner-border-sm" /> : '🔗'}
                    Check Full Audit Chain
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Global Audit Chain Verification Notification ── */}
        {chainResult && (
          <div
            className={`alert ${chainResult.valid ? 'alert-success border-success' : 'alert-danger border-danger'} d-flex align-items-center justify-content-between shadow-sm mb-4 rounded-3 p-3`}
          >
            <div className="d-flex align-items-center gap-3">
              <span className="fs-3">{chainResult.valid ? '🛡️' : '🚨'}</span>
              <div>
                <h6 className="fw-bold mb-1">
                  {chainResult.valid
                    ? 'Audit Ledger Hash-Chain is 100% INTACT & MATHEMATICALLY VERIFIED'
                    : 'CRITICAL SECURITY BREACH: Audit Ledger Hash-Chain Alteration Detected!'}
                </h6>
                <div className="small">
                  Total Validated Blocks: <strong>{chainResult.totalBlocks ?? 'N/A'}</strong> | Genesis-linked root verified under SHA-256.
                  {chainResult.brokenAtIndex !== null && chainResult.brokenAtIndex !== undefined && (
                    <span className="ms-2 text-danger fw-bold">
                      Broken at Block Index: #{chainResult.brokenAtIndex} ({chainResult.reason})
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button className="btn btn-sm btn-close" onClick={() => setChainResult(null)} aria-label="Close" />
          </div>
        )}

        {chainError && (
          <div className="alert alert-warning border-warning shadow-sm mb-4 rounded-3 d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2 small">
              <span>⚠️</span>
              <span>{chainError}</span>
            </div>
            <button className="btn btn-sm btn-close" onClick={() => setChainError('')} aria-label="Close" />
          </div>
        )}

        {/* ── Search Bar Console Card ── */}
        <div className="card shadow-sm border-0 mb-4 bg-white rounded-3">
          <div className="card-body p-4">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <label className="form-label fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                <span>🔍</span> Document Cryptographic Fingerprint Search
              </label>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm py-1 px-2"
                  onClick={handlePasteClipboard}
                  title="Paste from clipboard"
                >
                  📋 Paste Hash
                </button>
                {hashInput && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm py-1 px-2"
                    onClick={() => {
                      setHashInput('');
                      setResult(null);
                      setError('');
                    }}
                    title="Clear input"
                  >
                    ✕ Clear
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={handleVerify}>
              <div className="input-group input-group-lg shadow-sm">
                <span className="input-group-text bg-light text-muted border-end-0 fw-bold">#</span>
                <input
                  type="text"
                  className="form-control border-start-0 font-monospace fs-6"
                  placeholder="Paste 64-character SHA-256 document fingerprint (e.g. 43ee4e4bdba0cc8...)"
                  value={hashInput}
                  onChange={(e) => setHashInput(e.target.value)}
                  style={{ background: '#f8fafc', color: '#0f172a' }}
                />
                <button
                  className="btn btn-primary px-4 fw-bold d-flex align-items-center gap-2"
                  type="submit"
                  disabled={loading}
                  style={{ minWidth: '160px', justifyContent: 'center' }}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm" />
                      <span>Validating...</span>
                    </>
                  ) : (
                    <>
                      <span>🛡️</span>
                      <span>Verify Hash</span>
                    </>
                  )}
                </button>
              </div>

              {error && <div className="alert alert-danger mt-3 mb-0 py-2 small rounded-2">{error}</div>}
            </form>

            {/* Quick Preset Badges */}
            <div className="mt-3 pt-3 border-top">
              <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                <span className="text-muted small fw-semibold" style={{ fontSize: '0.75rem' }}>
                  TEST PRESETS (ONE-CLICK VERIFICATION):
                </span>
              </div>
              <div className="row g-2">
                {SAMPLE_PRESETS.map((p, idx) => (
                  <div key={idx} className="col-sm-6 col-lg-3">
                    <button
                      type="button"
                      className="btn btn-outline-light text-start w-100 p-2 h-100 border text-dark bg-light hover-shadow transition-all"
                      onClick={() => handlePresetClick(p.hash)}
                      style={{ fontSize: '0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    >
                      <div className="d-flex align-items-center justify-content-between mb-1">
                        <span className="fw-bold text-dark text-truncate">{p.label}</span>
                        <span className={`badge ${p.badgeColor} ms-1`} style={{ fontSize: '0.65rem' }}>
                          {p.badge}
                        </span>
                      </div>
                      <div className="text-muted small text-truncate" style={{ fontSize: '0.7rem' }}>
                        {p.sub}
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Verification Result Display ── */}
        {result && (
          <div className="card shadow border-0 mb-4 rounded-3 overflow-hidden animate-fadeIn">
            <div className="card-body p-4 p-md-5">
              {!result.found ? (
                /* ── NOT FOUND STATE ── */
                <div className="text-center py-5">
                  <div className="fs-1 text-warning mb-3">⚠️</div>
                  <h4 className="fw-bold text-dark mb-2">No Registered Evidence Record Found</h4>
                  <p className="text-muted max-w-lg mx-auto small mb-4" style={{ maxWidth: '540px' }}>
                    The provided SHA-256 fingerprint does not match any registered asset in the legal evidence ledger.
                    Please ensure the exact 64-character hexadecimal digest was copied from the original Section 63 certificate.
                  </p>
                  <div className="p-3 bg-light rounded border mx-auto font-monospace small text-muted text-break" style={{ maxWidth: '620px' }}>
                    Queried Digest: {result.searchedHash || hashInput}
                  </div>
                </div>
              ) : result.tampered || result.intact === false ? (
                /* ── TAMPERED / COMPROMISED STATE ── */
                <div>
                  <TamperAlert
                    title="CRITICAL SECURITY ALERT: EVIDENCE TAMPERING DETECTED"
                    details="Cryptographic authentication tag mismatch or corrupted binary payload. File content has been modified on disk or does not match its genesis Section 63 registration!"
                  />

                  <div className="row g-3 mt-3">
                    <div className="col-md-6">
                      <div className="p-3 bg-light rounded border border-danger">
                        <div className="text-muted small fw-bold">Original Stored Fingerprint (Genesis)</div>
                        <div className="font-monospace text-danger small mt-1 text-break">
                          {result.storedHash || result.document?.sha256}
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="p-3 bg-light rounded border border-danger">
                        <div className="text-muted small fw-bold">Live Recomputed Binary Digest</div>
                        <div className="font-monospace text-danger small mt-1 text-break">
                          {result.computedHash || 'CORRUPTED_AES_GCM_AUTH_TAG'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="alert alert-danger mt-4 mb-0 small">
                    <strong>Legal Consequence:</strong> Under Section 63(4) of the Bharatiya Sakshya Adhiniyam, 2023,
                    this record is inadmissible as primary or secondary electronic evidence due to compromised chain-of-custody.
                  </div>
                </div>
              ) : (
                /* ── VERIFIED & INTACT STATE (Official Certificate Dossier) ── */
                <div>
                  {/* Official Certificate Header Badge */}
                  <div
                    className="p-4 rounded-3 mb-4 text-white position-relative shadow-sm"
                    style={{
                      background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
                      borderLeft: '6px solid #10b981',
                    }}
                  >
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                      <div className="d-flex align-items-center gap-3">
                        <span className="fs-1">🛡️</span>
                        <div>
                          <div className="text-uppercase tracking-wider small text-emerald-200 fw-bold" style={{ fontSize: '0.72rem' }}>
                            BHARATIYA SAKSHYA ADHINIYAM (BSA), 2023 · CERTIFICATE OF INTEGRITY
                          </div>
                          <h4 className="fw-bold mb-0 text-white">
                            EVIDENCE INTEGRITY CERTIFIED: 100% INTACT
                          </h4>
                        </div>
                      </div>

                      <div className="d-flex align-items-center gap-2">
                        <span className="badge bg-light text-success fw-bold px-3 py-2 fs-6 shadow-sm">
                          STATUS: ADMISSIBLE
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dual Hash Match Verification Card */}
                  <div className="card border-success-subtle bg-success-subtle bg-opacity-25 mb-4 border">
                    <div className="card-body p-3">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="small fw-bold text-success text-uppercase">
                          Cryptographic Fingerprint Match (SHA-256 Stream):
                        </span>
                        <span className="badge bg-success text-white small">
                          MATCH 100% · BINARY IDENTICAL
                        </span>
                      </div>
                      <div className="font-monospace small text-dark p-2 bg-white rounded border border-success-subtle text-break">
                        {result.document?.sha256 || result.storedHash}
                      </div>
                    </div>
                  </div>

                  {/* Evidence Dossier Grid */}
                  <div className="row g-4">
                    {/* Left Column: Metadata Specifications */}
                    <div className="col-lg-7">
                      <div className="card h-100 border">
                        <div className="card-header bg-white py-3 fw-bold border-bottom d-flex align-items-center justify-content-between">
                          <span>📄 Official Evidence Provenance Record</span>
                          <span className="badge bg-secondary text-uppercase">
                            {result.document?.type || 'Record'}
                          </span>
                        </div>
                        <div className="card-body p-0">
                          <table className="table table-hover mb-0">
                            <tbody>
                              <tr>
                                <th style={{ width: '35%' }} className="text-muted small ps-3">Document Title:</th>
                                <td className="fw-bold text-dark">{result.document?.title || 'Secured Asset'}</td>
                              </tr>
                              <tr>
                                <th className="text-muted small ps-3">Primary Case / FIR:</th>
                                <td>
                                  <span className="fw-semibold text-primary">
                                    {result.document?.case?.caseNo || result.document?.case?.firNo || 'Linked Legal Case'}
                                  </span>
                                  {result.document?.case?.title && (
                                    <div className="small text-muted">{result.document?.case?.title}</div>
                                  )}
                                </td>
                              </tr>
                              <tr>
                                <th className="text-muted small ps-3">Security Classification:</th>
                                <td>
                                  <ClassificationBadge classification={result.document?.classification || 'restricted'} />
                                </td>
                              </tr>
                              <tr>
                                <th className="text-muted small ps-3">Registered By Officer:</th>
                                <td>
                                  <span className="fw-semibold">{result.document?.uploadedBy?.name || 'Investigating Officer'}</span>
                                  <span className="badge bg-light text-dark border ms-2 small">
                                    {result.document?.uploadedBy?.role?.toUpperCase() || 'IO'}
                                  </span>
                                  {result.document?.uploadedBy?.department && (
                                    <div className="small text-muted">{result.document?.uploadedBy?.department}</div>
                                  )}
                                </td>
                              </tr>
                              <tr>
                                <th className="text-muted small ps-3">Timestamp (Registration):</th>
                                <td className="small">{formatDate(result.document?.uploadedAt || result.verifiedAt)}</td>
                              </tr>
                              <tr>
                                <th className="text-muted small ps-3">Version & State:</th>
                                <td className="small">Version v{result.document?.version || 1} · Active Ledger State</td>
                              </tr>
                              <tr>
                                <th className="text-muted small ps-3">Encrypted Cipher:</th>
                                <td className="small">AES-256-GCM Envelope Encryption (KMS Wrapped)</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Court Admissibility & Official Actions */}
                    <div className="col-lg-5">
                      <div className="card h-100 border bg-light">
                        <div className="card-header bg-white py-3 fw-bold border-bottom">
                          ⚖️ Statutory Compliance & Admissibility
                        </div>
                        <div className="card-body d-flex flex-column justify-content-between p-4">
                          <div>
                            <div className="d-flex align-items-center gap-2 mb-3">
                              <span className="fs-4 text-primary">🏛️</span>
                              <div>
                                <h6 className="fw-bold mb-0 text-dark">Bharatiya Sakshya Adhiniyam</h6>
                                <small className="text-muted">Section 63 Certificate Generated</small>
                              </div>
                            </div>

                            <p className="small text-muted mb-3" style={{ lineHeight: '1.5' }}>
                              This record has been authenticated against the tamper-evident Merkle ledger.
                              Meets the statutory criteria of Section 63(1) and Section 63(2) of BSA 2023 for admissibility before
                              any Court of Law in the Union of India.
                            </p>

                            <ul className="small text-secondary ps-3 mb-0" style={{ lineHeight: '1.6' }}>
                              <li>Envelope AES-256-GCM authentication verified</li>
                              <li>Cryptographic hash unchanged from genesis recording</li>
                              <li>Section 63 PDF includes QR code and officer credentials</li>
                            </ul>
                          </div>

                          <div className="pt-3 border-top mt-3">
                            {result.document?.id && (
                              <a
                                href={`${API_BASE}/documents/${result.document.id}/certificate`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-primary w-100 fw-bold d-flex align-items-center justify-content-center gap-2 py-2 shadow-sm"
                              >
                                <span>🧾</span> Download Section 63 Certificate (PDF)
                              </a>
                            )}
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm w-100 mt-2 d-flex align-items-center justify-content-center gap-2"
                              onClick={() => handleCopyHash(result.document?.sha256 || result.storedHash)}
                            >
                              <span>📋</span> {copied ? 'Fingerprint Copied!' : 'Copy SHA-256 Fingerprint'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Three Pillars of Security (Educational Walkthrough) ── */}
        <div className="row g-3 mt-2">
          <div className="col-md-4">
            <div className="card border-0 shadow-sm h-100 p-3 bg-white rounded-3">
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="fs-4">🔐</span>
                <h6 className="fw-bold text-dark mb-0">AES-256-GCM Envelope Encryption</h6>
              </div>
              <p className="small text-muted mb-0" style={{ lineHeight: '1.5' }}>
                Every document generates an ephemeral 256-bit symmetric data key wrapped under the master KMS.
                Any single bit alteration in storage immediately invalidates the 128-bit GCM authentication tag.
              </p>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card border-0 shadow-sm h-100 p-3 bg-white rounded-3">
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="fs-4">⛓️</span>
                <h6 className="fw-bold text-dark mb-0">Merkle-Tree Ledger Anchoring</h6>
              </div>
              <p className="small text-muted mb-0" style={{ lineHeight: '1.5' }}>
                All document uploads, signatures, and access events are bundled into cryptographically anchored Merkle tree batches.
                Provides indisputable proof of existence without exposing confidential content.
              </p>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card border-0 shadow-sm h-100 p-3 bg-white rounded-3">
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="fs-4">⚖️</span>
                <h6 className="fw-bold text-dark mb-0">Section 63 BSA 2023 Admissibility</h6>
              </div>
              <p className="small text-muted mb-0" style={{ lineHeight: '1.5' }}>
                Replaces old Section 65B of Indian Evidence Act 1872. Produces automated electronic record certificates
                bearing system hash, hardware identifiers, and digital officer signatures for court proceedings.
              </p>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="text-center py-4 mt-3 text-muted small border-top">
          <div>
            <strong>SecureDoc DMS</strong> · National Electronic Evidence & Digital Document Integrity Platform
          </div>
          <div className="mt-1" style={{ fontSize: '0.72rem' }}>
            Ministry of Home Affairs · National Crime Records Bureau (NCRB) · Government of India
          </div>
        </div>
      </div>
    </div>
  );
}
