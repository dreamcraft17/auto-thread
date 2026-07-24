export interface CaptionValidation {
  passed: boolean;
  warnings: string[];
  hashtagCount: number;
  brandFitScore: number; // 1-5 heuristic
  grammarOk: boolean;
}

export function validateCaption(text: string, tone = 'casual'): CaptionValidation {
  const warnings: string[] = [];
  const trimmed = (text || '').trim();

  if (!trimmed) {
    return { passed: false, warnings: ['Caption is empty'], hashtagCount: 0, brandFitScore: 1, grammarOk: false };
  }

  if (trimmed.length > 500) {
    warnings.push('Exceeds 500 character limit');
  }

  const hashtags = trimmed.match(/#\w+/g) || [];
  if (hashtags.length < 1) {
    warnings.push('Add at least 1 hashtag');
  }
  if (hashtags.length > 5) {
    warnings.push('Too many hashtags (max 5)');
  }

  const grammarOk = /[.!?…]["')\]]?\s*$/.test(trimmed) || hashtags.length > 0;
  if (!grammarOk) {
    warnings.push('Should end with punctuation or a hashtag');
  }

  // Brand-fit heuristic (no extra LLM call)
  let brandFitScore = 3;
  const lower = trimmed.toLowerCase();
  const positive = ['ship', 'build', 'learn', 'team', 'feature', 'dntech', 'tip', 'how', 'why'];
  const negative = ['buy now', 'limited offer', 'click here', 'crypto giveaway', 'nsfw'];
  const hits = positive.filter((w) => lower.includes(w)).length;
  const bad = negative.filter((w) => lower.includes(w)).length;
  brandFitScore = Math.max(1, Math.min(5, 2 + hits - bad * 2));

  if (tone === 'professional' && /😂|💀|lmao|bro+/.test(lower)) {
    brandFitScore = Math.max(1, brandFitScore - 1);
    warnings.push('Tone may be too casual for professional');
  }

  if (brandFitScore < 3) {
    warnings.push('Might not match DN Tech brand. Try regenerating?');
  }

  return {
    passed: warnings.length === 0 || (trimmed.length <= 500 && hashtags.length <= 5 && brandFitScore >= 2),
    warnings,
    hashtagCount: hashtags.length,
    brandFitScore,
    grammarOk,
  };
}
