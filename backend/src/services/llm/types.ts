export interface ILLMProvider {
  generateCaption(prompt: string): Promise<{ text: string; tokensUsed: number }>;
  getProviderName(): string;
  estimateCost(tokensUsed: number): number;
}

export type CaptionTone = 'casual' | 'professional' | 'DN-culture';
export type CaptionLength = 'short' | 'medium';
