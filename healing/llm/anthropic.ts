/**
 * Anthropic Client
 *
 * Cloud LLM fallback using Anthropic Claude API.
 * Used when local Ollama is not available.
 */

import { LLMAnalysis, FailureReport } from '../triage/types';
import { getSystemPrompt, getAnalysisPrompt, parseLLMResponse } from './prompts';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicRequest {
  model: string;
  max_tokens: number;
  system?: string;
  messages: AnthropicMessage[];
}

interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface AnalysisResult {
  rootCause: string;
  suggestedFix: string;
  confidence: number;
  codeChanges?: Array<{
    file: string;
    description: string;
    after?: string;
  }>;
  additionalNotes?: string;
}

export class AnthropicClient {
  private apiKey: string;
  private model: string;
  private maxTokens: number;
  private baseUrl: string = 'https://api.anthropic.com/v1';

  constructor(
    apiKey?: string,
    model: string = 'claude-3-haiku-20240307',
    maxTokens: number = 4096
  ) {
    this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || '';
    this.model = model;
    this.maxTokens = maxTokens;

    if (!this.apiKey) {
      console.warn('ANTHROPIC_API_KEY not set - Anthropic client will not work');
    }
  }

  /**
   * Generate completion from Anthropic API
   */
  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const request: AnthropicRequest = {
      model: this.model,
      max_tokens: this.maxTokens,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    };

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as AnthropicResponse;

    // Extract text from response
    const textContent = data.content.find((c) => c.type === 'text');
    return textContent?.text || '';
  }

  /**
   * Analyze a test failure
   */
  async analyzeFailure(failure: FailureReport): Promise<LLMAnalysis | null> {
    try {
      const systemPrompt = getSystemPrompt();
      const analysisPrompt = getAnalysisPrompt(failure);

      const response = await this.generate(analysisPrompt, systemPrompt);
      const parsed = parseLLMResponse<AnalysisResult>(response);

      if (!parsed) {
        return null;
      }

      return {
        provider: 'anthropic',
        model: this.model,
        rootCause: parsed.rootCause,
        suggestedFix: parsed.suggestedFix,
        confidence: parsed.confidence,
        codeChanges: parsed.codeChanges?.map((c) => ({
          file: c.file,
          description: c.description,
          after: c.after || '',
        })),
        additionalNotes: parsed.additionalNotes,
      };
    } catch (error) {
      console.error('Anthropic analysis failed:', error);
      return null;
    }
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Estimate cost for a request (rough estimate)
   */
  estimateCost(inputTokens: number, outputTokens: number): number {
    // Claude 3 Haiku pricing (as of late 2024)
    const inputCostPer1k = 0.00025;
    const outputCostPer1k = 0.00125;

    return (inputTokens / 1000) * inputCostPer1k + (outputTokens / 1000) * outputCostPer1k;
  }
}
