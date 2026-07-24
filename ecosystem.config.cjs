/**
 * PM2 — satu process: API + worker + static frontend (same origin).
 *
 *   npm run build
 *   pm2 start ecosystem.config.cjs
 *   pm2 save && pm2 startup
 *
 * App name di PM2: ai-thread
 * URL publik (contoh): https://ai.dntech.id  → Nginx proxy ke :3000
 */
module.exports = {
  apps: [
    {
      name: 'ai-thread',
      cwd: __dirname,
      script: 'backend/dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '800M',
      env: {
        NODE_ENV: 'production',
        // API_PORT, secrets, dll dari file .env (dotenv di backend)
      },
      // Optional: PM2 5.2+ — uncomment jika ingin PM2 inject env juga
      // env_file: '.env',
    },
  ],
};
