/**
 * formatters.js
 * Utility functions for date formatting, hash display, deadline status, etc.
 */

/**
 * Format a date to DD/MM/YYYY HH:mm IST
 * @param {string|Date} date
 * @returns {string}
 */
export function formatDate(date) {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).replace(',', '');
}

/**
 * Format date only (no time) to DD/MM/YYYY
 * @param {string|Date} date
 * @returns {string}
 */
export function formatDateOnly(date) {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Truncate a hash for display: first N chars + '...' + last M chars
 * @param {string} hash
 * @param {number} start - chars from start
 * @param {number} end - chars from end
 * @returns {string}
 */
export function truncateHash(hash, start = 16, end = 8) {
  if (!hash || hash.length <= start + end + 3) return hash || '—';
  return `${hash.slice(0, start)}...${hash.slice(-end)}`;
}

/**
 * Calculate how many days since a registration date
 * @param {string|Date} registeredAt
 * @returns {number}
 */
export function getDaysOpen(registeredAt) {
  if (!registeredAt) return 0;
  const start = new Date(registeredAt);
  const now = new Date();
  const diffMs = now - start;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get deadline status color based on days open and case category
 * For sexual_offence: 60-day POCSO limit; others: 90-day BNSS limit
 * @param {number} daysOpen
 * @param {string} category
 * @returns {'green'|'amber'|'orange'|'red'}
 */
export function getDeadlineStatus(daysOpen, category = '') {
  const isSexualOffence = category?.toLowerCase() === 'sexual_offence';
  const limit = isSexualOffence ? 60 : 90;
  const pct = (daysOpen / limit) * 100;

  if (pct < 50) return 'green';
  if (pct < 75) return 'amber';
  if (pct < 100) return 'orange';
  return 'red';
}

/**
 * Get Bootstrap color class for a user role
 * @param {string} role
 * @returns {string} Bootstrap color string
 */
export function getRoleBadgeColor(role) {
  const map = {
    admin:        'danger',
    investigator: 'primary',
    io:           'success',
    supervisor:   'warning',
    viewer:       'secondary',
    prosecutor:   'info',
  };
  return map[role?.toLowerCase()] || 'secondary';
}

/**
 * Get Bootstrap color class for a clearance level
 * @param {string} clearance
 * @returns {string} Bootstrap color string
 */
export function getClearanceBadgeColor(clearance) {
  const map = {
    secret:       'danger',
    confidential: 'warning',
    restricted:   'warning',
    public:       'success',
  };
  return map[clearance?.toLowerCase()] || 'secondary';
}

/**
 * Get Bootstrap color for case status
 * @param {string} status
 * @returns {string}
 */
export function getCaseStatusColor(status) {
  const map = {
    open:          'primary',
    investigation: 'warning',
    charge_sheet:  'info',
    in_court:      'success',
    closed:        'secondary',
    pending:       'secondary',
  };
  return map[status?.toLowerCase()] || 'secondary';
}

/**
 * Format file size bytes to human-readable
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}
