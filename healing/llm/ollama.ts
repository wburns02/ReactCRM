/**
 * Ollama Client
 *
 * Local LLM integration using Ollama.
 * Preferred for free, fast, GPU-accelerated analysis.
 */

import { LLMAnalysis, FailureReport } from '../triage/types';
import { getSystemPrompt, getAnalysisPrompt, parseLLMResponse } from './prompts';

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    num_predict?: number;
  };
}

interface OllamaGenerateResponse {
  model: string;
  response: string;
  done: boolean;
  total_duration?: number;
  eval_count?: number;
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

export class OllamaClient {
  private host: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor(
    host: string = 'http://localhost:11434',
    model: string = 'llama3.3:70b',
    maxTokens: number = 4096,
    temperature: number = 0.3
  ) {
    this.host = host;
    this.model = model;
    this.maxTokens = maxTokens;
    this.temperature = temperature;
  }

  /**
   * Generate completion from Ollama
   */
  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    const request: OllamaGenerateRequest = {
      model: this.model,
      prompt,
      system: systemPrompt,
      stream: false,
      options: {
        temperature: this.temperature,
        num_predict: this.maxTokens,
      },
    };

    const response = await fetch(`${this.host}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as OllamaGenerateResponse;
    return data.response;
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
        provider: 'ollama',
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
      console.error('Ollama analysis failed:', error);
      return null;
    }
  }

  /**
   * Check if Ollama is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.host}/api/version`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Set the model to use
   */
  setModel(model: string): void {
    this.model = model;
  }
}
