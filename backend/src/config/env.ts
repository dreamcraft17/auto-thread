import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const defaultUploadDir = path.resolve(__dirname, '../../../data/uploads');

export const env = {
  port: parseInt(process.env.API_PORT || '3000', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://threads:threads@localhost:5432/threads_automation',
  databasePoolSize: parseInt(process.env.DATABASE_POOL_SIZE || '20', 10),
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiry: process.env.JWT_EXPIRY || '24h',
  encryptionKey: process.env.ENCRYPTION_KEY || '32-char-encryption-key-here!!',
  playwrightTimeout: parseInt(process.env.PLAYWRIGHT_TIMEOUT || '30000', 10),
  /** Env safety override — when true, always dry-run regardless of DB toggle. */
  playwrightDryRun: process.env.PLAYWRIGHT_DRY_RUN === 'true',
  sendgridApiKey: process.env.SENDGRID_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || 'noreply@threads-automation.com',
  logLevel: process.env.LOG_LEVEL || 'info',
  maxLoginAttempts: 5,
  lockoutMinutes: 15,
  maxRetries: 3,
  backoffDelaysMs: [60_000, 300_000, 900_000],
  publishRateLimitMs: 10_000,
  uploadDir: process.env.UPLOAD_DIR || defaultUploadDir,
  publicBaseUrl: (process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.API_PORT || '3000'}`).replace(/\/$/, ''),
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || '',
  enableCanary: process.env.ENABLE_CANARY === 'true',
  canaryThreadsUsername: process.env.CANARY_THREADS_USERNAME || '',
  canaryThreadsPassword: process.env.CANARY_THREADS_PASSWORD || '',
};
