import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 12) {
      setError('Password must be at least 12 characters.');
      return;
    }

    setLoading(true);
    try {
      const response = await axiosInstance.post('/auth/register', {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      setMessage(response.data?.data?.message || 'Registration successful.');
      setTimeout(() => navigate('/login'), 1200);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="card login-card shadow-lg">
          <div className="login-header">
            <div className="login-shield-wrapper mb-2">
              <img src="/shield.svg" alt="SecureDoc Emblem" width="56" height="56" className="login-shield-icon" />
            </div>
            <h3 className="fw-bold mb-1 text-white">Create Normal User Account</h3>
            <div className="text-light opacity-75 small">
              Privileged officer roles require authority approval.
            </div>
          </div>

          <div className="card-body p-4">
            {error && <div className="alert alert-danger py-2 small">{error}</div>}
            {message && <div className="alert alert-success py-2 small">{message}</div>}

            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Full Name</label>
                <input
                  name="name"
                  className="form-control"
                  value={form.name}
                  onChange={updateField}
                  required
                  autoComplete="name"
                />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Email Address</label>
                <input
                  name="email"
                  type="email"
                  className="form-control"
                  value={form.email}
                  onChange={updateField}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Password</label>
                <input
                  name="password"
                  type="password"
                  className="form-control"
                  value={form.password}
                  onChange={updateField}
                  minLength={12}
                  required
                  autoComplete="new-password"
                />
                <div className="form-text">Use at least 12 characters.</div>
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Confirm Password</label>
                <input
                  name="confirmPassword"
                  type="password"
                  className="form-control"
                  value={form.confirmPassword}
                  onChange={updateField}
                  required
                  autoComplete="new-password"
                />
              </div>
              <button className="btn btn-primary w-100 fw-bold" disabled={loading}>
                {loading ? 'Creating account…' : 'Create Normal User Account'}
              </button>
            </form>

            <div className="text-center mt-3 small">
              Already registered? <Link to="/login">Sign in</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
