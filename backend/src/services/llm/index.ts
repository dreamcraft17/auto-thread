import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { ClaudeProvider } from './claude.provider';
import { CodexProvider } from './codex.provider';
import { OpenRouterProvider } from './openrouter.provider';
import { MockProvider } from './mock.provider';
import { CaptionLength, CaptionTone, ILLMProvider } from './types';

export interface BrandGuidelineInput {
  voice_description?: string | null;
  example_caption?: string | null;
  tone_preference?: string | null;
  hashtag_defaults?: string | null;
  name?: string | null;
}

export class LLMService {
  private provider: ILLMProvider;

  constructor(provider?: ILLMProvider) {
    this.provider = provider || this.initializeProvider();
  }

  private initializeProvider(): ILLMProvider {
    const type = env.llmProvider;
    try {
      switch (type) {
        case 'claude':
          return new ClaudeProvider();
        case 'codex':
          return new CodexProvider();
        case 'openrouter':
          return new OpenRouterProvider();
        case 'mock':
          return new MockProvider();
        default:
          logger.warn(`Unknown LLM_PROVIDER=${type}, using mock`);
          return new MockProvider();
      }
    } catch (err) {
      logger.warn('Primary LLM provider init failed, falling back to mock', {
        error: err instanceof Error ? err.message : String(err),
      });
      return new MockProvider();
    }
  }

  getProviderName() {
    return this.provider.getProviderName();
  }

  buildPrompt(
    topic: string,
    tone: CaptionTone | string,
    length: CaptionLength | string,
    brand?: BrandGuidelineInput | null
  ): string {
    const voice =
      brand?.voice_description ||
      'Casual but professional, generous with knowledge sharing, innovation-focused';
    const example =
      brand?.example_caption ||
      '🚀 Just shipped a feature that saves our team 2 hours/day... #dntech #buildinpublic';
    const hashtags = brand?.hashtag_defaults || '#dntech #threads';
    const lengthHint =
      length === 'short' ? 'Keep it under ~220 characters.' : 'Aim for ~280-450 characters.';

    return `You are writing for DN Tech's Threads account.

Brand Voice: ${voice}
Example caption: ${example}
Preferred default hashtags (adapt if needed): ${hashtags}

Topic: ${topic}
Tone: ${tone}
${lengthHint}

Requirements:
- Max 500 characters total
- Include 2-4 relevant hashtags
- Sound conversational and authentic
- Focus on value / learning / shipping
- Do not wrap the caption in quotes
- Output ONLY the caption text

Generate the caption now:`;
  }

  async generate(
    topic: string,
    tone: CaptionTone | string = 'casual',
    length: CaptionLength | string = 'medium',
    brand?: BrandGuidelineInput | null
  ): Promise<{
    caption: string;
    provider: string;
    cost: number;
    tokensUsed: number;
    generationTimeMs: number;
  }> {
    const prompt = this.buildPrompt(topic, tone, length, brand);
    const started = Date.now();

    let result: { text: string; tokensUsed: number };
    try {
      result = await this.provider.generateCaption(prompt);
    } catch (primaryErr) {
      // Fallback chain: try openrouter then mock if primary fails and isn't already mock
      logger.warn('LLM primary failed, attempting fallback', {
        error: primaryErr instanceof Error ? primaryErr.message : String(primaryErr),
        provider: this.provider.getProviderName(),
      });
      const fallback = await this.tryFallback(prompt);
      result = fallback.result;
      const cost = fallback.provider.estimateCost(result.tokensUsed);
      return {
        caption: this.clipCaption(result.text),
        provider: fallback.provider.getProviderName(),
        cost,
        tokensUsed: result.tokensUsed,
        generationTimeMs: Date.now() - started,
      };
    }

    const cost = this.provider.estimateCost(result.tokensUsed);
    return {
      caption: this.clipCaption(result.text),
      provider: this.provider.getProviderName(),
      cost,
      tokensUsed: result.tokensUsed,
      generationTimeMs: Date.now() - started,
    };
  }

  private async tryFallback(prompt: string): Promise<{ result: { text: string; tokensUsed: number }; provider: ILLMProvider }> {
    const current = this.provider.getProviderName();
    const candidates: ILLMProvider[] = [];

    if (current !== 'openrouter' && env.openrouterApiKey) {
      try {
        candidates.push(new OpenRouterProvider());
      } catch {
        /* skip */
      }
    }
    if (current !== 'claude' && env.anthropicApiKey) {
      try {
        candidates.push(new ClaudeProvider());
      } catch {
        /* skip */
      }
    }
    candidates.push(new MockProvider());

    let lastError: unknown;
    for (const p of candidates) {
      try {
        const result = await p.generateCaption(prompt);
        return { result, provider: p };
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError instanceof Error ? lastError : new Error('All LLM providers failed');
  }

  private clipCaption(text: string): string {
    let t = text.trim().replace(/^["']|["']$/g, '');
    if (t.length > 500) t = t.slice(0, 500);
    return t;
  }
}
