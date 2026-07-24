import { Router, Request, Response } from 'express';
import multer from 'multer';
import { PostService } from '../services/PostService';
import { MediaService } from '../services/MediaService';
import { PublishHistoryRepository } from '../repositories/PublishHistoryRepository';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { validate, createPostSchema, updatePostSchema } from '../middleware/validation';
import { maxUploadBytes } from '../utils/validators';
import { PostStatus } from '../types';

const router = Router();
const postService = new PostService();
const mediaService = new MediaService();
const historyRepo = new PublishHistoryRepository();
const upload = multer({
  limits: { fileSize: maxUploadBytes() },
  storage: multer.memoryStorage(),
});

function formatPost(post: import('../types').Post) {
  return {
    id: post.id,
    userId: post.user_id,
    caption: post.caption,
    mediaUrls: post.media_urls,
    mediaCount: post.media_count ?? post.media_urls?.length ?? 0,
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

router.post('/upload-media', upload.single('file'), asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({
      success: false,
      error: {
        code: 'NO_FILE',
        message: 'File harus PNG, JPEG, GIF atau WebP (<5MB)',
        statusCode: 400,
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const result = await mediaService.uploadMedia(req.file);
    res.status(201).json({
      success: true,
      data: {
        media_url: result.media_url,
        file_size: result.file_size,
        mime_type: result.mime_type,
      },
    });
  } catch (err) {
    const status = (err as { status?: number }).status || 400;
    const message = err instanceof Error ? err.message : 'Upload failed';
    res.status(status).json({
      success: false,
      error: {
        code: status === 415 ? 'UNSUPPORTED_MEDIA' : 'UPLOAD_ERROR',
        message: message.includes('Unsupported') || message.includes('5MB') || message.includes('corrupted')
          ? 'File harus PNG, JPEG, GIF atau WebP (<5MB)'
          : message,
        statusCode: status,
      },
      timestamp: new Date().toISOString(),
    });
  }
}));

router.get('/:id/history', asyncHandler(async (req: Request, res: Response) => {
  const post = await postService.getPost(String(req.params.id), req.userId!);
  const limit = parseInt(String(req.query.limit || 20), 10);
  const offset = parseInt(String(req.query.offset || 0), 10);
  const format = String(req.query.format || 'json');
  const rows = await historyRepo.listByPost(post.id, limit, offset);

  if (format === 'csv') {
    const header = 'user_id,post_id,timestamp,mode,status,threads_url,error_msg\n';
    const body = rows
      .map((r) =>
        [
          r.user_id || '',
          r.post_id,
          new Date(r.timestamp).toISOString(),
          r.mode,
          r.status,
          r.threads_url || '',
          JSON.stringify(r.error_msg || ''),
        ].join(',')
      )
      .join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="publish-history-${post.id}.csv"`);
    res.send(header + body);
    return;
  }

  res.json({
    success: true,
    data: {
      postId: post.id,
      history: rows.map((r) => ({
        id: r.id,
        timestamp: r.timestamp,
        mode: r.mode,
        status: r.status,
        errorMsg: r.error_msg,
        threadsUrl: r.threads_url,
      })),
    },
  });
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
