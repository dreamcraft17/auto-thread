import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env';
import { ILLMProvider } from './types';

export class ClaudeProvider implements ILLMProvider {
  private client: Anthropic;

  constructor() {
    if (!env.anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY is required for LLM_PROVIDER=claude');
    }
    this.client = new Anthropic({ apiKey: env.anthropicApiKey });
  }

  async generateCaption(prompt: string): Promise<{ text: string; tokensUsed: number }> {
    const message = await this.client.messages.create({
      model: env.anthropicModel,
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content
      .filter((block) => block.type === 'text')
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('')
      .trim();

    const tokensUsed =
      (message.usage?.input_tokens || 0) + (message.usage?.output_tokens || 0) ||
      Math.ceil(prompt.length / 4) + Math.ceil(text.length / 4);

    return { text, tokensUsed };
  }

  getProviderName() {
    return 'claude';
  }

  estimateCost(tokensUsed: number) {
    return (tokensUsed * 0.003) / 1000;
  }
}
