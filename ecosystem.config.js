/**
 * ecosystem.config.js
 * PM2 Process Management configuration for SecureDoc DMS production server.
 * Run with: pm2 start ecosystem.config.js --env production
 */
module.exports = {
  apps: [
    {
      name: 'securedoc-dms',
      script: './server/src/server.js',
      instances: 'max', // Scale to available CPU cores
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: './logs/pm2-err.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
