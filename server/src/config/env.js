'use strict';

const HEX_KEY_PATTERN = /^[a-f0-9]{64}$/i;

function validateEnvironment() {
  const required = ['MONGO_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'MASTER_KEY_HEX'];
  const missing = required.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (process.env.JWT_ACCESS_SECRET.length < 32 || process.env.JWT_REFRESH_SECRET.length < 32) {
    throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must each be at least 32 characters');
  }

  if (process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different');
  }

  if (!HEX_KEY_PATTERN.test(process.env.MASTER_KEY_HEX) || /^0+$/i.test(process.env.MASTER_KEY_HEX)) {
    throw new Error('MASTER_KEY_HEX must be a non-zero 64-character hexadecimal key');
  }

  if (process.env.NODE_ENV === 'production' && !/^https:\/\//i.test(process.env.CLIENT_ORIGIN || '')) {
    throw new Error('CLIENT_ORIGIN must be an HTTPS origin in production');
  }
}

module.exports = { validateEnvironment };
