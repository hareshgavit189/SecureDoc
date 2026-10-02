/**
 * ClassificationBadge.jsx
 * Renders a colored badge for document classification levels.
 * Maps secret/confidential/restricted/public to appropriate colors and icons.
 */
import React from 'react';

const CONFIG = {
  secret:       { color: 'danger',  icon: '🔴', label: 'SECRET' },
  confidential: { color: 'warning', icon: '🟠', label: 'CONFIDENTIAL' },
  restricted:   { color: 'warning', icon: '🟡', label: 'RESTRICTED', textDark: true },
  public:       { color: 'success', icon: '🟢', label: 'PUBLIC' },
};

function ClassificationBadge({ classification, size = 'sm' }) {
  const key    = classification?.toLowerCase() || 'public';
  const config = CONFIG[key] || { color: 'secondary', icon: '⚪', label: classification || 'UNKNOWN' };

  return (
    <span
      className={`badge bg-${config.color} ${config.textDark ? 'text-dark' : ''} badge-${size} d-inline-flex align-items-center gap-1`}
    >
      <span style={{ fontSize: '0.7em' }}>{config.icon}</span>
      {config.label}
    </span>
  );
}

export default ClassificationBadge;
