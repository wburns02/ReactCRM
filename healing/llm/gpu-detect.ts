/**
 * GPU and Ollama Detection
 *
 * Detects NVIDIA GPU availability and Ollama service status.
 * Used to determine whether to use local LLM or cloud fallback.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GPUInfo {
  available: boolean;
  name?: string;
  memory?: string;
  driver?: string;
}

export interface OllamaStatus {
  available: boolean;
  version?: string;
  models?: string[];
  host: string;
}

export interface LLMAvailability {
  gpu: GPUInfo;
  ollama: OllamaStatus;
  recommended: 'ollama' | 'anthropic';
  reason: string;
}

/**
 * Detect NVIDIA GPU using nvidia-smi
 */
export async function detectNvidiaGPU(): Promise<GPUInfo> {
  try {
    const { stdout } = await execAsync(
      'nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader,nounits'
    );

    const [name, memory, driver] = stdout.trim().split(', ');

    return {
      available: true,
      name: name?.trim(),
      memory: memory ? `${memory.trim()} MB` : undefined,
      driver: driver?.trim(),
    };
  } catch {
    return { available: false };
  }
}

/**
 * Check Ollama service availability
 */
export async function checkOllamaStatus(
  host: string = 'http://localhost:11434'
): Promise<OllamaStatus> {
  try {
    const response = await fetch(`${host}/api/version`);

    if (!response.ok) {
      return { available: false, host };
    }

    const versionData = (await response.json()) as { version?: string };

    // Get available models
    const modelsResponse = await fetch(`${host}/api/tags`);
    let models: string[] = [];

    if (modelsResponse.ok) {
      const modelsData = (await modelsResponse.json()) as {
        models?: Array<{ name: string }>;
      };
      models = modelsData.models?.map((m) => m.name) || [];
    }

    return {
      available: true,
      version: versionData.version,
      models,
      host,
    };
  } catch {
    return { available: false, host };
  }
}

/**
 * Determine recommended LLM provider
 */
export async function determineLLMAvailability(
  ollamaHost: string = 'http://localhost:11434',
  preferredModels: string[] = ['llama3.3:70b', 'deepseek-r1:32b', 'qwen2.5-coder:32b']
): Promise<LLMAvailability> {
  const [gpu, ollama] = await Promise.all([detectNvidiaGPU(), checkOllamaStatus(ollamaHost)]);

  // Determine recommendation
  if (ollama.available && ollama.models && ollama.models.length > 0) {
    // Check if any preferred model is available
    const hasPreferredModel = preferredModels.some((preferred) =>
      ollama.models?.some((available) => available.includes(preferred.split(':')[0]))
    );

    if (hasPreferredModel) {
      return {
        gpu,
        ollama,
        recommended: 'ollama',
        reason: `Ollama available with ${ollama.models.length} model(s)${gpu.available ? ` on ${gpu.name}` : ''}`,
      };
    }
  }

  if (ollama.available) {
    return {
      gpu,
      ollama,
      recommended: 'ollama',
      reason: 'Ollama available but no preferred models installed. Consider running: ollama pull llama3.3:70b',
    };
  }

  return {
    gpu,
    ollama,
    recommended: 'anthropic',
    reason: ollama.available
      ? 'Ollama available but no models. Using Anthropic API fallback.'
      : 'Ollama not available. Using Anthropic API fallback.',
  };
}

/**
 * Find the best available Ollama model from preferences
 */
export function findBestOllamaModel(
  availableModels: string[],
  preferredModels: string[]
): string | undefined {
  for (const preferred of preferredModels) {
    const baseName = preferred.split(':')[0];
    const match = availableModels.find((m) => m.includes(baseName));
    if (match) {
      return match;
    }
  }
  // Return first available model as fallback
  return availableModels[0];
}
