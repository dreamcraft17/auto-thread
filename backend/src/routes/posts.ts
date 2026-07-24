import { Router, Request, Response } from 'express';
import multer from 'multer';
import { PostService } from '../services/PostService';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { validate, createPostSchema, updatePostSchema } from '../middleware/validation';
import { PostStatus } from '../types';

const router = Router();
const postService = new PostService();
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 },
  storage: multer.memoryStorage(),
});

function formatPost(post: import('../types').Post) {
  return {
    id: post.id,
    userId: post.user_id,
    caption: post.caption,
    mediaUrls: post.media_urls,
    scheduledTime: post.scheduled_time,
    publishedTime: post.published_time,
    status: post.status,
    retryCount: post.retry_count,
    lastError: post.last_error,
    threadsPostId: post.threads_post_id,
    createdAt: post.created_at,
    updatedAt: post.updated_at,
  };
}

router.use(authMiddleware);

router.post('/', validate(createPostSchema), asyncHandler(async (req: Request, res: Response) => {
  const post = await postService.createPost(req.userId!, req.body);
  res.status(201).json({ success: true, data: formatPost(post) });
}));

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(String(req.query.limit || 10), 10);
  const offset = parseInt(String(req.query.offset || 0), 10);
  const filters = {
    status: req.query.status as PostStatus | undefined,
    search: req.query.search as string | undefined,
    startDate: req.query.startDate as string | undefined,
    endDate: req.query.endDate as string | undefined,
    sort: req.query.sort as string | undefined,
  };

  const { posts, total } = await postService.listPosts(req.userId!, filters, limit, offset);
  res.json({
    success: true,
    data: {
      posts: posts.map(formatPost),
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    },
  });
}));

router.get('/published', asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(String(req.query.limit || 10), 10);
  const offset = parseInt(String(req.query.offset || 0), 10);
  const { posts, total } = await postService.listPosts(req.userId!, { status: 'published', sort: '-scheduled_time' }, limit, offset);
  res.json({ success: true, data: { posts: posts.map(formatPost), pagination: { total, limit, offset, hasMore: offset + limit < total } } });
}));

router.get('/scheduled', asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(String(req.query.limit || 10), 10);
  const offset = parseInt(String(req.query.offset || 0), 10);
  const { posts, total } = await postService.listPosts(req.userId!, { status: 'scheduled', sort: 'scheduled_time' }, limit, offset);
  res.json({ success: true, data: { posts: posts.map(formatPost), pagination: { total, limit, offset, hasMore: offset + limit < total } } });
}));

router.get('/failed', asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(String(req.query.limit || 10), 10);
  const offset = parseInt(String(req.query.offset || 0), 10);
  const { posts, total } = await postService.listPosts(req.userId!, { status: 'failed', sort: '-scheduled_time' }, limit, offset);
  res.json({ success: true, data: { posts: posts.map(formatPost), pagination: { total, limit, offset, hasMore: offset + limit < total } } });
}));

router.post('/import', upload.single('file'), asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({
      success: false,
      error: { code: 'NO_FILE', message: 'CSV file is required', statusCode: 400 },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const result = await postService.importPosts(req.userId!, req.file.buffer.toString('utf-8'));
  res.json({ success: true, data: result });
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const post = await postService.getPost(String(req.params.id), req.userId!);
  res.json({ success: true, data: formatPost(post) });
}));

router.put('/:id', validate(updatePostSchema), asyncHandler(async (req: Request, res: Response) => {
  const post = await postService.updatePost(String(req.params.id), req.userId!, req.body);
  res.json({ success: true, data: formatPost(post) });
}));

router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  await postService.deletePost(String(req.params.id), req.userId!);
  res.status(204).send();
}));

router.post('/:id/retry', asyncHandler(async (req: Request, res: Response) => {
  const post = await postService.retryPost(String(req.params.id), req.userId!);
  res.json({
    success: true,
    data: {
      postId: post.id,
      status: post.status,
      retryCount: post.retry_count,
      message: 'Post requeued for retry',
    },
  });
}));

export default router;
