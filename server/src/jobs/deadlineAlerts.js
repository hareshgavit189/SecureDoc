'use strict';

const cron = require('node-cron');
const Case = require('../models/Case');

function daysSince(date) {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Deadline alert job — runs daily at 08:00.
 * Finds sexual offence cases at 45, 50, and 60 day thresholds and logs alerts.
 * In production, this would send emails/SMS/push notifications to the case officer.
 */
function startDeadlineAlertsJob() {
  cron.schedule('0 8 * * *', async () => {
    console.log('[CRON] Running deadline alerts job...');
    try {
      const openCases = await Case.find({
        category: 'sexual_offence',
        status: { $nin: ['closed', 'archived', 'charge_sheet'] },
      })
        .populate('registeredBy', 'name email')
        .lean();

      for (const c of openCases) {
        const days = daysSince(c.registeredAt);

        if (days >= 60) {
          console.warn(
            `[ALERT 🔴] Case ${c.caseNo} — ${c.title} is ${days} days old. CHARGE SHEET OVERDUE (60-day limit breached). Officer: ${c.registeredBy?.name}`
          );
        } else if (days >= 50) {
          console.warn(
            `[ALERT 🟠] Case ${c.caseNo} — ${c.title} is ${days} days old. Charge sheet due in ${60 - days} days.`
          );
        } else if (days >= 45) {
          console.warn(
            `[ALERT 🟡] Case ${c.caseNo} — ${c.title} is ${days} days old. Approaching charge sheet deadline (${60 - days} days left).`
          );
        }
      }

      // BNSS s.187 bail risk — all open cases
      const allOpen = await Case.find({ status: { $nin: ['closed', 'archived'] } }).lean();
      for (const c of allOpen) {
        const days = daysSince(c.registeredAt);
        if (days >= 90) {
          console.warn(`[ALERT 🔴 BAIL] Case ${c.caseNo} has reached 90 days — mandatory release risk under BNSS s.187.`);
        } else if (days >= 60) {
          console.warn(`[ALERT 🟡 BAIL] Case ${c.caseNo} has reached 60 days — review required under BNSS s.187.`);
        }
      }

      console.log('[CRON] Deadline alerts job complete.');
    } catch (err) {
      console.error('[CRON] Deadline alerts job error:', err.message);
    }
  });
  console.log('[CRON] Deadline alerts job scheduled (daily at 08:00)');
}

module.exports = { startDeadlineAlertsJob };
