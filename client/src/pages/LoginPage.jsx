/**
 * LoginPage.jsx
 * Professional Government Portal Login with Role Quick-Switching,
 * In-Memory Token Handling, Brute-Force Guard, and TOTP 2FA.
 */
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const DEMO_PERSONAS = [
  { role: 'IO (Investigating Officer)', email: 'io@securedoc.gov', badge: 'bg-primary' },
  { role: 'SP (Superintendent)', email: 'sp@securedoc.gov', badge: 'bg-danger' },
  { role: 'System Admin', email: 'admin@securedoc.gov', badge: 'bg-dark' },
  { role: 'Forensic Analyst', email: 'forensic@securedoc.gov', badge: 'bg-warning text-dark' },
  { role: 'Public Prosecutor', email: 'prosecutor@securedoc.gov', badge: 'bg-info text-dark' },
  { role: 'Citizen / Informant', email: 'citizen@example.com', badge: 'bg-secondary' },
];

function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from?.pathname || '/dashboard';

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp]         = useState('');
  const [showTotp, setShowTotp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password, totp.trim() || undefined);
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Authentication failed';
      if (msg.toLowerCase().includes('2fa') || msg.toLowerCase().includes('totp') || msg.toLowerCase().includes('otp')) {
        setShowTotp(true);
        setError('Two-Factor Authentication required. Enter the 6-digit TOTP code.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const selectPersona = (pEmail) => {
    setEmail(pEmail);
    setPassword('Demo@1234');
    setError('');
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Main Card */}
        <div className="card login-card shadow-lg">
          {/* Header */}
          <div className="login-header">
            <div className="login-shield-wrapper mb-2">
              <img src="/shield.svg" alt="SecureDoc Emblem" width="56" height="56" className="login-shield-icon" />
            </div>
            <h3 className="fw-bold mb-1 text-white letter-spacing-tight">SecureDoc DMS</h3>
            <div className="text-light opacity-90 small fw-medium">
              Ministry of Home Affairs · NCRB · Women Safety Division
            </div>
            <div className="text-light opacity-75 mt-1" style={{ fontSize: '0.75rem' }}>
              Digital Legal Evidence & Investigation Document Management System
            </div>
          </div>

          {/* Body */}
          <div className="card-body p-4 p-sm-4">
            {error && (
              <div className="alert alert-danger d-flex align-items-center gap-2 py-2 mb-3 small" role="alert">
                <span className="fs-6">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* Email */}
              <div className="mb-3">
                <label className="form-label small fw-semibold text-secondary">
                  Official Email Address
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light text-muted border-end-0">
                    ✉️
                  </span>
                  <input
                    type="email"
                    className="form-control border-start-0 ps-0"
                    placeholder="officer@securedoc.gov"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <label className="form-label small fw-semibold text-secondary mb-1">
                    Secure Password
                  </label>
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-decoration-none text-muted"
                    style={{ fontSize: '0.75rem' }}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? 'Hide 🙈' : 'Show 👁️'}
                  </button>
                </div>
                <div className="input-group">
                  <span className="input-group-text bg-light text-muted border-end-0">
                    🔑
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control border-start-0 ps-0"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {/* TOTP 2FA if requested */}
              {showTotp && (
                <div className="mb-3 animate-fade-in">
                  <label className="form-label small fw-semibold text-danger">
                    🔐 Authenticator 6-Digit TOTP
                  </label>
                  <input
                    type="text"
                    className="form-control font-mono text-center letter-spacing-3 fw-bold fs-5 text-primary"
                    placeholder="000000"
                    maxLength={6}
                    value={totp}
                    onChange={(e) => setTotp(e.target.value.replace(/\D/g, ''))}
                    inputMode="numeric"
                  />
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="btn btn-primary w-100 fw-bold py-2 shadow-sm d-flex align-items-center justify-content-center gap-2"
                disabled={loading}
                style={{ background: 'linear-gradient(135deg, #0f3460 0%, #16213e 100%)', borderColor: '#0f3460' }}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" />
                    <span>Verifying Credentials…</span>
                  </>
                ) : (
                  <>
                    <span>🛡️ Sign In to Secure Evidence Vault</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Persona Selector */}
            <div className="mt-4 pt-3 border-top">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="small fw-bold text-uppercase text-muted" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                  Quick Demo Personas
                </span>
                <span className="badge bg-light text-muted border" style={{ fontSize: '0.65rem' }}>
                  Password: Demo@1234
                </span>
              </div>
              <div className="d-flex flex-wrap gap-1">
                {DEMO_PERSONAS.map((p) => {
                  const isSelected = email === p.email;
                  return (
                    <button
                      key={p.email}
                      type="button"
                      className={`btn btn-sm text-start py-1 px-2 border transition-all ${
                        isSelected ? 'btn-primary shadow-sm text-white' : 'btn-light text-dark'
                      }`}
                      style={{ fontSize: '0.72rem' }}
                      onClick={() => selectPersona(p.email)}
                    >
                      {p.role.split(' ')[0]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="card-footer bg-light py-2 text-center border-top">
            <span className="text-muted" style={{ fontSize: '0.7rem' }}>
              🔒 Bharatiya Sakshya Adhiniyam (BSA) 2023 · Section 63 Compliant · AES-256-GCM
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
