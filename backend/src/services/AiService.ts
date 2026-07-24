import db from '../config/database';
import { env } from '../config/env';
import { AppError } from './AuthService';
import { LLMService } from './llm';
import { validateCaption } from './CaptionValidator';
import { alertCritical } from '../utils/alerts';
import { logger } from '../utils/logger';

const genWindow = new Map<string, number[]>();

function assertRateLimit(userId: string) {
  const now = Date.now();
  const windowMs = 60_000;
  const stamps = (genWindow.get(userId) || []).filter((t) => now - t < windowMs);
  if (stamps.length >= env.aiGenPerMinute) {
    throw new AppError('RATE_LIMIT', `Max ${env.aiGenPerMinute} generations per minute`, 429);
  }
  stamps.push(now);
  genWindow.set(userId, stamps);
}

export class AiService {
  constructor(private llm = new LLMService()) {}

  async getActiveBrand() {
    return db('brand_guidelines').where({ is_active: true }).orderBy('created_at', 'desc').first();
  }

  async listBrandGuidelines() {
    return db('brand_guidelines').orderBy('created_at', 'desc');
  }

  async upsertBrandGuideline(
    userId: string,
    data: {
      id?: string;
      name: string;
      voiceDescription?: string;
      exampleCaption?: string;
      tonePreference?: string;
      hashtagDefaults?: string;
      isActive?: boolean;
    }
  ) {
    const payload = {
      name: data.name,
      voice_description: data.voiceDescription || null,
      example_caption: data.exampleCaption || null,
      tone_preference: data.tonePreference || 'casual',
      hashtag_defaults: data.hashtagDefaults || null,
      is_active: data.isActive !== false,
      updated_at: new Date(),
    };

    let row;
    if (data.id) {
      [row] = await db('brand_guidelines').where({ id: data.id }).update(payload).returning('*');
    } else {
      if (payload.is_active) {
        await db('brand_guidelines').update({ is_active: false });
      }
      [row] = await db('brand_guidelines').insert(payload).returning('*');
    }

    await db('audit_log').insert({
      user_id: userId,
      action: 'BRAND_GUIDELINES_UPSERT',
      details: { id: row.id, name: row.name },
    });

    return row;
  }

  async generateCaption(
    userId: string,
    input: { topic: string; tone?: string; length?: string }
  ) {
    const topic = (input.topic || '').trim();
    if (topic.length < 3 || topic.length > 500) {
      throw new AppError('VALIDATION_ERROR', 'Topic must be 3-500 characters');
    }

    assertRateLimit(userId);

    const brand = await this.getActiveBrand();
    const tone = input.tone || brand?.tone_preference || 'casual';
    const length = input.length || 'medium';

    const result = await this.llm.generate(topic, tone, length, brand);
    const validation = validateCaption(result.caption, tone);

    const [row] = await db('generated_captions')
      .insert({
        user_id: userId,
        topic,
        tone,
        length_pref: length,
        generated_text: result.caption,
        provider: result.provider,
        tokens_used: result.tokensUsed,
        cost_cents: Math.round(result.cost * 100),
        generation_time_ms: result.generationTimeMs,
        is_approved: false,
        validation: JSON.stringify(validation),
      })
      .returning('*');

    await this.maybeWarnBudget(userId);

    return {
      id: row.id,
      caption: row.generated_text,
      provider: row.provider,
      cost: result.cost,
      costCents: row.cost_cents,
      tokensUsed: row.tokens_used,
      generationTimeMs: row.generation_time_ms,
      characterCount: row.generated_text.length,
      validation,
      isApproved: false,
    };
  }

  async batchGenerate(userId: string, topics: Array<{ topic: string; tone?: string; length?: string }>) {
    if (!Array.isArray(topics) || topics.length === 0) {
      throw new AppError('VALIDATION_ERROR', 'topics array is required');
    }
    if (topics.length > 10) {
      throw new AppError('VALIDATION_ERROR', 'Max 10 topics per batch');
    }

    const results = [];
    for (const item of topics) {
      try {
        const generated = await this.generateCaption(userId, item);
        results.push({ ok: true, ...generated, topic: item.topic });
      } catch (err) {
        results.push({
          ok: false,
          topic: item.topic,
          error: err instanceof Error ? err.message : 'Failed to generate',
        });
      }
    }
    return { results };
  }

