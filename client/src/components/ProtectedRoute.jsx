/**
 * ProtectedRoute.jsx
 * Wraps protected pages. Redirects to /login if not authenticated.
 * Shows a loading spinner while auth state is being resolved.
 */
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        className="d-flex align-items-center justify-content-center"
        style={{ minHeight: '100vh', background: '#f0f2f5' }}
      >
        <div className="text-center">
          <div
            className="spinner-border text-danger mb-3"
            style={{ width: '3rem', height: '3rem' }}
            role="status"
          />
          <div className="text-muted fw-semibold">Loading SecureDoc…</div>
        </div>
      </div>
    );
  }

  if (!user) {
    // Save the attempted URL so we can redirect after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default ProtectedRoute;
