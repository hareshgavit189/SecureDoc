/**
 * HashDisplay.jsx
 * Displays a SHA-256 hash with truncated view and copy-to-clipboard button.
 * Full hash shown on hover via Bootstrap tooltip title attribute.
 */
import React, { useState } from 'react';
import { truncateHash } from '../utils/formatters';

function HashDisplay({ hash, startChars = 16, endChars = 8 }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    if (!hash) return;
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-HTTPS contexts
      const el = document.createElement('textarea');
      el.value = hash;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!hash) {
    return <span className="text-muted font-mono small">—</span>;
  }

  return (
    <span
      className="hash-display"
      title={hash}
      onClick={handleCopy}
      style={{ cursor: 'pointer' }}
    >
      <span className="font-mono small">
        {truncateHash(hash, startChars, endChars)}
      </span>
      <button className="copy-btn ms-1" onClick={handleCopy} title="Copy full hash">
        {copied ? '✅' : '📋'}
      </button>
    </span>
  );
}

export default HashDisplay;
