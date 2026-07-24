import { env } from '../../config/env';
import { ILLMProvider } from './types';

export class CodexProvider implements ILLMProvider {
  async generateCaption(prompt: string): Promise<{ text: string; tokensUsed: number }> {
    if (!env.githubApiKey) {
      throw new Error('GITHUB_API_KEY (or OPENAI_API_KEY) is required for LLM_PROVIDER=codex');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.githubApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.githubModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    const data = (await response.json()) as {
      error?: { message?: string };
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { total_tokens?: number };
    };

    if (!response.ok) {
      throw new Error(`Codex API error: ${data.error?.message || response.statusText}`);
    }

    const text = data.choices?.[0]?.message?.content?.trim() || '';
    const tokensUsed = data.usage?.total_tokens || Math.ceil((prompt.length + text.length) / 4);
    return { text, tokensUsed };
  }

  getProviderName() {
    return 'codex';
  }

  estimateCost(tokensUsed: number) {
    return tokensUsed * 0.000015;
  }
}
