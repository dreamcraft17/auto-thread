import { Router, Request, Response } from 'express';
import { PostService } from '../services/PostService';
import { JobQueueService } from '../services/JobQueueService';
import { NotificationService } from '../services/NotificationService';
import { ActivityLogRepository } from '../repositories/ActivityLogRepository';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const postService = new PostService();
const jobQueueService = new JobQueueService();
const notificationService = new NotificationService();
const activityLogRepo = new ActivityLogRepository();

router.use(authMiddleware);

router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const stats = await postService.getStats(req.userId!);
  res.json({ success: true, data: stats });
}));

router.get('/timeline', asyncHandler(async (req: Request, res: Response) => {
  const startDate = String(req.query.startDate || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]);
  const endDate = String(req.query.endDate || new Date().toISOString().split('T')[0]);
  const timeline = await postService.getTimeline(req.userId!, startDate, endDate);
  res.json({ success: true, data: { timeline } });
}));

router.get('/queue', asyncHandler(async (_req: Request, res: Response) => {
  const queue = await jobQueueService.getQueueStats();
  res.json({ success: true, data: queue });
}));

router.get('/activity', asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(String(req.query.limit || 50), 10);
  const offset = parseInt(String(req.query.offset || 0), 10);
  const activity = await activityLogRepo.list(req.userId!, limit, offset);
  res.json({ success: true, data: { activity } });
}));

router.get('/notifications', asyncHandler(async (req: Request, res: Response) => {
  const unreadOnly = req.query.unreadOnly === 'true';
  const notifications = await notificationService.listNotifications(req.userId!, unreadOnly);
  res.json({ success: true, data: { notifications } });
}));

router.put('/notifications/:id/read', asyncHandler(async (req: Request, res: Response) => {
  await notificationService.markRead(String(req.params.id), req.userId!);
  res.json({ success: true });
}));

router.put('/notifications/read-all', asyncHandler(async (req: Request, res: Response) => {
  await notificationService.markAllRead(req.userId!);
  res.json({ success: true });
}));

export default router;
