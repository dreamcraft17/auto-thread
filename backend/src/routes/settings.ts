import { Router, Request, Response } from 'express';
import { SettingsService } from '../services/SettingsService';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import Joi from 'joi';

const router = Router();
const settingsService = new SettingsService();

router.use(authMiddleware);

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const key = String(req.query.key || 'live_publish_enabled');
  const row = await settingsService.get(key);
  if (!row) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: `Setting "${key}" not found`, statusCode: 404 },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  res.json({
    success: true,
    data: {
      key: row.key,
      value: row.value === 'true' ? true : row.value === 'false' ? false : row.value,
      updated_at: row.updated_at,
      updated_by: row.updated_by,
    },
  });
}));

const patchSchema = Joi.object({
  key: Joi.string().valid('live_publish_enabled').required(),
  value: Joi.boolean().required(),
});

router.patch('/', asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = patchSchema.validate(req.body);
  if (error) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.details.map((d) => d.message).join(', '),
        statusCode: 400,
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Single-user tool: any authenticated user may toggle (documented as settings owner).
  const updated = await settingsService.setLivePublishEnabled(value.value, req.userId!);

  res.json({
    success: true,
    data: {
      key: updated!.key,
      value: updated!.value === 'true',
      updated_at: updated!.updated_at,
      updated_by: updated!.updated_by,
    },
  });
}));

export default router;
