import { chromium, Browser, Page } from 'playwright';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface PublishResult {
  success: boolean;
  threadsPostId?: string;
  error?: string;
}

export interface LoginResult {
  success: boolean;
  sessionToken?: string;
  error?: string;
}

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
  return browserInstance;
}

export async function loginToThreads(username: string, password: string): Promise<LoginResult> {
  if (env.playwrightDryRun) {
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
    logger.error('Threads login failed', { error: message });
    return { success: false, error: message };
  } finally {
    if (page) await page.close();
  }
}

export async function publishToThreads(
  caption: string,
  sessionToken: string,
  mediaUrls: string[] = []
): Promise<PublishResult> {
  if (env.playwrightDryRun) {
    logger.info(`[DRY RUN] Simulating publish: "${caption.slice(0, 50)}..."`);
    await new Promise((r) => setTimeout(r, 1000));
    return { success: true, threadsPostId: `dry-run-post-${Date.now()}` };
  }

  let page: Page | null = null;
  try {
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

    if (mediaUrls.length > 0) {
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(mediaUrls);
    }

    const postButton = page.locator('div[role="button"]:has-text("Post"), button:has-text("Post")').last();
    await postButton.click();

    await page.waitForTimeout(3000);

    return { success: true, threadsPostId: `threads-${Date.now()}` };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Publish failed';
    logger.error('Threads publish failed', { error: message });
    return { success: false, error: message };
  } finally {
    if (page) await page.close();
  }
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
