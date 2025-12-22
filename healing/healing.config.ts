/**
 * Self-Healing System Configuration
 *
 * This file defines all configuration for the A+++ self-healing troubleshooting system.
 */

export interface HealingConfig {
  // Target URLs
  targets: {
    frontend: string;
    api: string;
  };

  // Test execution
  tests: {
    projects: string[];
    timeout: number;
    retries: number;
    parallel: boolean;
  };

  // LLM configuration
  llm: {
    ollamaHost: string;
    ollamaModels: string[];
    anthropicModel: string;
    maxTokens: number;
    temperature: number;
  };

  // Auto-fix limits
  autoFix: {
    enabled: boolean;
    maxPerRun: number;
    dryRun: boolean;
    allowedPlaybooks: string[];
  };

  // Reporting
  reporting: {
    githubSummary: boolean;
    slackWebhook?: string;
    discordWebhook?: string;
    jsonOutput: string;
  };

  // Railway deployment
  railway: {
    projectId?: string;
    serviceId?: string;
    restartEnabled: boolean;
  };
}

const config: HealingConfig = {
  targets: {
    frontend: process.env.BASE_URL || 'https://react.ecbtx.com/app',
    api: process.env.API_URL || 'https://react-crm-api-production.up.railway.app',
  },

  tests: {
    projects: ['health', 'contracts', 'modules'],
    timeout: 60000, // 60 seconds per test
    retries: 2,
    parallel: false, // Sequential for debugging
  },

  llm: {
    ollamaHost: process.env.OLLAMA_HOST || 'http://localhost:11434',
    ollamaModels: [
      'llama3.3:70b',      // Best overall
      'deepseek-r1:32b',   // Great for code
      'qwen2.5-coder:32b', // Code-focused
      'llama3.2:latest',   // Fallback smaller model
    ],
    anthropicModel: 'claude-3-haiku-20240307',
    maxTokens: 4096,
    temperature: 0.3,
  },

  autoFix: {
    enabled: true,
    maxPerRun: 3,
    dryRun: process.env.DRY_RUN === 'true',
    allowedPlaybooks: [
      'restart-backend',
      'clear-session',
      'refresh-tokens',
      'reset-test-data',
      'toggle-feature',
    ],
  },

  reporting: {
    githubSummary: true,
    slackWebhook: process.env.SLACK_WEBHOOK_URL,
    discordWebhook: process.env.DISCORD_WEBHOOK_URL,
    jsonOutput: 'healing-results/report.json',
  },

  railway: {
    projectId: process.env.RAILWAY_PROJECT_ID,
    serviceId: process.env.RAILWAY_SERVICE_ID,
    restartEnabled: process.env.RAILWAY_TOKEN !== undefined,
  },
};

export default config;

// Environment variable validation
export function validateEnvironment(): { valid: boolean; missing: string[] } {
  const required: string[] = [];
  const optional = [
    'ANTHROPIC_API_KEY',
    'GITHUB_TOKEN',
    'RAILWAY_TOKEN',
    'OLLAMA_HOST',
    'SLACK_WEBHOOK_URL',
    'DISCORD_WEBHOOK_URL',
    'TEST_EMAIL',
    'TEST_PASSWORD',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
  }

  const configured = optional.filter((key) => process.env[key]);
  console.log('Configured optional variables:', configured);

  return {
    valid: missing.length === 0,
    missing,
  };
}
