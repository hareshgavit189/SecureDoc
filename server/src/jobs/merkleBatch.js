'use strict';

const cron = require('node-cron');
const { runMerkleBatch } = require('../services/merkleService');

/**
 * Merkle batch job — runs every hour on the hour.
 * Collects all un-batched AuditBlocks, builds a Merkle tree, and persists a new MerkleBatch.
 */
function startMerkleBatchJob() {
  cron.schedule('0 * * * *', async () => {
    console.log('[CRON] Running Merkle batch job...');
    try {
      const batch = await runMerkleBatch();
      if (batch) {
        console.log(`[CRON] Merkle batch complete. Root: ${batch.root} | Leaves: ${batch.leafCount}`);
      }
    } catch (err) {
      console.error('[CRON] Merkle batch job error:', err.message);
    }
  });
  console.log('[CRON] Merkle batch job scheduled (every hour)');
}

module.exports = { startMerkleBatchJob };
