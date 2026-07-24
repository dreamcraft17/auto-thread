import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth';
import postsRoutes from './routes/posts';
import dashboardRoutes from './routes/dashboard';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(helmet());
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

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const v1 = express.Router();
v1.use('/auth', authRoutes);
v1.use('/posts', postsRoutes);
v1.use('/dashboard', dashboardRoutes);

app.use('/v1', v1);
app.use('/api', v1);

app.use(errorHandler);

export default app;
