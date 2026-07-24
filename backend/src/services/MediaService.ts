import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { env } from '../config/env';
import { extForMime, maxMediaPerPost, validateImageBuffer } from '../utils/validators';
import { logger } from '../utils/logger';

export class MediaService {
  uploadDir() {
    return env.uploadDir;
  }

  async ensureUploadDir() {
    await fs.mkdir(this.uploadDir(), { recursive: true });
  }

  async uploadMedia(file: Express.Multer.File): Promise<{
    media_url: string;
    file_size: number;
    mime_type: string;
    filename: string;
  }> {
    await this.ensureUploadDir();
    const { mime } = validateImageBuffer(file.buffer, file.mimetype);
    const filename = `${randomUUID()}${extForMime(mime)}`;
    const filepath = path.join(this.uploadDir(), filename);
    await fs.writeFile(filepath, file.buffer, { mode: 0o644 });

    const media_url = `${env.publicBaseUrl}/media/${filename}`;
    return {
      media_url,
      file_size: file.buffer.length,
      mime_type: mime,
      filename,
    };
  }

  /** Resolve media URL or relative path to a local absolute file path. */
  async resolveLocalPath(mediaUrl: string): Promise<string | null> {
    const match = mediaUrl.match(/\/media\/([^/?#]+)$/);
    const filename = match?.[1] || (mediaUrl.startsWith('/') ? path.basename(mediaUrl) : null);
    if (!filename || filename.includes('..')) return null;
    const filepath = path.join(this.uploadDir(), filename);
    try {
      await fs.stat(filepath);
      return filepath;
    } catch {
      logger.warn(`Media file not found: ${filename}`);
      return null;
    }
  }

  async resolveMany(mediaUrls: string[]): Promise<string[]> {
    const limited = mediaUrls.slice(0, maxMediaPerPost());
    const paths: string[] = [];
    for (const url of limited) {
      const p = await this.resolveLocalPath(url);
      if (p) paths.push(p);
    }
    return paths;
  }

  async cleanupOldUploads(daysOld = 30) {
    await this.ensureUploadDir();
    const files = await fs.readdir(this.uploadDir());
    const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000;
    for (const file of files) {
      const filepath = path.join(this.uploadDir(), file);
      const stat = await fs.stat(filepath);
      if (stat.mtimeMs < cutoff) {
        await fs.unlink(filepath);
        logger.info(`Deleted old upload: ${file}`);
      }
    }
  }
}
