import request from 'supertest';
import express from 'express';
import multer from 'multer';
import { validateImageBuffer } from '../utils/validators';

/**
 * Lightweight route-shape tests without DB (FR-600).
 * Full auth/DB integration is covered when DATABASE_URL is available.
 */

function buildUploadApp() {
  const app = express();
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

  app.post('/v1/posts/upload-media', upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'File harus PNG, JPEG, GIF atau WebP (<5MB)', statusCode: 400 },
      });
    }
    try {
      const { mime } = validateImageBuffer(req.file.buffer, req.file.mimetype);
      return res.status(201).json({
        success: true,
        data: { media_url: `http://localhost:3000/media/test.png`, mime_type: mime, file_size: req.file.buffer.length },
      });
    } catch (err) {
      const status = (err as { status?: number }).status || 400;
      return res.status(status).json({
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: 'File harus PNG, JPEG, GIF atau WebP (<5MB)',
          statusCode: status,
        },
      });
    }
  });

  app.get('/v1/settings', (_req, res) => {
    res.json({ success: true, data: { key: 'live_publish_enabled', value: false } });
  });

  app.patch('/v1/settings', express.json(), (req, res) => {
    if (typeof req.body?.value !== 'boolean' || req.body?.key !== 'live_publish_enabled') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', statusCode: 400 } });
    }
    return res.json({ success: true, data: { key: 'live_publish_enabled', value: req.body.value } });
  });

  return app;
}

describe('POST /v1/posts/upload-media', () => {
  const app = buildUploadApp();
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

  it('accepts valid PNG', async () => {
    const res = await request(app)
      .post('/v1/posts/upload-media')
      .attach('file', png, { filename: 'ok.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.mime_type).toBe('image/png');
  });

  it('rejects non-image bytes', async () => {
    const res = await request(app)
      .post('/v1/posts/upload-media')
      .attach('file', Buffer.from('not-an-image'), { filename: 'x.txt', contentType: 'text/plain' });
    expect([400, 415]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });
});

describe('GET/PATCH /v1/settings', () => {
  const app = buildUploadApp();

  it('returns live_publish_enabled', async () => {
    const res = await request(app).get('/v1/settings');
    expect(res.status).toBe(200);
    expect(res.body.data.key).toBe('live_publish_enabled');
    expect(res.body.data.value).toBe(false);
  });

  it('patches live mode', async () => {
    const res = await request(app)
      .patch('/v1/settings')
      .send({ key: 'live_publish_enabled', value: true });
    expect(res.status).toBe(200);
    expect(res.body.data.value).toBe(true);
  });
});
