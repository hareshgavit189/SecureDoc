/**
 * ProfilePage.jsx
 * Officer Identity, Two-Factor Authentication (TOTP), and Digital Signature Key Management.
 */
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import axiosInstance from '../api/axiosInstance';
import ClassificationBadge from '../components/ClassificationBadge';
import { getRoleBadgeColor } from '../utils/formatters';

export default function ProfilePage() {
  const { user } = useAuth();

  // 2FA State
  const [totpSetupData, setTotpSetupData] = useState(null);
  const [totpCode, setTotpCode] = useState('');
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpSuccess, setTotpSuccess] = useState(false);
  const [totpError, setTotpError] = useState('');

  // Key Pair State
  const [keyPairLoading, setKeyPairLoading] = useState(false);
  const [keyPairSuccess, setKeyPairSuccess] = useState('');

  const handleInitiate2FA = async () => {
    setTotpLoading(true);
    setTotpError('');
    try {
      const res = await axiosInstance.post('/auth/2fa/setup');
      if (res.data?.success) {
        setTotpSetupData(res.data.data);
      }
    } catch (err) {
      setTotpError(err.response?.data?.error || 'Failed to initialize TOTP secret.');
    } finally {
      setTotpLoading(false);
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    if (!totpCode || totpCode.length !== 6) {
      setTotpError('Please enter a valid 6-digit verification code.');
      return;
    }
    setTotpLoading(true);
    setTotpError('');
    try {
      const res = await axiosInstance.post('/auth/2fa/verify', { token: totpCode });
      if (res.data?.success) {
        setTotpSuccess(true);
        setTotpSetupData(null);
      }
    } catch (err) {
      setTotpError(err.response?.data?.error || 'Invalid TOTP code. Try again.');
    } finally {
      setTotpLoading(false);
    }
  };

  return (
    <div className="container-fluid p-4">
      {/* Header */}
      <div className="mb-4">
        <h2 className="fw-bold mb-1">👤 Officer Profile & Cryptographic Identity</h2>
        <p className="text-muted small mb-0">
          Manage credentials, TOTP two-factor hardware tokens, and ECDSA P-256 digital signature keys
        </p>
      </div>

      <div className="row g-4">
        {/* Profile Card */}
        <div className="col-lg-5">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white py-3 fw-bold">
              <span>Security Clearance & Identity Credentials</span>
            </div>
            <div className="card-body p-4">
              <div className="text-center mb-4">
                <div
                  className="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center fw-bold fs-2 shadow-sm"
                  style={{ width: '80px', height: '80px' }}
                >
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : 'IO'}
                </div>
                <h4 className="fw-bold mt-3 mb-1">{user?.name}</h4>
                <p className="text-muted small font-monospace">{user?.email}</p>
                <div className="d-flex justify-content-center gap-2 mt-2">
                  <span className={`badge bg-${getRoleBadgeColor(user?.role)} text-uppercase px-2 py-1`}>
                    {user?.role}
                  </span>
                  <ClassificationBadge classification={user?.clearance || 'restricted'} />
                </div>
              </div>

              <hr />

              <div className="row g-2 small">
                <div className="col-6 text-muted">Department / Wing:</div>
                <div className="col-6 fw-semibold text-end">{user?.department || 'Investigation Wing'}</div>

                <div className="col-6 text-muted">Statutory Role:</div>
                <div className="col-6 fw-semibold text-end text-capitalize">{user?.role || 'IO'}</div>

                <div className="col-6 text-muted">Clearance Level:</div>
                <div className="col-6 fw-semibold text-end text-uppercase">{user?.clearance || 'Restricted'}</div>

                <div className="col-6 text-muted">2FA Status:</div>
                <div className="col-6 text-end">
                  {user?.totpEnabled || totpSuccess ? (
                    <span className="badge bg-success">Active (TOTP)</span>
                  ) : (
                    <span className="badge bg-secondary">Unconfigured</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2FA & Key Management Column */}
        <div className="col-lg-7">
          {/* Section: Two-Factor Authentication (TOTP) */}
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-header bg-white py-3 fw-bold d-flex align-items-center justify-content-between">
              <span>🔐 Multi-Factor Authentication (MHA IT Security Guidelines)</span>
              {user?.totpEnabled || totpSuccess ? (
                <span className="badge bg-success">Protected</span>
              ) : (
                <span className="badge bg-warning text-dark">Action Required</span>
              )}
            </div>
            <div className="card-body p-4">
              <p className="small text-muted mb-3">
                Mandatory for accessing Confidential and Secret evidence files. Compatible with Google Authenticator, Microsoft Authenticator, or hardware TOTP keys.
              </p>

              {totpSuccess && (
                <div className="alert alert-success py-2 small mb-3">
                  ✅ Two-factor authentication successfully activated for your account!
                </div>
              )}
              {totpError && (
                <div className="alert alert-danger py-2 small mb-3">
                  {totpError}
                </div>
              )}

              {!totpSetupData ? (
                <div>
                  <button
                    className="btn btn-primary btn-sm d-flex align-items-center gap-2"
                    onClick={handleInitiate2FA}
                    disabled={totpLoading || user?.totpEnabled || totpSuccess}
                  >
                    {totpLoading ? <span className="spinner-border spinner-border-sm" /> : '📲'}
                    {user?.totpEnabled || totpSuccess ? '2FA Enabled and Active' : 'Setup TOTP Authenticator'}
                  </button>
                </div>
              ) : (
                <div className="border rounded p-3 bg-light">
                  <h6 className="fw-bold mb-2">Scan QR Code in Authenticator App</h6>
                  <div className="text-center my-3">
                    <img
                      src={totpSetupData.qr}
                      alt="TOTP QR Code"
                      className="border rounded shadow-sm bg-white p-2"
                      style={{ maxWidth: '180px' }}
                    />
                  </div>
                  <form onSubmit={handleVerify2FA} className="mt-3">
                    <label className="form-label small fw-semibold">Enter 6-Digit Code from App</label>
                    <div className="input-group input-group-sm mb-3">
                      <input
                        type="text"
                        className="form-control font-monospace text-center fs-5"
                        maxLength="6"
                        placeholder="123456"
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value)}
                        required
                      />
                      <button className="btn btn-success px-3 fw-semibold" type="submit" disabled={totpLoading}>
                        {totpLoading ? <span className="spinner-border spinner-border-sm" /> : 'Confirm Code'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* Section: Digital Signatures (ECDSA P-256) */}
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white py-3 fw-bold d-flex align-items-center justify-content-between">
              <span>✍️ Digital Signature Cryptographic Key Pair</span>
              <span className="badge bg-info">ECDSA P-256</span>
            </div>
            <div className="card-body p-4">
              <p className="small text-muted mb-3">
                Used to affix legally binding digital signatures on FIRs, statements, and charge sheets under the <strong>IT Act 2000 & BSA 2023</strong>.
              </p>

              <div className="bg-light p-3 rounded border font-monospace small mb-3">
                <div className="text-muted small fw-bold mb-1">Standard Algorithm:</div>
                <div className="text-dark">Elliptic Curve Digital Signature Algorithm (ECDSA / NIST P-256) with SHA-256 digest</div>
                <div className="text-muted small fw-bold mt-2 mb-1">Aadhaar eSign Integration:</div>
                <div className="text-dark">Supports mock ESP challenge-response API 2.1 & 3.3 for citizen FIR signing and IO mass execution</div>
              </div>

              <div className="d-flex align-items-center gap-2">
                <span className="badge bg-success p-2">✅ Signature Key Ready on Server</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
