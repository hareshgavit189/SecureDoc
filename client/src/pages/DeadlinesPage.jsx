/**
 * DeadlinesPage.jsx
 * Women Safety Division Module & Investigation Statutory Deadlines
 * - 60-day POCSO / Sexual Offence charge sheet tracker (BNSS / POCSO mandate)
 *   (<45 green, >=45 amber on IO dashboard, >=50 alert to SP, >=60 red)
 * - Default-bail risk monitor (BNSS s.187 60/90-day limits)
 * - e-FIR 3-day signature window tracker (BNSS s.173)
 * - Zero FIR transfer wizard (encrypted case transfer to target police station)
 * - National Database on Sexual Offenders (NDSO) sample cross-check
 */
import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { formatDate } from '../utils/formatters';

export default function DeadlinesPage() {
  const [deadlines, setDeadlines] = useState({ cases: [], firSignatureDeadlines: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Zero FIR Transfer Form State
  const [transferCaseId, setTransferCaseId] = useState('');
  const [stationCode, setStationCode] = useState('');
  const [stationName, setStationName] = useState('');
  const [transferReason, setTransferReason] = useState('Offence occurred outside police station territorial jurisdiction');
  const [transferStatus, setTransferStatus] = useState(null);
  const [transferLoading, setTransferLoading] = useState(false);

  // NDSO Check State
  const [ndsoName, setNdsoName] = useState('');
  const [ndsoDob, setNdsoDob] = useState('');
  const [ndsoResults, setNdsoResults] = useState(null);
  const [ndsoLoading, setNdsoLoading] = useState(false);

  useEffect(() => {
    fetchDeadlines();
  }, []);

  const fetchDeadlines = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/deadlines');
      if (res.data?.success) {
        setDeadlines(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch statutory deadlines.');
    } finally {
      setLoading(false);
    }
  };

  const handleZeroFirTransfer = async (e) => {
    e.preventDefault();
    if (!transferCaseId || !stationCode) {
      alert('Please select a Case and enter the Target Police Station Code.');
      return;
    }
    setTransferLoading(true);
    setTransferStatus(null);
    try {
      const res = await axiosInstance.post('/transfers', {
        caseId: transferCaseId,
        targetStationCode: stationCode,
        targetStationName: stationName,
        reason: transferReason,
      });
      if (res.data?.success) {
        setTransferStatus(res.data.data);
        fetchDeadlines(); // Refresh
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Zero FIR Transfer failed.');
    } finally {
      setTransferLoading(false);
    }
  };

  const handleNdsoCheck = async (e) => {
    e.preventDefault();
    if (!ndsoName && !ndsoDob) {
      alert('Enter at least a name or date of birth to check NDSO database.');
      return;
    }
    setNdsoLoading(true);
    try {
      const params = {};
      if (ndsoName) params.name = ndsoName;
      if (ndsoDob) params.dob = ndsoDob;
      const res = await axiosInstance.get('/ndso/check', { params });
      if (res.data?.success) {
        setNdsoResults(res.data.data);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'NDSO cross-check query failed.');
    } finally {
      setNdsoLoading(false);
    }
  };

  // Classify Sexual Offence Cases
  const sexualOffenceCases = deadlines.cases?.filter((c) => c.category === 'sexual_offence') || [];
  const defaultBailRiskCases = deadlines.cases?.filter((c) => c.bailRisk === 'critical' || c.bailRisk === 'high') || [];

  return (
    <div className="container-fluid p-4">
      {/* Page Title & MHA Division Banner */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-danger px-2 py-1 fs-6">⚖️ MHA · NCRB</span>
            <span className="badge bg-primary px-2 py-1 fs-6">Women Safety Division</span>
          </div>
          <h2 className="fw-bold mt-2 mb-1">
            Statutory Deadlines & Compliance Monitor
          </h2>
          <p className="text-muted small mb-0">
            Automated compliance with BNSS 2023 (Section 173, 187, 193) & POCSO 60-day Charge Sheet Mandate
          </p>
        </div>
        <button className="btn btn-outline-secondary btn-sm" onClick={fetchDeadlines} disabled={loading}>
          🔄 Refresh Deadlines
        </button>
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}

      {/* KPI Cards Row */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card stat-card bg-light border-0 shadow-sm p-3">
            <div className="text-muted small fw-semibold">Sexual Offence Cases (60d)</div>
            <div className="d-flex align-items-baseline justify-content-between mt-2">
              <span className="fs-3 fw-bold text-dark">{sexualOffenceCases.length}</span>
              <span className="badge bg-info">Active</span>
            </div>
            <div className="text-muted small mt-1">Monitored for default charge sheet</div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card stat-card bg-light border-0 shadow-sm p-3">
            <div className="text-muted small fw-semibold">SP Escalation Alerts (&ge;50d)</div>
            <div className="d-flex align-items-baseline justify-content-between mt-2">
              <span className="fs-3 fw-bold text-warning">
                {sexualOffenceCases.filter((c) => c.chargeSheetStatus === 'orange' || c.chargeSheetStatus === 'red').length}
              </span>
              <span className="badge bg-warning text-dark">High Risk</span>
            </div>
            <div className="text-muted small mt-1">Escalated to Superintendent of Police</div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card stat-card bg-light border-0 shadow-sm p-3">
            <div className="text-muted small fw-semibold">Default Bail Risk (&ge;60d/90d)</div>
            <div className="d-flex align-items-baseline justify-content-between mt-2">
              <span className="fs-3 fw-bold text-danger">
                {defaultBailRiskCases.length}
              </span>
              <span className="badge bg-danger">BNSS s.187</span>
            </div>
            <div className="text-muted small mt-1">Accused entitled to statutory bail</div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card stat-card bg-light border-0 shadow-sm p-3">
            <div className="text-muted small fw-semibold">Pending e-FIR Signatures</div>
            <div className="d-flex align-items-baseline justify-content-between mt-2">
              <span className="fs-3 fw-bold text-primary">
                {deadlines.firSignatureDeadlines?.length || 0}
              </span>
              <span className="badge bg-primary">BNSS s.173</span>
            </div>
            <div className="text-muted small mt-1">Must be signed within 72 hours</div>
          </div>
        </div>
      </div>

      {/* Section 1: 60-Day Sexual Offence Charge Sheet Tracker */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-white py-3 d-flex align-items-center justify-content-between">
          <div className="fw-bold fs-6 text-dark d-flex align-items-center gap-2">
            <span>🔴</span> 60-Day Charge Sheet Tracker (Sexual Offence / POCSO)
          </div>
          <div className="d-flex align-items-center gap-2 small">
            <span className="badge bg-success">&lt;45d Safe</span>
            <span className="badge bg-warning text-dark">45-49d Amber</span>
            <span className="badge bg-danger">50-59d SP Alert</span>
            <span className="badge bg-dark">&ge;60d Breached</span>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light small text-muted">
                <tr>
                  <th>Case No / FIR</th>
                  <th>Title</th>
                  <th>Registered</th>
                  <th>Elapsed Days</th>
                  <th style={{ width: '22%' }}>Timeline Bar (60 Days Max)</th>
                  <th>Escalation Level</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-muted">
                      <span className="spinner-border spinner-border-sm me-2" /> Loading case deadlines...
                    </td>
                  </tr>
                ) : sexualOffenceCases.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-muted">
                      No active sexual offence cases in current jurisdiction.
                    </td>
                  </tr>
                ) : (
                  sexualOffenceCases.map((c) => {
                    const pct = Math.min(100, Math.round((c.daysOpen / 60) * 100));
                    let barColor = 'bg-success';
                    let alertBadge = <span className="badge bg-success">On Track</span>;

                    if (c.chargeSheetStatus === 'amber') {
                      barColor = 'bg-warning';
                      alertBadge = <span className="badge bg-warning text-dark">⚠️ IO Amber Alert (&ge;45d)</span>;
                    } else if (c.chargeSheetStatus === 'orange') {
                      barColor = 'bg-danger';
                      alertBadge = <span className="badge bg-danger">🚨 SP Escalation (&ge;50d)</span>;
                    } else if (c.chargeSheetStatus === 'red') {
                      barColor = 'bg-dark';
                      alertBadge = <span className="badge bg-dark text-white">⛔ Statutory Limit Breached (&ge;60d)</span>;
                    }

                    return (
                      <tr key={c.caseId}>
                        <td className="fw-semibold">
                          <a href={`/cases/${c.caseId}`} className="text-decoration-none">
                            {c.caseNo}
                          </a>
                        </td>
                        <td>{c.title}</td>
                        <td className="small text-muted">{formatDate(c.registeredAt)}</td>
                        <td>
                          <strong>{c.daysOpen}</strong> / 60 days
                        </td>
                        <td>
                          <div className="progress" style={{ height: '10px' }}>
                            <div
                              className={`progress-bar ${barColor}`}
                              role="progressbar"
                              style={{ width: `${pct}%` }}
                              aria-valuenow={pct}
                              aria-valuemin="0"
                              aria-valuemax="100"
                            />
                          </div>
                          <div className="d-flex justify-content-between small text-muted mt-1" style={{ fontSize: '0.7rem' }}>
                            <span>Day 0</span>
                            <span>Day 45</span>
                            <span>Day 60</span>
                          </div>
                        </td>
                        <td>{alertBadge}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        {/* Section 2: e-FIR 3-Day Signature Window (BNSS s.173) */}
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white py-3 fw-bold d-flex align-items-center justify-content-between">
              <span>✍️ e-FIR 72-Hour Signature Tracker (BNSS s.173)</span>
              <span className="badge bg-primary">3-Day Window</span>
            </div>
            <div className="card-body p-3">
              <p className="small text-muted mb-3">
                Under BNSS Section 173, an electronic FIR (e-FIR) must be signed by the informant/victim within 3 days (72 hours) of submission.
              </p>
              {deadlines.firSignatureDeadlines?.length === 0 ? (
                <div className="text-center py-4 text-muted bg-light rounded">
                  ✅ All e-FIRs have been duly authenticated within statutory deadlines.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm table-hover mb-0">
                    <thead className="table-light small">
                      <tr>
                        <th>FIR Document</th>
                        <th>Case</th>
                        <th>Sign Deadline</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deadlines.firSignatureDeadlines?.map((f) => (
                        <tr key={f.docId}>
                          <td className="fw-semibold">{f.title}</td>
                          <td>{f.caseNo || '—'}</td>
                          <td className="small text-muted">{formatDate(f.firSignDeadline)}</td>
                          <td>
                            {f.overdue ? (
                              <span className="badge bg-danger">Overdue ({Math.abs(f.daysRemaining)}d)</span>
                            ) : (
                              <span className="badge bg-warning text-dark">{f.daysRemaining} days left</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Default Bail Risk View (BNSS s.187) */}
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white py-3 fw-bold d-flex align-items-center justify-content-between">
              <span>⚖️ Default Bail Risk (BNSS s.187)</span>
              <span className="badge bg-danger">Section 187</span>
            </div>
            <div className="card-body p-3">
              <p className="small text-muted mb-3">
                Accused in judicial custody is entitled to mandatory default bail if charge sheet is not filed within 60 or 90 days.
              </p>
              {defaultBailRiskCases.length === 0 ? (
                <div className="text-center py-4 text-muted bg-light rounded">
                  ✅ No cases currently in default bail danger zone.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm table-hover mb-0">
                    <thead className="table-light small">
                      <tr>
                        <th>Case No</th>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Days Elapsed</th>
                        <th>Bail Risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {defaultBailRiskCases.map((c) => (
                        <tr key={c.caseId}>
                          <td className="fw-semibold">
                            <a href={`/cases/${c.caseId}`} className="text-decoration-none">
                              {c.caseNo}
                            </a>
                          </td>
                          <td>{c.title}</td>
                          <td><span className="badge bg-secondary">{c.category}</span></td>
                          <td><strong>{c.daysOpen}</strong> days</td>
                          <td>
                            {c.bailRisk === 'critical' ? (
                              <span className="badge bg-danger">Critical (&ge;90d)</span>
                            ) : (
                              <span className="badge bg-warning text-dark">High (&ge;60d)</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row: Zero FIR Transfer & NDSO Cross-Check */}
      <div className="row g-4">
        {/* Zero FIR Jurisdiction Transfer Wizard */}
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white py-3 fw-bold">
              <span>🔄 Zero FIR Inter-Station Jurisdiction Transfer</span>
            </div>
            <div className="card-body p-3">
              <p className="small text-muted mb-3">
                Zero FIR (BNSS s.173) allows an FIR to be registered anywhere regardless of jurisdiction.
                This wizard bundles and cryptographically dispatches the file to the competent station.
              </p>

              <form onSubmit={handleZeroFirTransfer}>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Select Case to Transfer</label>
                  <select
                    className="form-select form-select-sm"
                    value={transferCaseId}
                    onChange={(e) => setTransferCaseId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Case --</option>
                    {deadlines.cases?.map((c) => (
                      <option key={c.caseId} value={c.caseId}>
                        {c.caseNo} — {c.title} ({c.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-md-5">
                    <label className="form-label small fw-semibold">Target Station Code</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="e.g. PS-DL-042"
                      value={stationCode}
                      onChange={(e) => setStationCode(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-md-7">
                    <label className="form-label small fw-semibold">Target Police Station Name</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="e.g. Connaught Place Police Station"
                      value={stationName}
                      onChange={(e) => setStationName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Jurisdiction Reason</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={transferReason}
                    onChange={(e) => setTransferReason(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-sm d-flex align-items-center gap-2"
                  disabled={transferLoading}
                >
                  {transferLoading ? <span className="spinner-border spinner-border-sm" /> : '🚀'}
                  Transmit Encrypted Bundle (ICJS Adapter)
                </button>
              </form>

              {transferStatus && (
                <div className="alert alert-success mt-3 py-2 small mb-0">
                  <strong>Transfer Confirmed!</strong>
                  <br />
                  Transfer ID: <code>{transferStatus.transferId}</code>
                  <br />
                  Target: {transferStatus.targetStationName} ({transferStatus.targetStation})
                </div>
              )}
            </div>
          </div>
        </div>

        {/* National Database on Sexual Offenders (NDSO) Cross-Check */}
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white py-3 fw-bold d-flex align-items-center justify-content-between">
              <span>🔍 National Database on Sexual Offenders (NDSO) Cross-Check</span>
              <span className="badge bg-secondary">NCRB Service</span>
            </div>
            <div className="card-body p-3">
              <p className="small text-muted mb-3">
                Query suspect details against the sample National Database on Sexual Offenders (NDSO) repository to identify repeat offenders or cross-district linkages.
              </p>

              <form onSubmit={handleNdsoCheck} className="mb-3">
                <div className="row g-2 mb-2">
                  <div className="col-md-7">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Suspect Name (e.g. Ravi Kumar)"
                      value={ndsoName}
                      onChange={(e) => setNdsoName(e.target.value)}
                    />
                  </div>
                  <div className="col-md-5">
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={ndsoDob}
                      onChange={(e) => setNdsoDob(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="btn btn-outline-danger btn-sm d-flex align-items-center gap-2"
                  disabled={ndsoLoading}
                >
                  {ndsoLoading ? <span className="spinner-border spinner-border-sm" /> : '🔎'}
                  Query NDSO Offender Registry
                </button>
              </form>

              {ndsoResults && (
                <div className="border rounded p-2 bg-light">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="small fw-bold">NDSO Query Results</span>
                    <span className={`badge ${ndsoResults.totalMatches > 0 ? 'bg-danger' : 'bg-success'}`}>
                      {ndsoResults.totalMatches} Matched Records
                    </span>
                  </div>

                  {ndsoResults.totalMatches === 0 ? (
                    <div className="small text-muted py-2 text-center">
                      No matching registered offender record found in NDSO database.
                    </div>
                  ) : (
                    <ul className="list-group list-group-flush small">
                      {ndsoResults.matches.map((m, idx) => (
                        <li key={idx} className="list-group-item bg-transparent d-flex justify-content-between align-items-center px-0">
                          <div>
                            <span className="fw-bold text-danger">⚠️ {m.name}</span> (DOB: {m.dob})
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                              Categories: {m.offenceTypes?.join(', ')}
                            </div>
                          </div>
                          <span className="badge bg-danger">Registered Offender</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
