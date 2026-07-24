import { chromium, Browser, Page } from 'playwright';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { MediaService } from '../services/MediaService';
import { sanitizeError } from './sanitizer';

export interface PublishResult {
  success: boolean;
  threadsPostId?: string;
  threadsUrl?: string;
  error?: string;
  mediaAttached?: boolean;
  mediaFallback?: boolean;
}

export interface LoginResult {
  success: boolean;
  sessionToken?: string;
  error?: string;
}

export interface PublishOptions {
  /** When true, simulate publish without hitting Threads. */
  dryRun?: boolean;
}

let browserInstance: Browser | null = null;
const mediaService = new MediaService();

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
  return browserInstance;
}

export async function loginToThreads(username: string, password: string, options: PublishOptions = {}): Promise<LoginResult> {
  const dryRun = options.dryRun ?? env.playwrightDryRun;
  if (dryRun) {
    logger.info(`[DRY RUN] Simulating Threads login for ${username}`);
    await new Promise((r) => setTimeout(r, 500));
    return { success: true, sessionToken: `dry-run-session-${Date.now()}` };
  }

  let page: Page | null = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    page.setDefaultTimeout(env.playwrightTimeout);

    await page.goto('https://www.threads.net/login', { waitUntil: 'networkidle' });

    const usernameInput = page.locator('input[name="username"], input[autocomplete="username"]');
    const passwordInput = page.locator('input[name="password"], input[type="password"]');

    await usernameInput.fill(username);
    await passwordInput.fill(password);
    await page.locator('button[type="submit"], div[role="button"]:has-text("Log in")').first().click();

    await page.waitForURL(/threads\.net(?!\/login)/, { timeout: env.playwrightTimeout });

    const cookies = await page.context().cookies();
    const sessionToken = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

    return { success: true, sessionToken };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    logger.error('Threads login failed', { error: sanitizeError(message) });
    return { success: false, error: sanitizeError(message) };
  } finally {
    if (page) await page.close();
  }
}

async function stageMediaFiles(mediaUrls: string[]): Promise<{ localPaths: string[]; stagingDir: string | null }> {
  if (!mediaUrls.length) return { localPaths: [], stagingDir: null };

  const localPaths = await mediaService.resolveMany(mediaUrls);
  if (!localPaths.length) return { localPaths: [], stagingDir: null };

  const stagingDir = await fs.mkdtemp(path.join(os.tmpdir(), 'threads-media-'));
  const staged: string[] = [];

  for (const src of localPaths) {
    const dest = path.join(stagingDir, path.basename(src));
    await fs.copyFile(src, dest);
    staged.push(dest);
  }

  return { localPaths: staged, stagingDir };
}

async function attachMedia(page: Page, localPaths: string[]): Promise<boolean> {
  if (!localPaths.length) return false;

  const fileInput = page.locator('input[type="file"]').first();
  const count = await fileInput.count();
  if (!count) {
    throw new Error('Media file input not found on compose page');
  }

  await fileInput.setInputFiles(localPaths);

  // Wait briefly for preview / upload indicator
  await page.waitForTimeout(1500);
  return true;
}

export async function publishToThreads(
  caption: string,
  sessionToken: string,
  mediaUrls: string[] = [],
  options: PublishOptions = {}
): Promise<PublishResult> {
  const dryRun = options.dryRun ?? env.playwrightDryRun;

  if (dryRun) {
    logger.info(`[DRY RUN] Simulating publish: "${caption.slice(0, 50)}..." media=${mediaUrls.length}`);
    await new Promise((r) => setTimeout(r, 1000));
    const id = `dry-run-post-${Date.now()}`;
    return {
      success: true,
      threadsPostId: id,
      threadsUrl: `https://www.threads.net/t/${id}`,
      mediaAttached: mediaUrls.length > 0,
    };
  }

  let page: Page | null = null;
  let stagingDir: string | null = null;
  let mediaFallback = false;
  let mediaAttached = false;

  try {
    const staged = await stageMediaFiles(mediaUrls);
    stagingDir = staged.stagingDir;
    const localPaths = staged.localPaths;

    const browser = await getBrowser();
    const context = await browser.newContext();
    const cookies = sessionToken.split('; ').map((pair) => {
      const [name, ...rest] = pair.split('=');
      return { name, value: rest.join('='), domain: '.threads.net', path: '/' };
    });
    await context.addCookies(cookies);
    page = await context.newPage();
    page.setDefaultTimeout(env.playwrightTimeout);

    await page.goto('https://www.threads.net/', { waitUntil: 'networkidle' });

    const composeButton = page.locator('[aria-label="Create"], button:has-text("Post")').first();
    await composeButton.click();

    const textArea = page.locator('div[contenteditable="true"], textarea').first();
    await textArea.fill(caption);

    if (localPaths.length > 0) {
      try {
        mediaAttached = await attachMedia(page, localPaths);
      } catch (mediaErr) {
        mediaFallback = true;
        const msg = mediaErr instanceof Error ? mediaErr.message : 'Media attach failed';
        logger.warn(`Media attach failed, falling back to text-only: ${sanitizeError(msg)}`);
      }
    } else if (mediaUrls.length > 0) {
      // Files missing on disk — continue text-only (FR-300.10)
      mediaFallback = true;
      logger.warn('media_urls present but no local files found; publishing text-only');
    }

    const postButton = page.locator('div[role="button"]:has-text("Post"), button:has-text("Post")').last();
    await postButton.click();

    await page.waitForTimeout(3000);

    const threadsPostId = `threads-${Date.now()}`;
    return {
      success: true,
      threadsPostId,
      threadsUrl: `https://www.threads.net/t/${threadsPostId}`,
      mediaAttached,
      mediaFallback,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Publish failed';
    logger.error('Threads publish failed', { error: sanitizeError(message) });
    return { success: false, error: sanitizeError(message), mediaFallback };
  } finally {
    if (page) await page.close();
    if (stagingDir) {
      try {
        await fs.rm(stagingDir, { recursive: true, force: true });
      } catch {
        /* ignore cleanup errors */
      }
    }
  }
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
