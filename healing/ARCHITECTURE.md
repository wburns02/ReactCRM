# A+++ Self-Healing Troubleshooting System

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           SCHEDULED TRIGGERS                                     │
│                                                                                  │
│    GitHub Actions Cron          Manual Dispatch          Webhook Trigger         │
│    ┌─────────────┐              ┌─────────────┐          ┌─────────────┐         │
│    │ Every 12h   │              │  workflow   │          │  PR/Push    │         │
│    │ Every 24h   │              │  dispatch   │          │  Events     │         │
│    └──────┬──────┘              └──────┬──────┘          └──────┬──────┘         │
└───────────┼─────────────────────────────┼─────────────────────────┼──────────────┘
            │                             │                         │
            └─────────────────────────────┼─────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              REPAIR ORCHESTRATOR                                 │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                        healing/orchestrator.ts                           │   │
│   │                                                                          │   │
│   │  1. Load configuration (healing.config.ts)                               │   │
│   │  2. Initialize Playwright MCP connection                                 │   │
│   │  3. Run test suite via Playwright                                        │   │
│   │  4. Collect failures → Triage system                                     │   │
│   │  5. Generate repair actions                                              │   │
│   │  6. Execute safe fixes OR create PRs                                     │   │
│   │  7. Report results                                                       │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                          │                                       │
│                                          ▼                                       │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                         TRIAGE SYSTEM                                    │   │
│   │                                                                          │   │
│   │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                │   │
│   │  │  Auth Issues  │  │  API Issues   │  │  UI Issues    │                │   │
│   │  │  - Session    │  │  - 4xx/5xx    │  │  - Selectors  │                │   │
│   │  │  - Token exp  │  │  - Timeout    │  │  - Loading    │                │   │
│   │  │  - CORS       │  │  - Schema     │  │  - A11y       │                │   │
│   │  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘                │   │
│   │          │                  │                  │                         │   │
│   │          └──────────────────┼──────────────────┘                         │   │
│   │                             │                                            │   │
│   │                             ▼                                            │   │
│   │                    FAILURE CLASSIFICATION                                │   │
│   │                                                                          │   │
│   │   ┌─────────────────────────────────────────────────────────────────┐   │   │
│   │   │                    FailureReport                                 │   │   │
│   │   │  - testName: string                                              │   │   │
│   │   │  - errorMessage: string                                          │   │   │
│   │   │  - category: 'auth' | 'api' | 'ui' | 'network' | 'unknown'       │   │   │
│   │   │  - severity: 'critical' | 'high' | 'medium' | 'low'              │   │   │
│   │   │  - autoFixable: boolean                                          │   │   │
│   │   │  - screenshot?: string (base64)                                  │   │   │
│   │   │  - trace?: string (path)                                         │   │   │
│   │   │  - suggestedFix?: PlaybookAction                                 │   │   │
│   │   └─────────────────────────────────────────────────────────────────┘   │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                          │                                       │
│                                          ▼                                       │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                         LLM ANALYSIS                                     │   │
│   │                                                                          │   │
│   │   ┌─────────────────────────────────────────────────────────────────┐   │   │
│   │   │                   GPU Detection (RTX 5090)                       │   │   │
│   │   │                                                                  │   │   │
│   │   │   if (hasNvidiaGPU && ollamaAvailable) {                        │   │   │
│   │   │       → Use Ollama (llama3.3, deepseek-r1, qwen2.5-coder)       │   │   │
│   │   │       → FREE, LOCAL, FAST                                        │   │   │
│   │   │   } else {                                                       │   │   │
│   │   │       → Fallback to Anthropic API (claude-3-haiku)              │   │   │
│   │   │       → PAID, CLOUD, RELIABLE                                    │   │   │
│   │   │   }                                                              │   │   │
│   │   └─────────────────────────────────────────────────────────────────┘   │   │
│   │                                                                          │   │
│   │   LLM Tasks:                                                             │   │
│   │   - Analyze failure patterns                                             │   │
│   │   - Suggest root cause                                                   │   │
│   │   - Recommend fix strategy                                               │   │
│   │   - Generate code patches (for PR)                                       │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                          │                                       │
└──────────────────────────────────────────┼──────────────────────────────────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              FIX EXECUTION                                       │
│                                                                                  │
│   ┌─────────────────────────────────────┬─────────────────────────────────────┐ │
│   │         SAFE AUTO-FIX               │       APPROVAL REQUIRED             │ │
│   │         (Class A)                   │       (Class B/C)                   │ │
│   │                                     │                                     │ │
│   │  Executed immediately:              │  Creates PR for review:             │ │
│   │  ─────────────────────              │  ─────────────────────              │ │
│   │  • Restart backend service          │  • Schema migrations                │ │
│   │  • Clear session/cache              │  • API endpoint changes             │ │
│   │  • Refresh auth tokens              │  • Component modifications          │ │
│   │  • Reset test data                  │  • Config file changes              │ │
│   │  • Railway redeploy                 │  • Dependency updates               │ │
│   │  • Toggle feature flags             │  • Security-sensitive changes       │ │
│   │                                     │                                     │ │
│   │  ┌─────────────────────┐            │  ┌─────────────────────┐            │ │
│   │  │ playbooks/safe/*.ts │            │  │ Creates GitHub PR   │            │ │
│   │  └─────────────────────┘            │  │ with:               │            │ │
│   │                                     │  │ - Diff preview      │            │ │
│   │                                     │  │ - Test results      │            │ │
│   │                                     │  │ - LLM explanation   │            │ │
│   │                                     │  │ - Risk assessment   │            │ │
│   │                                     │  └─────────────────────┘            │ │
│   └─────────────────────────────────────┴─────────────────────────────────────┘ │
│                                          │                                       │
└──────────────────────────────────────────┼──────────────────────────────────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              REPORTING                                           │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                          │   │
│   │  GitHub Actions Summary     Slack/Discord Webhook     JSON Report        │   │
│   │  ────────────────────────   ─────────────────────     ───────────        │   │
│   │  • Test results matrix      • Critical alerts         • Full details     │   │
│   │  • Auto-fix actions taken   • Fix notifications       • Timestamps       │   │
│   │  • PRs created              • PR links                • Metrics          │   │
│   │  • Recommendations          • Status updates          • Artifacts        │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## File Structure

```
ReactCRM/
├── healing/
│   ├── ARCHITECTURE.md              # This file
│   │
│   ├── orchestrator.ts              # Main entry point - coordinates healing
│   ├── healing.config.ts            # Configuration (URLs, schedules, limits)
│   │
│   ├── triage/
│   │   ├── index.ts                 # Triage system entry
│   │   ├── classifier.ts            # Failure classification logic
│   │   ├── patterns.ts              # Known failure patterns
│   │   └── types.ts                 # TypeScript interfaces
│   │
│   ├── llm/
│   │   ├── index.ts                 # LLM integration entry
│   │   ├── ollama.ts                # Local Ollama client
│   │   ├── anthropic.ts             # Anthropic API client
│   │   ├── prompts.ts               # Analysis prompts
│   │   └── gpu-detect.ts            # GPU/Ollama availability check
│   │
│   ├── playbooks/
│   │   ├── index.ts                 # Playbook registry
│   │   ├── types.ts                 # Playbook type definitions
│   │   ├── safe/
│   │   │   ├── restart-backend.ts   # Restart Railway deployment
│   │   │   ├── clear-session.ts     # Clear auth session/cookies
│   │   │   ├── refresh-tokens.ts    # Refresh expired tokens
│   │   │   ├── reset-test-data.ts   # Reset test database state
│   │   │   └── toggle-feature.ts    # Toggle feature flags
│   │   └── approval-required/
│   │       ├── schema-migration.ts  # Database schema changes
│   │       ├── api-change.ts        # API endpoint modifications
│   │       └── component-fix.ts     # React component fixes
│   │
│   ├── github/
│   │   ├── pr-creator.ts            # Create PRs for fixes
│   │   ├── issue-reporter.ts        # Create issues for failures
│   │   └── actions-summary.ts       # GitHub Actions summary generation
│   │
│   ├── reporters/
│   │   ├── index.ts                 # Reporter registry
│   │   ├── console.ts               # Console output
│   │   ├── json.ts                  # JSON file output
│   │   └── webhook.ts               # Slack/Discord notifications
│   │
│   └── tests/
│       ├── orchestrator.test.ts     # Orchestrator tests
│       ├── triage.test.ts           # Triage system tests
│       └── playbooks.test.ts        # Playbook tests
│
├── .github/
│   └── workflows/
│       └── healing.yml              # Scheduled healing workflow
│
└── e2e/                             # Existing Playwright tests (unchanged)
    ├── auth.setup.ts
    ├── health/
    ├── contracts/
    └── modules/
```

## Data Flow

```
1. TRIGGER
   ├── Cron (12h/24h)
   ├── Manual dispatch
   └── Push/PR event

2. ORCHESTRATOR INIT
   ├── Load healing.config.ts
   ├── Initialize Playwright MCP
   └── Prepare test environment

3. TEST EXECUTION
   ├── Run: npx playwright test --project=health
   ├── Run: npx playwright test --project=contracts
   ├── Run: npx playwright test --project=modules
   └── Collect results + artifacts

4. TRIAGE
   ├── Parse test results JSON
   ├── Classify each failure
   ├── Match against known patterns
   └── Determine auto-fix eligibility

5. LLM ANALYSIS (if needed)
   ├── Check GPU/Ollama availability
   ├── Send failure context to LLM
   ├── Receive analysis + recommendations
   └── Validate suggested fixes

6. EXECUTE FIXES
   ├── Class A (safe) → Execute immediately
   └── Class B/C (risky) → Create PR

7. REPORT
   ├── GitHub Actions summary
   ├── Webhook notifications
   └── JSON artifacts
```

## Fix Classification

| Class | Risk Level | Auto-Execute | Examples |
|-------|------------|--------------|----------|
| **A** | Safe | Yes | Restart services, clear cache, refresh tokens |
| **B** | Moderate | No (PR) | Config changes, test data updates |
| **C** | High | No (PR + Review) | Schema changes, API modifications, component fixes |

## Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...      # Fallback LLM
GITHUB_TOKEN=ghp_...              # PR creation
RAILWAY_TOKEN=...                 # Backend restart

# Optional
OLLAMA_HOST=http://localhost:11434  # Local LLM (default)
SLACK_WEBHOOK_URL=https://...     # Notifications
DISCORD_WEBHOOK_URL=https://...   # Notifications

# Test credentials
TEST_EMAIL=will@macseptic.com
TEST_PASSWORD=...
```

## LLM Strategy

```
Priority Order:
1. Ollama (local, free) - if GPU detected
   - Model: llama3.3:70b or deepseek-r1:32b
   - Fastest, no API costs

2. Anthropic API (cloud, paid) - fallback
   - Model: claude-3-haiku (cheapest)
   - Reliable, always available
```

## Safety Guarantees

1. **No destructive database operations** without PR approval
2. **No production code changes** without PR approval
3. **All fixes logged** with timestamps and rationale
4. **Dry-run mode** available for testing
5. **Rate limits** on auto-fix execution (max 3 per run)
6. **Human override** always available via GitHub
