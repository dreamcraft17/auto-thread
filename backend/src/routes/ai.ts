import { Router, Request, Response } from 'express';
import { AiService } from '../services/AiService';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { PostService } from '../services/PostService';

const router = Router();
const aiService = new AiService();
const postService = new PostService();

router.use(authMiddleware);

router.post(
  '/generate-caption',
  asyncHandler(async (req: Request, res: Response) => {
    const data = await aiService.generateCaption(req.userId!, {
      topic: req.body.topic,
      tone: req.body.tone,
      length: req.body.length,
    });
    res.json({ success: true, data });
  })
);

router.post(
  '/batch-generate',
  asyncHandler(async (req: Request, res: Response) => {
    let topics = req.body.topics as Array<{ topic: string; tone?: string; length?: string }> | string[];

    if (typeof req.body.topicsText === 'string') {
      topics = String(req.body.topicsText)
        .split('\n')
        .map((line: string) => line.trim())
        .filter(Boolean)
        .map((topic: string) => ({ topic, tone: req.body.tone || 'casual' }));
    }

    if (Array.isArray(topics) && typeof topics[0] === 'string') {
      topics = (topics as string[]).map((topic) => ({ topic, tone: req.body.tone || 'casual' }));
    }

    const data = await aiService.batchGenerate(req.userId!, topics as Array<{ topic: string; tone?: string; length?: string }>);
    const slots = aiService.suggestBatchSlots(data.results.filter((r) => r.ok).length);
    res.json({ success: true, data: { ...data, suggestedSlots: slots } });
  })
);

router.get(
  '/best-time',
  asyncHandler(async (_req: Request, res: Response) => {
    const data = await aiService.getBestTime();
    res.json({ success: true, data });
  })
);

router.get(
  '/usage',
  asyncHandler(async (req: Request, res: Response) => {
    const data = await aiService.getUsageStats(req.userId!);
    res.json({ success: true, data });
  })
);

router.get(
  '/brand-guidelines',
  asyncHandler(async (_req: Request, res: Response) => {
    const rows = await aiService.listBrandGuidelines();
    res.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        voiceDescription: r.voice_description,
        exampleCaption: r.example_caption,
        tonePreference: r.tone_preference,
        hashtagDefaults: r.hashtag_defaults,
        isActive: r.is_active,
        createdAt: r.created_at,
      })),
    });
  })
);

router.put(
  '/brand-guidelines',
  asyncHandler(async (req: Request, res: Response) => {
    const row = await aiService.upsertBrandGuideline(req.userId!, {
      id: req.body.id,
      name: req.body.name || 'DN Tech',
      voiceDescription: req.body.voiceDescription,
      exampleCaption: req.body.exampleCaption,
      tonePreference: req.body.tonePreference,
      hashtagDefaults: req.body.hashtagDefaults,
      isActive: req.body.isActive,
    });
    res.json({
      success: true,
      data: {
        id: row.id,
        name: row.name,
        voiceDescription: row.voice_description,
        exampleCaption: row.example_caption,
        tonePreference: row.tone_preference,
        hashtagDefaults: row.hashtag_defaults,
        isActive: row.is_active,
      },
    });
  })
);

router.post(
  '/captions/:id/approve',
  asyncHandler(async (req: Request, res: Response) => {
    const row = await aiService.approveCaption(req.userId!, String(req.params.id));
    const bestTime = await aiService.getBestTime();
    res.json({
      success: true,
      data: {
        id: row.id,
        caption: row.generated_text,
        isApproved: true,
        bestTime,
      },
    });
  })
);

/** Approve & schedule one caption at suggested or provided time. */
router.post(
  '/captions/:id/approve-schedule',
  asyncHandler(async (req: Request, res: Response) => {
    const row = await aiService.approveCaption(req.userId!, String(req.params.id));
    const bestTime = await aiService.getBestTime();
    const scheduledTime = req.body.scheduledTime || bestTime.suggestedAt;
    if (!scheduledTime) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'scheduledTime required', statusCode: 400 },
      });
      return;
    }

    const post = await postService.createPost(req.userId!, {
      caption: row.generated_text,
      scheduledTime,
      mediaUrls: req.body.mediaUrls,
    });

    res.status(201).json({
      success: true,
      data: {
        postId: post.id,
        caption: post.caption,
        scheduledTime: post.scheduled_time,
        bestTime,
      },
    });
  })
);

export default router;
