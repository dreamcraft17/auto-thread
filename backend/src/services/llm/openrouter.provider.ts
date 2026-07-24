import { env } from '../../config/env';
import { ILLMProvider } from './types';

export class OpenRouterProvider implements ILLMProvider {
  async generateCaption(prompt: string): Promise<{ text: string; tokensUsed: number }> {
    if (!env.openrouterApiKey) {
      throw new Error('OPENROUTER_API_KEY is required for LLM_PROVIDER=openrouter');
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': env.publicBaseUrl,
        'X-Title': 'Threads Automation DN Tech',
      },
      body: JSON.stringify({
        model: env.openrouterModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
      }),
    });

    const data = (await response.json()) as {
      error?: { message?: string };
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { total_tokens?: number };
    };

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${data.error?.message || response.statusText}`);
    }

    const text = data.choices?.[0]?.message?.content?.trim() || '';
    const tokensUsed = data.usage?.total_tokens || Math.ceil((prompt.length + text.length) / 4);
    return { text, tokensUsed };
  }

  getProviderName() {
    return 'openrouter';
  }

  estimateCost(tokensUsed: number) {
    return tokensUsed * 0.000005;
  }
}
