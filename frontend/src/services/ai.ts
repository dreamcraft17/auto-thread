import api from './api';

export interface CaptionValidation {
  passed: boolean;
  warnings: string[];
  hashtagCount: number;
  brandFitScore: number;
  grammarOk: boolean;
}

export interface GeneratedCaption {
  id: string;
  caption: string;
  provider: string;
  cost: number;
  costCents?: number;
  tokensUsed?: number;
  generationTimeMs?: number;
  characterCount: number;
  validation: CaptionValidation;
  isApproved?: boolean;
  topic?: string;
  ok?: boolean;
  error?: string;
}

export async function generateCaption(topic: string, tone = 'casual', length = 'medium') {
  const { data } = await api.post('/ai/generate-caption', { topic, tone, length });
  return data.data as GeneratedCaption;
}

export async function batchGenerate(topics: string[], tone = 'casual') {
  const { data } = await api.post('/ai/batch-generate', { topicsText: topics.join('\n'), tone });
  return data.data as { results: GeneratedCaption[]; suggestedSlots: string[] };
}

export async function getBestTime() {
  const { data } = await api.get('/ai/best-time');
  return data.data as {
    suggestion: string;
    dayOfWeek: string | null;
    hourOfDay: number | null;
    engagement: number;
    suggestedAt?: string;
    source: string;
  };
}

export async function approveCaption(id: string) {
  const { data } = await api.post(`/ai/captions/${id}/approve`);
  return data.data as { id: string; caption: string; isApproved: boolean; bestTime: Awaited<ReturnType<typeof getBestTime>> };
}

export async function approveAndSchedule(id: string, scheduledTime?: string) {
  const { data } = await api.post(`/ai/captions/${id}/approve-schedule`, { scheduledTime });
  return data.data as { postId: string; caption: string; scheduledTime: string };
}

export async function getAiUsage() {
  const { data } = await api.get('/ai/usage');
  return data.data as {
    totalCaptions: number;
    totalCost: number;
    avgCost: number;
    costByProvider: Array<{ provider: string; captions: number; cost: number }>;
    recommendedProvider: string;
    overBudget: boolean;
    budgetCents: number;
    activeProvider: string;
  };
}

export async function getBrandGuidelines() {
  const { data } = await api.get('/ai/brand-guidelines');
  return data.data as Array<{
    id: string;
    name: string;
    voiceDescription: string;
    exampleCaption: string;
    tonePreference: string;
    hashtagDefaults: string;
    isActive: boolean;
  }>;
}

export async function saveBrandGuidelines(payload: {
  id?: string;
  name: string;
  voiceDescription?: string;
  exampleCaption?: string;
  tonePreference?: string;
  hashtagDefaults?: string;
  isActive?: boolean;
}) {
  const { data } = await api.put('/ai/brand-guidelines', payload);
  return data.data;
}
