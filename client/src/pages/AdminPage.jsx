/**
 * AdminPage.jsx
 * System Administration & Security Operations Console.
 * - User Role-Based Access Control (RBAC) & Clearance Level Management
 * - Compliance Audit Reports & System Health
 * - Merkle-Tree Ledger Batches & Manual Batch Trigger
 * - Audit Chain Integrity Verifier & Tamper Detection Simulation
 */
import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import HashDisplay from '../components/HashDisplay';
import ClassificationBadge from '../components/ClassificationBadge';
import { formatDate, getRoleBadgeColor } from '../utils/formatters';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'compliance' | 'merkle'

  // Users State
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userModal, setUserModal] = useState(null); // Selected user for editing

  // Compliance State
  const [compliance, setCompliance] = useState(null);
  const [, setCompLoading] = useState(false);
  const [chainVerifyResult, setChainVerifyResult] = useState(null);
  const [verifyingChain, setVerifyingChain] = useState(false);

  // Merkle Batches State
  const [batches, setBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [batchActionLoading, setBatchActionLoading] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'compliance') fetchCompliance();
    if (activeTab === 'merkle') fetchBatches();
  }, [activeTab]);

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await axiosInstance.get('/auth/users');
      if (res.data?.success) setUsers(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch users list.');
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchCompliance = async () => {
    setCompLoading(true);
    try {
      const res = await axiosInstance.get('/reports/compliance');
      if (res.data?.success) setCompliance(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load compliance report.');
    } finally {
      setCompLoading(false);
    }
  };

  const fetchBatches = async () => {
    setBatchesLoading(true);
    try {
      const res = await axiosInstance.get('/ledger/batches');
      if (res.data?.success) setBatches(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch Merkle ledger batches.');
    } finally {
      setBatchesLoading(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!userModal) return;
    try {
      const res = await axiosInstance.put(`/auth/users/${userModal._id}`, {
        role: userModal.role,
        clearance: userModal.clearance,
        department: userModal.department,
        unlock: userModal.unlock,
      });
      if (res.data?.success) {
        setMessage(`Updated permissions for ${userModal.name}`);
        setUserModal(null);
        fetchUsers();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update user.');
    }
  };

  const handleVerifyChain = async () => {
    setVerifyingChain(true);
    setChainVerifyResult(null);
    try {
      const res = await axiosInstance.get('/ledger/verify-chain');
      if (res.data?.success) {
        setChainVerifyResult(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Chain verification request failed.');
    } finally {
      setVerifyingChain(false);
    }
  };

  const handleTriggerMerkleBatch = async () => {
    setBatchActionLoading(true);
    try {
      const res = await axiosInstance.post('/ledger/run-batch');
      if (res.data?.success) {
        setMessage('Merkle batch anchored successfully.');
        fetchBatches();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Merkle batch generation failed.');
    } finally {
      setBatchActionLoading(false);
    }
  };

  return (
    <div className="container-fluid p-4">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-dark px-2 py-1 fs-6">⚙️ Admin Console</span>
            <span className="badge bg-danger px-2 py-1 fs-6">Security & Ledger Management</span>
          </div>
          <h2 className="fw-bold mt-2 mb-1">System Administration & Audit Governance</h2>
          <p className="text-muted small mb-0">
            RBAC clearance administration, statutory compliance audit exports, and Merkle ledger root management
          </p>
        </div>
      </div>

      {message && (
        <div className="alert alert-success alert-dismissible fade show py-2 small" role="alert">
          {message}
          <button type="button" className="btn-close py-2" onClick={() => setMessage('')} />
        </div>
      )}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show py-2 small" role="alert">
          {error}
          <button type="button" className="btn-close py-2" onClick={() => setError('')} />
        </div>
      )}

      {/* Tabs */}
      <ul className="nav nav-pills mb-4 bg-light p-2 rounded-3">
        <li className="nav-item">
          <button
            className={`nav-link fw-semibold ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 User & Clearance RBAC ({users.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link fw-semibold ${activeTab === 'compliance' ? 'active' : ''}`}
            onClick={() => setActiveTab('compliance')}
          >
            📊 Compliance & System Metrics
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link fw-semibold ${activeTab === 'merkle' ? 'active' : ''}`}
            onClick={() => setActiveTab('merkle')}
          >
            ⛓️ Merkle-Tree Ledger Batches ({batches.length})
          </button>
        </li>
      </ul>

      {/* TAB 1: USERS & RBAC */}
      {activeTab === 'users' && (
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white py-3 d-flex align-items-center justify-content-between">
            <span className="fw-bold">Security Profiles & Roles Roster</span>
            <span className="text-muted small">Citizen self-registration; authority-approved role assignment</span>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small text-muted">
                  <tr>
                    <th>Officer / User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Clearance</th>
                    <th>Approval</th>
                    <th>2FA (TOTP)</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersLoading ? (
                    <tr>
                      <td colSpan="9" className="text-center py-4 text-muted">
                        <span className="spinner-border spinner-border-sm me-2" /> Loading users...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-4 text-muted">
                        No registered users found.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => {
                      const isLocked = u.lockUntil && new Date(u.lockUntil) > new Date();
                      return (
                        <tr key={u._id}>
                          <td className="fw-semibold">{u.name}</td>
                          <td className="small text-muted font-monospace">{u.email}</td>
                          <td>
                            <span className={`badge ${
                              u.approvalStatus === 'approved' ? 'bg-success' :
                                u.approvalStatus === 'rejected' ? 'bg-danger' : 'bg-warning text-dark'
                            }`}>
                              {u.approvalStatus || 'approved'}
                            </span>
                          </td>
                          <td>
                            <span className={`badge bg-${getRoleBadgeColor(u.role)} text-uppercase`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="small">{u.department || 'NCRB / Police'}</td>
                          <td>
                            <ClassificationBadge classification={u.clearance} />
                          </td>
                          <td>
                            {u.totpEnabled ? (
                              <span className="badge bg-success">Active</span>
                            ) : (
                              <span className="badge bg-secondary">Disabled</span>
                            )}
                          </td>
                          <td>
                            {isLocked ? (
                              <span className="badge bg-danger">Locked</span>
                            ) : (
                              <span className="badge bg-light text-dark border">Normal</span>
                            )}
                          </td>
                          <td className="text-end">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => setUserModal({ ...u, unlock: false })}
                            >
                              Approve / Edit RBAC
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COMPLIANCE & INTEGRITY */}
      {activeTab === 'compliance' && (
        <div>
          {/* Quick Stats Grid */}
          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <div className="card stat-card bg-light border-0 shadow-sm p-3">
                <div className="text-muted small fw-semibold">Total Documents in GridFS</div>
                <div className="fs-3 fw-bold text-dark mt-2">{compliance?.totalDocuments ?? '—'}</div>
                <div className="text-muted small mt-1">AES-256-GCM encrypted</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card stat-card bg-light border-0 shadow-sm p-3">
                <div className="text-muted small fw-semibold">Active Investigation Cases</div>
                <div className="fs-3 fw-bold text-primary mt-2">
                  {compliance?.casesByStatus?.reduce((acc, curr) => acc + curr.count, 0) ?? '—'}
                </div>
                <div className="text-muted small mt-1">Across all districts</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card stat-card bg-light border-0 shadow-sm p-3">
                <div className="text-muted small fw-semibold">Audit Blocks Logged</div>
                <div className="fs-3 fw-bold text-info mt-2">{compliance?.auditCount ?? '—'}</div>
                <div className="text-muted small mt-1">Hash-chained insert-only</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card stat-card bg-light border-0 shadow-sm p-3">
                <div className="text-muted small fw-semibold">Merkle Batches Anchored</div>
                <div className="fs-3 fw-bold text-success mt-2">{compliance?.merkleBatchesCount ?? '—'}</div>
                <div className="text-muted small mt-1">Immutable Root Chain</div>
              </div>
            </div>
          </div>

          {/* Audit Chain Verifier Tool */}
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-header bg-white py-3 d-flex align-items-center justify-content-between">
              <div>
                <h6 className="fw-bold mb-0">🔗 Real-Time Audit Chain Cryptographic Verification</h6>
                <span className="text-muted small">
                  Recomputes SHA-256 for all chronological blocks to detect unauthorized database edits or tampering
                </span>
              </div>
              <button
                className="btn btn-primary btn-sm d-flex align-items-center gap-2"
                onClick={handleVerifyChain}
                disabled={verifyingChain}
              >
                {verifyingChain ? <span className="spinner-border spinner-border-sm" /> : '🔍'}
                Walk Full Audit Chain
              </button>
            </div>
            <div className="card-body p-4">
              {chainVerifyResult ? (
                <div className={`alert ${chainVerifyResult.valid ? 'alert-success' : 'alert-danger'} mb-0`}>
                  <h5 className="alert-heading fw-bold">
                    {chainVerifyResult.valid ? '✅ Audit Ledger Integrity 100% Confirmed' : '❌ Audit Chain Broken / Tampered!'}
                  </h5>
                  <p className="small mb-0">
                    Checked {chainVerifyResult.totalBlocks} sequential audit records.
                    {chainVerifyResult.brokenAtIndex !== null && chainVerifyResult.brokenAtIndex !== undefined ? (
                      <span className="fw-bold d-block mt-1">
                        Discrepancy pinpointed at Block Index #{chainVerifyResult.brokenAtIndex}.
                        Reason: {chainVerifyResult.reason}
                      </span>
                    ) : (
                      ' All block hashes and previous-hash pointers match cryptographic digest.'
                    )}
                  </p>
                </div>
              ) : (
                <p className="text-muted small mb-0">
                  Click the button above to execute an exhaustive hash-chain verification walk across the entire database.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MERKLE BATCHES */}
      {activeTab === 'merkle' && (
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white py-3 d-flex align-items-center justify-content-between">
            <div>
              <span className="fw-bold">Merkle-Tree Ledger Batches</span>
              <div className="text-muted small">
                Hourly and on-demand cryptographic tree root batches linking evidentiary blocks
              </div>
            </div>
            <button
              className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2"
              onClick={handleTriggerMerkleBatch}
              disabled={batchActionLoading}
            >
              {batchActionLoading ? <span className="spinner-border spinner-border-sm" /> : '⚡'}
              Anchor New Merkle Batch
            </button>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small text-muted">
                  <tr>
                    <th>Batch ID</th>
                    <th>Leaves Count</th>
                    <th>Merkle Root (SHA-256)</th>
                    <th>Previous Root</th>
                    <th>Anchored At</th>
                  </tr>
                </thead>
                <tbody>
                  {batchesLoading ? (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-muted">
                        <span className="spinner-border spinner-border-sm me-2" /> Loading batches...
                      </td>
                    </tr>
                  ) : batches.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-muted">
                        No Merkle batches anchored yet. Click &quot;Anchor New Merkle Batch&quot; to compile.
                      </td>
                    </tr>
                  ) : (
                    batches.map((b) => (
                      <tr key={b._id || b.batchId}>
                        <td className="font-monospace small fw-semibold text-primary">
                          {b.batchId.slice(0, 13)}...
                        </td>
                        <td>
                          <span className="badge bg-info">{b.leafCount} assets</span>
                        </td>
                        <td>
                          <HashDisplay hash={b.root} truncate={true} />
                        </td>
                        <td>
                          <HashDisplay hash={b.prevRoot} truncate={true} />
                        </td>
                        <td className="small text-muted">{formatDate(b.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* RBAC Edit Modal */}
      {userModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Edit RBAC Profile: {userModal.name}</h5>
                <button type="button" className="btn-close" onClick={() => setUserModal(null)} />
              </div>
              <form onSubmit={handleUpdateUser}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Role</label>
                    <select
                      className="form-select form-select-sm"
                      value={userModal.role}
                      onChange={(e) => setUserModal({ ...userModal, role: e.target.value })}
                    >
                      <option value="io">Investigating Officer (IO)</option>
                      <option value="sho">Station House Officer (SHO)</option>
                      <option value="sp">Superintendent of Police (SP)</option>
                      <option value="forensic">Forensic Analyst</option>
                      <option value="prosecutor">Prosecutor / Legal</option>
                      <option value="court">Court Clerk / Judge</option>
                      <option value="auditor">Auditor</option>
                      <option value="admin">Administrator</option>
                      <option value="citizen">Citizen</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Security Clearance Level</label>
                    <select
                      className="form-select form-select-sm"
                      value={userModal.clearance}
                      onChange={(e) => setUserModal({ ...userModal, clearance: e.target.value })}
                    >
                      <option value="public">Public (Level 0)</option>
                      <option value="restricted">Restricted (Level 1)</option>
                      <option value="confidential">Confidential (Level 2)</option>
                      <option value="secret">Secret (Level 3)</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Department / Division</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={userModal.department || ''}
                      onChange={(e) => setUserModal({ ...userModal, department: e.target.value })}
                    />
                  </div>

                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="unlockCheck"
                      checked={userModal.unlock || false}
                      onChange={(e) => setUserModal({ ...userModal, unlock: e.target.checked })}
                    />
                    <label className="form-check-label small" htmlFor="unlockCheck">
                      Reset failed login attempts and unlock account
                    </label>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setUserModal(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
