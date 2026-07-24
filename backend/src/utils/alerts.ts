import { env } from '../config/env';
import { logger } from './logger';

/** Send critical ops alert to Slack when configured (FR-500.5). */
export async function alertCritical(message: string): Promise<void> {
  if (!env.slackWebhookUrl) {
    logger.warn(`Critical alert (no Slack webhook): ${message}`);
    return;
  }

  try {
    await fetch(env.slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });
  } catch (err) {
    logger.error('Failed to send Slack alert', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
