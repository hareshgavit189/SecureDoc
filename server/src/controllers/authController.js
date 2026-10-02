'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/User');
const { addAudit } = require('../services/ledgerService');

const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

function signAccessToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role, clearance: user.clearance, department: user.department, name: user.name },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, department, clearance } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'name, email, and password are required' });
    }
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ success: false, error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash, role, department, clearance });

    await addAudit({ userId: user._id, action: 'USER_REGISTER', ip: req.ip, metadata: { email } });

    res.status(201).json({ success: true, data: { message: 'User registered successfully', userId: user._id } });
  } catch (err) { next(err); }
};

// POST /auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password, totpToken } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    // Check account lock
    if (user.isLocked) {
      const remaining = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({ success: false, error: `Account locked. Try again in ${remaining} minute(s).` });
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      const attempts = user.loginAttempts + 1;
      const update = { loginAttempts: attempts };
      if (attempts >= MAX_ATTEMPTS) {
        update.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
        update.loginAttempts = 0;
      }
      await User.updateOne({ _id: user._id }, update);
      await addAudit({ userId: user._id, action: 'LOGIN_FAIL', ip: req.ip });
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Reset login attempts on success
    await User.updateOne({ _id: user._id }, { loginAttempts: 0, lockUntil: null });

    // TOTP check
    if (user.totpEnabled) {
      if (!totpToken) {
        return res.status(200).json({ success: true, data: { requires2FA: true } });
      }
      const verified = speakeasy.totp.verify({
        secret: user.totpSecret,
        encoding: 'base32',
        token: totpToken,
        window: 1,
      });
      if (!verified) {
        await addAudit({ userId: user._id, action: '2FA_FAIL', ip: req.ip });
        return res.status(401).json({ success: false, error: 'Invalid 2FA token' });
      }
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    // Store hashed refresh token
    const refreshHash = await bcrypt.hash(refreshToken, 8);
    await User.updateOne({ _id: user._id }, { refreshTokenHash: refreshHash });

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await addAudit({ userId: user._id, action: 'LOGIN_SUCCESS', ip: req.ip });

    res.json({
      success: true,
      data: {
        accessToken,
        user: { id: user._id, name: user.name, email: user.email, role: user.role, clearance: user.clearance, totpEnabled: user.totpEnabled, department: user.department },
      },
    });
  } catch (err) { next(err); }
};

// POST /auth/2fa/setup
exports.setup2FA = async (req, res, next) => {
  try {
    const secret = speakeasy.generateSecret({ name: `SecureDoc (${req.user.name})`, length: 20 });
    // Store secret (not yet enabled until verified)
    await User.updateOne({ _id: req.user.id }, { totpSecret: secret.base32 });

    const qrDataURL = await QRCode.toDataURL(secret.otpauth_url);
    res.json({ success: true, data: { otpauth_url: secret.otpauth_url, qr: qrDataURL } });
  } catch (err) { next(err); }
};

// POST /auth/2fa/verify
exports.verify2FA = async (req, res, next) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user.id);

    const verified = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!verified) return res.status(400).json({ success: false, error: 'Invalid TOTP token' });

    await User.updateOne({ _id: user._id }, { totpEnabled: true });
    await addAudit({ userId: user._id, action: '2FA_ENABLED', ip: req.ip });

    res.json({ success: true, data: { message: '2FA enabled successfully' } });
  } catch (err) { next(err); }
};

// POST /auth/refresh
exports.refresh = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ success: false, error: 'No refresh token' });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ success: false, error: 'Invalid refresh token' });
    }

    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ success: false, error: 'User not found' });

    // Verify token matches stored hash
    const matches = await bcrypt.compare(token, user.refreshTokenHash || '');
    if (!matches) return res.status(401).json({ success: false, error: 'Refresh token revoked' });

    const accessToken = signAccessToken(user);
    res.json({ success: true, data: { accessToken } });
  } catch (err) { next(err); }
};

// POST /auth/logout
exports.logout = async (req, res, next) => {
  try {
    res.clearCookie('refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' });
    res.json({ success: true, data: { message: 'Logged out' } });
  } catch (err) { next(err); }
};

// GET /auth/me
exports.me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash -totpSecret -refreshTokenHash -encPrivateKey');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

// GET /auth/users (admin only)
exports.listUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-passwordHash -totpSecret -refreshTokenHash -encPrivateKey').sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (err) { next(err); }
};

// PUT /auth/users/:id (admin only)
exports.updateUser = async (req, res, next) => {
  try {
    const { role, clearance, department, unlock } = req.body;
    const update = {};
    if (role) update.role = role;
    if (clearance) update.clearance = clearance;
    if (department !== undefined) update.department = department;
    if (unlock) {
      update.lockUntil = null;
      update.loginAttempts = 0;
    }
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-passwordHash -totpSecret -refreshTokenHash -encPrivateKey');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