  async approveCaption(userId: string, id: string) {
    const row = await db('generated_captions').where({ id, user_id: userId }).first();
    if (!row) throw new AppError('NOT_FOUND', 'Caption not found', 404);

    const [updated] = await db('generated_captions')
      .where({ id })
      .update({ is_approved: true, used_at: new Date() })
      .returning('*');

    await db('audit_log').insert({
      user_id: userId,
      action: 'CAPTION_APPROVED',
      details: { captionId: id, topic: row.topic },
    });

    return updated;
  }

  async getBestTime() {
    const top = await db('posting_heatmap').orderBy('total_engagement', 'desc').first();
    if (!top) {
      return {
        suggestion: 'Best times are typically 14:00-20:00',
        dayOfWeek: null,
        hourOfDay: null,
        engagement: 0,
        source: 'default',
      };
    }

    const next = this.nextOccurrence(top.day_of_week, top.hour_of_day);
    return {
      suggestion: `${top.day_of_week} ${String(top.hour_of_day).padStart(2, '0')}:00`,
      dayOfWeek: top.day_of_week,
      hourOfDay: top.hour_of_day,
      engagement: top.total_engagement,
      suggestedAt: next.toISOString(),
      source: 'heatmap',
    };
  }

  /** Suggest staggered schedule slots for batch approve. */
  suggestBatchSlots(count: number): string[] {
    const staggerHours = [9, 14, 19, 10, 15, 11, 16, 12, 17, 13];
    const slots: string[] = [];
    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setMinutes(0, 0, 0);

    for (let i = 0; i < count; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      d.setHours(staggerHours[i % staggerHours.length], 0, 0, 0);
      slots.push(d.toISOString());
    }
    return slots;
  }

  async getUsageStats(userId: string) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const rows = await db('generated_captions')
      .where({ user_id: userId })
      .where('created_at', '>=', startOfMonth)
      .select('provider')
      .sum({ cost_cents: 'cost_cents' })
      .count({ count: '*' })
      .groupBy('provider') as Array<{ provider: string | null; cost_cents: string | number; count: string | number }>;

    const costByProvider = rows.map((r) => ({
      provider: r.provider || 'unknown',
      captions: parseInt(String(r.count), 10),
      costCents: parseInt(String(r.cost_cents || 0), 10),
      cost: parseInt(String(r.cost_cents || 0), 10) / 100,
    }));

    const totalCaptions = costByProvider.reduce((s, x) => s + x.captions, 0);
    const totalCostCents = costByProvider.reduce((s, x) => s + x.costCents, 0);
    const cheapest = [...costByProvider].sort((a, b) => a.cost / Math.max(1, a.captions) - b.cost / Math.max(1, b.captions))[0];

    return {
      totalCaptions,
      totalCost: totalCostCents / 100,
      totalCostCents,
      avgCost: totalCaptions ? totalCostCents / 100 / totalCaptions : 0,
      costByProvider,
      recommendedProvider: cheapest?.provider || env.llmProvider,
      budgetCents: env.aiMonthlyBudgetCents,
      overBudget: totalCostCents > env.aiMonthlyBudgetCents,
      activeProvider: this.llm.getProviderName(),
    };
  }

  private nextOccurrence(day: string, hour: number): Date {
    const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const target = map[day] ?? 3;
    const now = new Date();
    const out = new Date(now);
    out.setSeconds(0, 0);
    out.setMinutes(0);
    out.setHours(hour);
    const delta = (target - now.getDay() + 7) % 7;
    out.setDate(now.getDate() + (delta === 0 && now.getHours() >= hour ? 7 : delta));
    return out;
  }

  private async maybeWarnBudget(userId: string) {
    try {
      const stats = await this.getUsageStats(userId);
      if (stats.overBudget) {
        await alertCritical(
          `⚠️ AI caption spend this month $${stats.totalCost.toFixed(2)} exceeds budget $${(env.aiMonthlyBudgetCents / 100).toFixed(2)}`
        );
      }
    } catch (err) {
      logger.warn('Budget check failed', { error: err instanceof Error ? err.message : String(err) });
    }
  }
}
