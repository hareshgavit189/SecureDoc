'use strict';

require('dotenv').config();

const connectDB = require('./config/db');
const app = require('./app');
const { startMerkleBatchJob } = require('./jobs/merkleBatch');
const { startDeadlineAlertsJob } = require('./jobs/deadlineAlerts');

const PORT = process.env.PORT || 5000;

async function main() {
  // Connect to MongoDB
  await connectDB();

  // Start background cron jobs
  startMerkleBatchJob();
  startDeadlineAlertsJob();

  // Start HTTP server
  app.listen(PORT, () => {
    console.log(`[SERVER] SecureDoc DMS running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
    console.log(`[SERVER] Health: http://localhost:${PORT}/health`);
  });
}

main().catch((err) => {
  console.error('[SERVER] Fatal startup error:', err);
  process.exit(1);
});
