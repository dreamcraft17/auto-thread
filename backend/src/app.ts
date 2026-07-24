import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth';
import postsRoutes from './routes/posts';
import dashboardRoutes from './routes/dashboard';
import settingsRoutes from './routes/settings';
import { errorHandler } from './middleware/errorHandler';
import { env } from './config/env';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: true, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId || req.ip || 'anonymous',
});
app.use(limiter);

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

const v1 = express.Router();
v1.use('/auth', authRoutes);
v1.use('/posts', postsRoutes);
v1.use('/dashboard', dashboardRoutes);
v1.use('/settings', settingsRoutes);

app.use('/v1', v1);
app.use('/api', v1);

app.use(errorHandler);

export default app;
