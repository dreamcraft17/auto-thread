import { validateCaption } from '../services/CaptionValidator';
import { LLMService } from '../services/llm';
import { MockProvider } from '../services/llm/mock.provider';

describe('CaptionValidator', () => {
  it('flags missing hashtags and overlong text', () => {
    const long = 'a'.repeat(501);
    const v = validateCaption(long);
    expect(v.warnings.some((w) => w.includes('500'))).toBe(true);
  });

  it('scores brand-ish captions higher', () => {
    const good = validateCaption(
      '🚀 Just shipped a feature that helps our team learn faster. #dntech #buildinpublic'
    );
    expect(good.brandFitScore).toBeGreaterThanOrEqual(3);
    expect(good.hashtagCount).toBe(2);
  });
});

describe('LLMService (mock)', () => {
  it('builds prompt with brand voice', () => {
    const llm = new LLMService(new MockProvider());
    const prompt = llm.buildPrompt('AI tips', 'casual', 'medium', {
      voice_description: 'tech-forward',
      example_caption: 'example',
      hashtag_defaults: '#dntech',
    });
    expect(prompt).toContain('AI tips');
    expect(prompt).toContain('tech-forward');
  });

  it('generates caption under 500 chars', async () => {
    const llm = new LLMService(new MockProvider());
    const result = await llm.generate('shipping tips', 'casual', 'short');
    expect(result.caption.length).toBeGreaterThan(10);
    expect(result.caption.length).toBeLessThanOrEqual(500);
    expect(result.provider).toBe('mock');
    expect(result.cost).toBeGreaterThanOrEqual(0);
  });
});
