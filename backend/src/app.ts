import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import authRoutes from './routes/auth';
import postsRoutes from './routes/posts';
import dashboardRoutes from './routes/dashboard';
import settingsRoutes from './routes/settings';
import aiRoutes from './routes/ai';
import { errorHandler } from './middleware/errorHandler';
import { env } from './config/env';
import { logger } from './utils/logger';

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // SPA + Vite assets; CSP strict default breaks hashed JS/CSS in many setups
    contentSecurityPolicy: false,
  })
);
app.use(cors({ origin: true, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));

app.use('/media', express.static(env.uploadDir, {
  fallthrough: true,
  maxAge: '7d',
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
  },
}));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId || req.ip || 'anonymous',
});

const v1 = express.Router();
v1.use(limiter);
v1.use('/auth', authRoutes);
v1.use('/posts', postsRoutes);
v1.use('/dashboard', dashboardRoutes);
v1.use('/settings', settingsRoutes);
v1.use('/ai', aiRoutes);

app.use('/v1', v1);
app.use('/api', v1);

/**
 * Same-origin deploy: one Node process serves API + built React SPA.
 * Nginx only reverse-proxies the single URL → this process (PM2).
 */
const spaIndex = path.join(env.frontendDist, 'index.html');
const shouldServeSpa =
  env.serveFrontend &&
  fs.existsSync(spaIndex);

if (shouldServeSpa) {
  logger.info(`Serving frontend SPA from ${env.frontendDist}`);
  app.use(
    express.static(env.frontendDist, {
      index: false,
      maxAge: '1h',
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    })
  );

  app.get('*', (req, res, next) => {
    if (
      req.path.startsWith('/v1') ||
      req.path.startsWith('/api') ||
      req.path.startsWith('/media') ||
      req.path === '/health'
    ) {
      return next();
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next();
    }
    res.sendFile(spaIndex, (err) => {
      if (err) next(err);
    });
  });
} else if (env.nodeEnv === 'production' && env.serveFrontend) {
  logger.warn(
    `FRONTEND_DIST missing (${env.frontendDist}) — API-only mode. Run npm run build first.`
  );
}

app.use(errorHandler);

export default app;
