'use strict';

const jwt = require('jsonwebtoken');

// Clearance level ordering
const CLEARANCE_ORDER = { public: 0, restricted: 1, confidential: 2, secret: 3 };

// ---------------------------------------------------------------------------
// authenticate — verify JWT from Authorization: Bearer <token>
// ---------------------------------------------------------------------------
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = {
      id: decoded.id,
      role: decoded.role,
      clearance: decoded.clearance,
      department: decoded.department,
      name: decoded.name,
    };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

// ---------------------------------------------------------------------------
// authorize — role-based access control
// ---------------------------------------------------------------------------
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required roles: ${roles.join(', ')}`,
      });
    }
    next();
  };
}

// ---------------------------------------------------------------------------
// checkClearance — ensure user clearance >= document classification
// Expects req.doc to be set by the calling route before this middleware
// ---------------------------------------------------------------------------
function checkClearance(req, res, next) {
  if (!req.doc) return next(); // nothing to check

  const userLevel = CLEARANCE_ORDER[req.user?.clearance] ?? 0;
  const docLevel = CLEARANCE_ORDER[req.doc.classification] ?? 0;

  if (userLevel < docLevel) {
    return res.status(403).json({
      success: false,
      error: `Insufficient clearance. Required: ${req.doc.classification}`,
    });
  }
  next();
}

module.exports = { authenticate, authorize, checkClearance, CLEARANCE_ORDER };
