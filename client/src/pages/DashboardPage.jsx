/**
 * DashboardPage.jsx
 * Main dashboard: stats, charts, recent activity, quick actions, deadline alerts.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext.jsx';
import { formatDate, getRoleBadgeColor, getDaysOpen } from '../utils/formatters';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// ── Stat Card ─────────────────────────────────────────────────
function StatCard({ icon, value, label, colorClass, subtitle }) {
  return (
    <div className={`card stat-card ${colorClass} p-3 h-100`}>
      <div className="d-flex align-items-center justify-content-between">
        <div>
          <div className="stat-label mb-1">{label}</div>
          <div className="stat-value">{value ?? '0'}</div>
          {subtitle && <div className="text-muted small mt-1" style={{ fontSize: '0.72rem' }}>{subtitle}</div>}
        </div>
        <div className="stat-icon p-2 rounded-circle bg-light d-flex align-items-center justify-content-center" style={{ width: 48, height: 48 }}>
          <span style={{ fontSize: '1.4rem' }}>{icon}</span>
        </div>
      </div>
    </div>
  );
}

// ── Recent activity row ───────────────────────────────────────
function ActivityRow({ event, index }) {
  return (
    <tr>
      <td className="text-muted small">{index + 1}</td>
      <td className="small">{formatDate(event.ts || event.createdAt || event.timestamp)}</td>
      <td>
        <span className="badge bg-secondary">{event.userId?.name || event.performedBy?.name || 'System'}</span>
      </td>
      <td>
        <span className="badge bg-primary">{event.action}</span>
      </td>
      <td className="small text-truncate" style={{ maxWidth: 180 }}>
        {event.docId?.title || event.caseId?.caseNo || event.document?.title || event.documentId || '—'}
      </td>
    </tr>
  );
}

function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats]       = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [overdue, setOverdue]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [complianceRes, auditRes] = await Promise.allSettled([
          axiosInstance.get('/reports/compliance'),
          axiosInstance.get('/audit?limit=10'),
        ]);

        if (complianceRes.status === 'fulfilled') {
          const cData = complianceRes.value.data?.data || complianceRes.value.data;
          setStats(cData);
          // Cases overdue (sexual offence > 60 days)
          const cases = cData?.sexualOffenceCases || [];
          setOverdue(cases.filter(c => getDaysOpen(c.registeredAt) >= 45));
        }
        if (auditRes.status === 'fulfilled') {
          const data = auditRes.value.data;
          const evs = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : (data?.events || []));
          setAuditLog(evs);
        }
      } catch (e) {
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Helper to get doc count regardless of case
  const getDocCount = (key) => {
    if (!stats) return 0;
    const map = stats.documentsByType || stats.docsByType || {};
    return map[key.toLowerCase()] || map[key] || 0;
  };

  // ── Chart data ───────────────────────────────────────────────
  const caseStatusData = {
    labels: ['Open', 'Investigation', 'Charge Sheet', 'In Court', 'Closed'],
    datasets: [{
      data: [
        stats?.casesByStatus?.open || 0,
        stats?.casesByStatus?.investigation || 0,
        stats?.casesByStatus?.charge_sheet || 0,
        stats?.casesByStatus?.in_court || 0,
        stats?.casesByStatus?.closed || 0,
      ],
      backgroundColor: ['#0d6efd', '#ffc107', '#0dcaf0', '#198754', '#6c757d'],
      borderWidth: 0,
    }],
  };

  const docTypeData = {
    labels: ['FIR', 'Statement', 'Evidence', 'Forensic', 'Charge Sheet', 'Court Filing', 'Other'],
    datasets: [{
      label: 'Documents',
      data: [
        getDocCount('fir'),
        getDocCount('statement'),
        getDocCount('evidence'),
        getDocCount('forensic'),
        getDocCount('charge_sheet'),
        getDocCount('court_filing'),
        getDocCount('other'),
      ],
      backgroundColor: '#0f3460',
      borderRadius: 6,
    }],
  };


  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: 400 }}>
        <div className="text-center">
          <div className="spinner-border text-danger mb-2" style={{ width: '2.5rem', height: '2.5rem' }} />
          <div className="text-muted">Loading dashboard…</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ── Overdue Banner ──────────────────────────────────── */}
      {overdue.length > 0 && (
        <div className="alert alert-danger d-flex align-items-center gap-2 mb-3" role="alert">
          <span>⚠️</span>
          <strong>{overdue.length} sexual offence case{overdue.length > 1 ? 's' : ''}</strong>
          &nbsp;approaching or past 60-day POCSO deadline.
          <button className="btn btn-danger btn-sm ms-auto" onClick={() => navigate('/deadlines')}>
            View Deadlines
          </button>
        </div>
      )}

      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h4 className="page-title mb-0">
            📊 Dashboard
          </h4>
          <small className="text-muted">
            Welcome back,{' '}
            <strong>{user?.name || user?.email}</strong>
            {' '}·{' '}
            <span className={`badge bg-${getRoleBadgeColor(user?.role)}`}>
              {user?.role?.toUpperCase()}
            </span>
          </small>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button className="btn btn-sm btn-primary" onClick={() => navigate('/cases')}>
            📁 New Case
          </button>
          <button className="btn btn-sm btn-success" onClick={() => navigate('/cases')}>
            📤 Upload Document
          </button>
          <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate('/verify')}>
            ✅ Verify Integrity
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* ── Stats Row ───────────────────────────────────────── */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard icon="📁" value={stats?.totalCases} label="Total Cases" colorClass="stat-card-primary" subtitle="Active investigations" />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard icon="📄" value={stats?.totalDocuments} label="Total Documents" colorClass="stat-card-danger" subtitle="Encrypted in GridFS" />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard icon="🔗" value={stats?.activeShares} label="Active Shares" colorClass="stat-card-warning" subtitle="Authorized access" />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard icon="✍️" value={stats?.pendingSignatures} label="Pending Signatures" colorClass="stat-card-success" subtitle="BNSS statutory tracker" />
        </div>
      </div>

      {/* ── Charts Row ──────────────────────────────────────── */}
      <div className="row g-3 mb-3">
        <div className="col-md-4">
          <div className="card h-100">
            <div className="card-header small fw-semibold">Cases by Status</div>
            <div className="card-body d-flex align-items-center justify-content-center" style={{ maxHeight: 260 }}>
              <Doughnut
                data={caseStatusData}
                options={{
                  cutout: '65%',
                  plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } },
                  maintainAspectRatio: false,
                }}
                height={200}
              />
            </div>
          </div>
        </div>
        <div className="col-md-8">
          <div className="card h-100">
            <div className="card-header small fw-semibold">Documents by Type</div>
            <div className="card-body" style={{ maxHeight: 260 }}>
              <Bar
                data={docTypeData}
                options={{
                  plugins: { legend: { display: false } },
                  scales: {
                    y: { beginAtZero: true, grid: { color: '#f0f0f0' }, ticks: { font: { size: 11 } } },
                    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
                  },
                  maintainAspectRatio: false,
                }}
                height={200}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Additional Stats ─────────────────────────────────── */}
      <div className="row g-3 mb-3">
        <div className="col-md-4">
          <div className="card">
            <div className="card-body text-center p-3">
              <div className="text-muted small">Women Safety Cases</div>
              <div className="fs-2 fw-bold text-danger">{stats?.sexualOffenceCases?.length || stats?.womenSafetyCases || 0}</div>
              <div className="small text-muted">Sexual Offence Cases</div>
              <button className="btn btn-outline-danger btn-sm mt-2 w-100" onClick={() => navigate('/deadlines')}>
                View Deadlines →
              </button>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card">
            <div className="card-body text-center p-3">
              <div className="text-muted small">Integrity Health</div>
              <div className="fs-2 fw-bold text-success">{stats?.intactDocuments || 0}</div>
              <div className="small text-muted">Documents Verified Intact</div>
              {stats?.tamperedDocuments > 0 && (
                <div className="badge bg-danger mt-1">{stats.tamperedDocuments} Tampered</div>
              )}
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card">
            <div className="card-body text-center p-3">
              <div className="text-muted small">Merkle Chain</div>
              <div className="fs-2 fw-bold text-primary">{stats?.merkleBlocks || 0}</div>
              <div className="small text-muted">Audit Blocks Sealed</div>
              <button className="btn btn-outline-primary btn-sm mt-2 w-100" onClick={() => navigate('/audit')}>
                View Audit Log →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent Activity ──────────────────────────────────── */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between">
          <span className="fw-semibold">🔗 Recent Activity</span>
          <button className="btn btn-link btn-sm p-0" onClick={() => navigate('/audit')}>
            View all →
          </button>
        </div>
        <div className="card-body p-0">
          {auditLog.length === 0 ? (
            <div className="text-center text-muted py-4">No recent activity</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover table-sm mb-0">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Time (IST)</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Document</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLog.slice(0, 10).map((event, i) => (
                    <ActivityRow key={event._id || i} event={event} index={i} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
