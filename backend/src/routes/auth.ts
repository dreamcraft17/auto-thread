import { Router, Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { asyncHandler } from '../middleware/errorHandler';
import { validate, loginSchema, preferencesSchema } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const authService = new AuthService();

router.post('/login', validate(loginSchema), asyncHandler(async (req: Request, res: Response) => {
  const { username, password, timezone } = req.body;
  const result = await authService.login(username, password, timezone);
  res.json({ success: true, data: result });
}));

router.post('/logout', authMiddleware, asyncHandler(async (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Logged out successfully' });
}));

router.get('/me', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.validateSession(req.userId!);
  res.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      username: user.username,
      timezone: user.timezone,
      notificationPreferences: user.notification_preferences,
    },
  });
}));

router.put('/preferences', authMiddleware, validate(preferencesSchema), asyncHandler(async (req: Request, res: Response) => {
  const prefs = await authService.updatePreferences(req.userId!, req.body);
  res.json({ success: true, data: prefs });
}));

export default router;
