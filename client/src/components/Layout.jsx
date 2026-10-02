/**
 * Layout.jsx
 * Main app shell with fixed top navbar and dark left sidebar.
 * Uses react-router-dom NavLink for active link highlighting.
 * The <Outlet /> renders the current page inside the main content area.
 */
import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getRoleBadgeColor } from '../utils/formatters';

// ── Sidebar navigation items ──────────────────────────────────
const NAV_ITEMS = [
  { to: '/dashboard',  icon: '📊', label: 'Dashboard' },
  { to: '/cases',      icon: '📁', label: 'Cases' },
  { to: '/search',     icon: '🔍', label: 'Search' },
  { to: '/deadlines',  icon: '⏰', label: 'Deadlines' },
  { to: '/audit',      icon: '🔗', label: 'Audit Log' },
  { to: '/verify',     icon: '✅', label: 'Verify Integrity' },
];

const ADMIN_ITEM = { to: '/admin', icon: '⚙️', label: 'Admin' };

function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleSidebar = () => {
    if (window.innerWidth < 992) {
      setIsMobileOpen(prev => !prev);
    } else {
      setIsSidebarOpen(prev => !prev);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  const navItems = [...NAV_ITEMS];
  if (user?.role === 'admin') navItems.push(ADMIN_ITEM);

  return (
    <>
      {/* ── Top Navbar ─────────────────────────────────────────── */}
      <nav className="top-navbar d-flex align-items-center px-3">
        {/* 3-Lines Navigation Bar Toggle Button (Open / Close) */}
        <button
          className="btn-nav-toggle me-3 d-flex align-items-center justify-content-center"
          onClick={toggleSidebar}
          aria-label="Toggle Navigation Sidebar"
          title="Toggle Navigation Menu (3 Lines)"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="hamburger-icon"
          >
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        {/* Brand */}
        <span className="navbar-brand mb-0 me-auto d-flex align-items-center gap-2">
          <img src="/shield.svg" alt="SecureDoc Emblem" width="28" height="28" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }} />
          <span>
            <span className="brand-accent fw-bold">Secure</span>Doc <span className="opacity-75 fw-normal fs-6 d-none d-sm-inline">DMS</span>
          </span>
        </span>

        {/* User info */}
        {user && (
          <div className="d-flex align-items-center gap-2 gap-sm-3">
            <div className="text-end d-none d-md-block">
              <div className="text-white fw-semibold small lh-1">{user.name || user.email}</div>
              <span className={`badge bg-${getRoleBadgeColor(user.role)} mt-1`} style={{ fontSize: '0.65rem' }}>
                {user.role?.toUpperCase()}
              </span>
            </div>

            {/* Profile link */}
            <NavLink
              to="/profile"
              className="btn btn-outline-light btn-sm d-flex align-items-center gap-1"
              style={{ fontSize: '0.8rem' }}
            >
              <span className="d-none d-sm-inline">👤</span> Profile
            </NavLink>

            {/* Logout */}
            <button
              className="btn btn-danger btn-sm d-flex align-items-center gap-1"
              onClick={handleLogout}
              disabled={loggingOut}
              style={{ fontSize: '0.8rem' }}
            >
              {loggingOut ? (
                <span className="spinner-border spinner-border-sm" />
              ) : (
                <>
                  <span className="d-none d-sm-inline">🔒</span> Logout
                </>
              )}
            </button>
          </div>
        )}
      </nav>

      {/* ── Mobile Sidebar Backdrop ───────────────────────────── */}
      {isMobileOpen && (
        <div
          className="sidebar-backdrop d-lg-none"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ────────────────────────────────────────────── */}
      <aside className={`sidebar ${!isSidebarOpen ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Navigation</div>

          {navItems.slice(0, 2).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setIsMobileOpen(false)}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <span className="icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          <hr className="sidebar-divider" />
          <div className="sidebar-section-label">Tools</div>

          {navItems.slice(2).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setIsMobileOpen(false)}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <span className="icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          {user?.role === 'admin' && (
            <>
              <hr className="sidebar-divider" />
              <div className="sidebar-section-label">Administration</div>
              <NavLink
                to="/admin"
                onClick={() => setIsMobileOpen(false)}
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              >
                <span className="icon">⚙️</span>
                Admin
              </NavLink>
            </>
          )}
        </nav>

        {/* Bottom info */}
        <div
          className="p-3 mt-auto"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>
            <span className="fw-semibold text-light">SecureDoc DMS v1.0</span>
            <br />Ministry of Home Affairs · NCRB
          </div>
        </div>
      </aside>

      <main className={`main-content ${!isSidebarOpen ? 'expanded' : ''}`}>
        {children || <Outlet />}
      </main>
    </>
  );
}

export default Layout;
