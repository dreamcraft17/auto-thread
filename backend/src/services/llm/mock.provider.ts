import { ILLMProvider } from './types';

/** Local/dev/test provider — no external API. */
export class MockProvider implements ILLMProvider {
  async generateCaption(prompt: string): Promise<{ text: string; tokensUsed: number }> {
    const topicMatch = prompt.match(/Topic:\s*(.+)/i);
    const topic = topicMatch?.[1]?.trim().slice(0, 80) || 'our latest update';
    const text =
      `🚀 Quick take on ${topic}. We keep shipping practical wins and sharing what we learn along the way. What would you try first?\n\n#dntech #buildinpublic #threads`.slice(
        0,
        500
      );
    return { text, tokensUsed: Math.ceil((prompt.length + text.length) / 4) };
  }

  getProviderName() {
    return 'mock';
  }

  estimateCost(tokensUsed: number) {
    return tokensUsed * 0.000001;
  }
}
