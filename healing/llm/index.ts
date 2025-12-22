/**
 * LLM Integration
 *
 * Unified LLM interface with automatic fallback from local to cloud.
 * Priority: Ollama (free, local, GPU) → Anthropic (paid, cloud)
 */

import { LLMAnalysis, FailureReport } from '../triage/types';
import { OllamaClient } from './ollama';
import { AnthropicClient } from './anthropic';
import { determineLLMAvailability, findBestOllamaModel, LLMAvailability } from './gpu-detect';
import config from '../healing.config';

export type LLMProvider = 'ollama' | 'anthropic' | 'none';

interface LLMStats {
  provider: LLMProvider;
  calls: number;
  failures: number;
  avgLatency: number;
}

export class LLMManager {
  private ollamaClient: OllamaClient;
  private anthropicClient: AnthropicClient;
  private availability: LLMAvailability | null = null;
  private stats: LLMStats = {
    provider: 'none',
    calls: 0,
    failures: 0,
    avgLatency: 0,
  };

  constructor() {
    this.ollamaClient = new OllamaClient(
      config.llm.ollamaHost,
      config.llm.ollamaModels[0],
      config.llm.maxTokens,
      config.llm.temperature
    );

    this.anthropicClient = new AnthropicClient(
      process.env.ANTHROPIC_API_KEY,
      config.llm.anthropicModel,
      config.llm.maxTokens
    );
  }

  /**
   * Initialize LLM manager and detect available providers
   */
  async initialize(): Promise<LLMAvailability> {
    console.log('Detecting LLM availability...');

    this.availability = await determineLLMAvailability(
      config.llm.ollamaHost,
      config.llm.ollamaModels
    );

    console.log(`GPU: ${this.availability.gpu.available ? this.availability.gpu.name : 'Not detected'}`);
    console.log(`Ollama: ${this.availability.ollama.available ? `Available (${this.availability.ollama.models?.length || 0} models)` : 'Not available'}`);
    console.log(`Recommended: ${this.availability.recommended}`);
    console.log(`Reason: ${this.availability.reason}`);

    // Set the best available Ollama model
    if (this.availability.ollama.available && this.availability.ollama.models?.length) {
      const bestModel = findBestOllamaModel(
        this.availability.ollama.models,
        config.llm.ollamaModels
      );
      if (bestModel) {
        this.ollamaClient.setModel(bestModel);
        console.log(`Using Ollama model: ${bestModel}`);
      }
    }

    this.stats.provider = this.availability.recommended;

    return this.availability;
  }

  /**
   * Analyze a failure using the best available LLM
   */
  async analyzeFailure(failure: FailureReport): Promise<LLMAnalysis | null> {
    if (!this.availability) {
      await this.initialize();
    }

    const startTime = Date.now();
    this.stats.calls++;

    try {
      // Try Ollama first if recommended
      if (this.availability?.recommended === 'ollama') {
        const result = await this.tryOllama(failure);
        if (result) {
          this.updateLatency(startTime);
          return result;
        }
        console.log('Ollama failed, falling back to Anthropic...');
      }

      // Try Anthropic
      if (this.anthropicClient.isConfigured()) {
        const result = await this.tryAnthropic(failure);
        if (result) {
          this.updateLatency(startTime);
          return result;
        }
      }

      // No LLM available
      this.stats.failures++;
      console.log('No LLM available for analysis');
      return null;
    } catch (error) {
      this.stats.failures++;
      console.error('LLM analysis error:', error);
      return null;
    }
  }

  /**
   * Try Ollama analysis with timeout
   */
  private async tryOllama(failure: FailureReport): Promise<LLMAnalysis | null> {
    try {
      const isHealthy = await this.ollamaClient.isHealthy();
      if (!isHealthy) {
        return null;
      }

      return await this.ollamaClient.analyzeFailure(failure);
    } catch (error) {
      console.error('Ollama error:', error);
      return null;
    }
  }

  /**
   * Try Anthropic analysis
   */
  private async tryAnthropic(failure: FailureReport): Promise<LLMAnalysis | null> {
    try {
      return await this.anthropicClient.analyzeFailure(failure);
    } catch (error) {
      console.error('Anthropic error:', error);
      return null;
    }
  }

  /**
   * Update average latency
   */
  private updateLatency(startTime: number): void {
    const latency = Date.now() - startTime;
    this.stats.avgLatency =
      (this.stats.avgLatency * (this.stats.calls - 1) + latency) / this.stats.calls;
  }

  /**
   * Get current stats
   */
  getStats(): LLMStats {
    return { ...this.stats };
  }

  /**
   * Get recommended provider
   */
  getProvider(): LLMProvider {
    return this.availability?.recommended || 'none';
  }

  /**
   * Check if LLM is available
   */
  isAvailable(): boolean {
    return (
      this.availability?.ollama.available === true ||
      this.anthropicClient.isConfigured()
    );
  }
}

// Singleton instance
let llmManager: LLMManager | null = null;

export function getLLMManager(): LLMManager {
  if (!llmManager) {
    llmManager = new LLMManager();
  }
  return llmManager;
}

// Re-export components
export { OllamaClient } from './ollama';
export { AnthropicClient } from './anthropic';
export { determineLLMAvailability, detectNvidiaGPU, checkOllamaStatus } from './gpu-detect';
