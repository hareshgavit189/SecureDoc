'use strict';

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');

// Route imports
const authRoutes = require('./routes/authRoutes');
const caseRoutes = require('./routes/caseRoutes');
const documentRoutes = require('./routes/documentRoutes');
const integrityRoutes = require('./routes/integrityRoutes');
const signatureRoutes = require('./routes/signatureRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const searchRoutes = require('./routes/searchRoutes');
const shareRoutes = require('./routes/shareRoutes');
const custodyRoutes = require('./routes/custodyRoutes');
const womenSafetyRoutes = require('./routes/womenSafetyRoutes');
const auditRoutes = require('./routes/auditRoutes');

const app = express();
const configuredOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const isLocalOrigin = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);

// ---------------------------------------------------------------------------
// Security headers
// ---------------------------------------------------------------------------
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || configuredOrigins.includes(origin) || (isDev && isLocalOrigin(origin))) {
        return callback(null, true);
      }
      return callback(new Error('Request origin is not allowed'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ---------------------------------------------------------------------------
// Rate limiting — global: 100 req / 15 min
// ---------------------------------------------------------------------------
const isDev = process.env.NODE_ENV !== 'production';

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 10000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please try again later.' },
});
app.use(globalLimiter);

// Auth endpoints rate limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many authentication attempts. Please try again later.' },
});
app.use('/auth', authLimiter);
app.use('/api/auth', authLimiter);


// ---------------------------------------------------------------------------
// Body parsing & sanitization
// ---------------------------------------------------------------------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Safe NoSQL injection sanitizer that does not mutate IncomingMessage query getter
const sanitizeObject = (obj) => {
  if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$')) {
        delete obj[key];
      } else {
        sanitizeObject(obj[key]);
      }
    }
  }
};
app.use((req, res, next) => {
  if (req.body) sanitizeObject(req.body);
  if (req.params) sanitizeObject(req.params);
  next();
});

app.use(cookieParser());

// Protect cookie-authenticated state changes against cross-site requests.
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production' || ['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  const origin = req.get('origin');
  if (origin && !configuredOrigins.includes(origin)) {
    return res.status(403).json({ success: false, error: 'Request origin is not allowed' });
  }
  next();
});

// ---------------------------------------------------------------------------
// Health check (no auth)
// ---------------------------------------------------------------------------
app.get('/health', (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({
    success: ready,
    status: ready ? 'ok' : 'unavailable',
    database: ready ? 'connected' : 'disconnected',
    ts: new Date().toISOString(),
  });
});
app.get('/api/health', (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({
    success: ready,
    status: ready ? 'ok' : 'unavailable',
    database: ready ? 'connected' : 'disconnected',
    ts: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// API routes mounted under both root and /api for compatibility
// ---------------------------------------------------------------------------
const mountAllRoutes = (prefix = '') => {
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/cases`, caseRoutes);
  app.use(`${prefix}`, documentRoutes);
  app.use(`${prefix}/ledger`, integrityRoutes);
  app.use(`${prefix}/public`, integrityRoutes);
  app.use(`${prefix}`, signatureRoutes);
  app.use(`${prefix}`, certificateRoutes);
  app.use(`${prefix}/search`, searchRoutes);
  app.use(`${prefix}/shares`, shareRoutes);
  app.use(`${prefix}/custody`, custodyRoutes);
  app.use(`${prefix}`, womenSafetyRoutes);
  app.use(`${prefix}`, auditRoutes);
};

mountAllRoutes('/api');
mountAllRoutes('');

// ---------------------------------------------------------------------------
// Static client serving (Production Unified Mode)
// ---------------------------------------------------------------------------
const path = require('path');
const fs = require('fs');

const clientDistPath = path.resolve(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  // Fallback for React Router SPA paths (non-API)
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/auth') ||
      req.path.startsWith('/cases') ||
      req.path.startsWith('/documents') ||
      req.path.startsWith('/ledger') ||
      req.path.startsWith('/public') ||
      req.path.startsWith('/search') ||
      req.path.startsWith('/shares') ||
      req.path.startsWith('/custody') ||
      req.path.startsWith('/health')
    ) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// ---------------------------------------------------------------------------
// 404 handler
// ---------------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, error: 'File too large. Maximum size is 50 MB.' });
  }
  if (err.message && err.message.startsWith('File type not allowed')) {
    return res.status(415).json({ success: false, error: err.message });
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({ success: false, error: `Duplicate value for ${field}` });
  }

  const statusCode = err.statusCode || err.status || 500;
  console.error(`[ERROR] ${err.stack || err.message}`);

  return res.status(statusCode).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

module.exports = app;
