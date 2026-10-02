'use strict';

const { addAudit } = require('../services/ledgerService');

/**
 * auditAction — factory middleware that logs an audit entry AFTER the request handler succeeds.
 * Usage: router.post('/path', authenticate, auditAction('UPLOAD_DOCUMENT'), controller)
 *
 * The controller is expected to populate:
 *   res.locals.auditDocId   — ObjectId of the affected document (optional)
 *   res.locals.auditCaseId  — ObjectId of the affected case (optional)
 *   res.locals.auditMeta    — arbitrary metadata object (optional)
 *
 * @param {string} action  Human-readable action name
 */
function auditAction(action) {
  return async (req, res, next) => {
    // Capture the original json method so we can hook into response
    const originalJson = res.json.bind(res);

    res.json = async function (body) {
      // Restore immediately to avoid double-hook
      res.json = originalJson;

      // Only audit on successful responses (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        try {
          await addAudit({
            userId: req.user.id,
            action,
            docId: res.locals.auditDocId || null,
            caseId: res.locals.auditCaseId || null,
            ip: req.ip || req.connection?.remoteAddress || '',
            metadata: res.locals.auditMeta || {},
          });
        } catch (auditErr) {
          // Audit failure must never crash the response
          console.error('[Audit] Failed to write audit block:', auditErr.message);
        }
      }

      return originalJson(body);
    };

    next();
  };
}

module.exports = { auditAction };
