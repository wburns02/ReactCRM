# Troubleshooting & Self-Healing System

## Overview

The MAC Septic CRM includes an automated self-healing system that:

1. **Monitors** application health via Playwright E2E tests
2. **Detects** failures and classifies them by severity
3. **Analyzes** root causes using LLM (Ollama local or Anthropic cloud)
4. **Applies** safe automatic fixes (Class A)
5. **Creates** PRs for risky fixes requiring review (Class B/C)
6. **Reports** on system health with detailed artifacts

## Quick Start

### Run Self-Healing Manually

```bash
# Full healing run
npm run heal

# Dry run (no fixes applied)
npm run heal:dry-run

# Quick health check only
npm run heal:quick
```

### Using Shell Scripts

```bash
# Linux/Mac
./scripts/self_heal_run.sh

# Windows PowerShell
.\scripts\self_heal_run.ps1

# With options
./scripts/self_heal_run.sh --dry-run --projects=health
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Self-Healing Orchestrator                     │
│                     (healing/orchestrator.ts)                    │
└──────────────────────────────┬──────────────────────────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
         ▼                     ▼                     ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   Playwright    │   │   Triage Engine │   │   LLM Manager   │
│   Test Runner   │   │                 │   │                 │
├─────────────────┤   ├─────────────────┤   ├─────────────────┤
│ - health/       │   │ - Pattern match │   │ - GPU detection │
│ - contracts/    │   │ - Classification│   │ - Ollama client │
│ - modules/      │   │ - Prioritization│   │ - Anthropic API │
│ - security/     │   │                 │   │                 │
└────────┬────────┘   └────────┬────────┘   └────────┬────────┘
         │                     │                     │
         │                     ▼                     │
         │            ┌─────────────────┐            │
         │            │   Fix Playbooks │            │
         │            ├─────────────────┤            │
         │            │ Class A (Safe): │            │
         │            │ - restart-backend│           │
         │            │ - clear-session │            │
         │            │ - refresh-tokens│            │
         │            │                 │            │
         │            │ Class B/C (PR): │            │
         │            │ - code changes  │            │
         │            │ - config updates│            │
         └────────────┴────────┬────────┴────────────┘
                               │
                               ▼
                    ┌─────────────────┐
                    │  GitHub Actions │
                    │  (CI/CD)        │
                    ├─────────────────┤
                    │ - Scheduled runs│
                    │ - PR creation   │
                    │ - Issue filing  │
                    └─────────────────┘
```

---

## Failure Classification

### Class A: Safe Auto-Fix

These fixes are automatically applied without human review:

| Fix | Trigger | Action |
|-----|---------|--------|
| Restart Backend | Backend 500 errors | Trigger Railway redeploy |
| Clear Session | Auth failures | Clear test session storage |
| Refresh Tokens | Token expired | Regenerate auth tokens |

### Class B: Review Required (Auto-PR)

These fixes require human review but are auto-submitted as PRs:

| Fix | Trigger | Action |
|-----|---------|--------|
| Update Selectors | Element not found | Create PR with new selectors |
| Fix API Routes | 404 errors | Create PR with route fixes |
| Update Test Data | Assertion failures | Create PR with updated fixtures |

### Class C: Manual Investigation

These issues require human investigation:

| Issue | Trigger | Action |
|-------|---------|--------|
| Unknown Error | Unclassified failure | Create GitHub issue |
| Security Issue | Security test failure | Alert + manual review |
| Performance | Timeout patterns | Create issue for investigation |

---

## Scheduled Runs

The self-healing system runs automatically via GitHub Actions:

### Default Schedule: Every 12 Hours

```yaml
# .github/workflows/healing.yml
schedule:
  - cron: '0 6,18 * * *'  # 6 AM and 6 PM UTC
```

### Override to 24 Hours

Set the `HEAL_SCHEDULE` secret in GitHub:

```
HEAL_SCHEDULE=24
```

Or modify the cron expression:

```yaml
schedule:
  - cron: '0 6 * * *'  # Once daily at 6 AM UTC
```

### Manual Trigger

Trigger manually from GitHub Actions:

1. Go to **Actions** tab
2. Select **Self-Healing System**
3. Click **Run workflow**
4. Configure options:
   - Dry run: Yes/No
   - Skip LLM: Yes/No
   - Projects: health,contracts,modules
   - Max fixes: 3

---

## Artifact Collection

### Directory Structure

```
healing-results/
├── run-20251223-143052-abc12345/
│   ├── test-output.json         # Playwright test results
│   ├── healing-output.log       # Orchestrator logs
│   ├── healing-summary.json     # Fix summary
│   ├── summary.md               # Human-readable report
│   └── test-rerun-output.json   # Post-fix test results
│
test-results/
├── screenshots/                  # Failure screenshots
├── traces/                       # Playwright traces
└── videos/                       # Test recordings
```

### Playwright Artifacts

Configured in `playwright.config.ts`:

```typescript
use: {
  // Capture screenshots on failure
  screenshot: 'only-on-failure',

  // Capture video on failure
  video: 'retain-on-failure',

  // Capture trace for debugging
  trace: 'retain-on-failure',
}
```

### Viewing Traces

```bash
# Open trace viewer
npx playwright show-trace test-results/trace.zip

# Or use the web viewer
npx playwright show-report
```

---

## LLM Integration

### GPU Detection (RTX 5090 Support)

The system automatically detects GPU availability via `scripts/llm_client.py`:

```python
# Detection flow:
# 1. Check nvidia-smi for GPU presence
# 2. Verify CUDA drivers installed
# 3. Check VRAM >= 24GB for RTX 5090
# 4. Test Ollama endpoint connectivity
```

Supported GPUs:
- **RTX 5090** (48GB VRAM) - Full codellama:34b support
- **RTX 4090** (24GB VRAM) - codellama:34b with quantization
- **RTX 3090** (24GB VRAM) - codellama:13b recommended
- **RTX 3080** (10GB VRAM) - codellama:7b or llama3.2

### LLM Fallback Chain

1. **Ollama (Local)** - Free, private, uses GPU
   - Model: `codellama:34b` (RTX 5090) or `codellama:13b`
   - URL: `http://localhost:11434`
   - **ALWAYS tried first** - no data leaves machine

2. **Anthropic (Cloud)** - Fallback when Ollama unavailable
   - Model: `claude-3-5-sonnet-20241022`
   - Requires: `ANTHROPIC_API_KEY`
   - **Only used if local LLM unavailable**

### Sensitive Data Redaction

**CRITICAL**: Before ANY LLM query, data is redacted via `scripts/redact.py`:

```python
from scripts.redact import redact_sensitive_data

# Before sending to LLM
safe_prompt = redact_sensitive_data(error_log)

# Redacts:
# - API keys → [REDACTED_API_KEY]
# - Passwords → [REDACTED_PASSWORD]
# - JWT tokens → [REDACTED_JWT]
# - Database URLs → [REDACTED_DB_URL]
# - Email addresses → [REDACTED_EMAIL]
# - Phone numbers → [REDACTED_PHONE]
# - IP addresses → [REDACTED_IP]
# - Credit cards → [REDACTED_CC]
# - SSNs → [REDACTED_SSN]
# - AWS keys → [REDACTED_AWS_KEY]
# - Twilio credentials → [REDACTED_TWILIO]
```

Allowlisted (NOT redacted):
- `localhost`, `127.0.0.1`
- `example.com`, `test@example.com`
- Already redacted `[REDACTED_*]` tokens

### Starting Ollama with RTX 5090

```bash
# Install Ollama (Linux)
curl -fsSL https://ollama.com/install.sh | sh

# Windows - download from https://ollama.com/download

# Pull codellama for code analysis
ollama pull codellama:34b    # RTX 5090 (48GB)
ollama pull codellama:13b    # RTX 4090/3090 (24GB)
ollama pull codellama:7b     # RTX 3080 (10GB)

# Start server (uses GPU automatically)
ollama serve

# Verify GPU usage
nvidia-smi  # Should show ollama using VRAM
```

### LLM Environment Variables

```bash
# Required for Anthropic fallback
export ANTHROPIC_API_KEY=sk-ant-...

# Optional: Force fallback only (skip local)
export LLM_FALLBACK_ONLY=true

# Optional: Custom Ollama host
export OLLAMA_HOST=http://localhost:11434

# Optional: Specific model
export OLLAMA_MODEL=codellama:34b
```

---

## Guardrails & Safety

### Infinite Loop Prevention

```typescript
// healing/healing.config.ts
export default {
  maxFixAttemptsPerFailure: 2,   // Max retries per failure
  maxFixesPerRun: 3,             // Max total fixes per run
  cooldownBetweenFixes: 5000,    // 5 second cooldown
  maxRunDuration: 30 * 60 * 1000 // 30 minute timeout
}
```

### Fix Validation

Each fix must pass validation before application:

1. **Pre-flight checks** - Verify system state
2. **Dry run** - Simulate fix without applying
3. **Apply** - Execute fix
4. **Verify** - Run targeted tests
5. **Rollback** - Revert if verification fails

### Approval Gates

Class B/C fixes require:

- PR creation (not direct commit)
- CI tests must pass
- Human review and approval
- No force merges to main

---

## Troubleshooting the Self-Healer

### Common Issues

#### "No GPU detected"

```bash
# Check NVIDIA driver
nvidia-smi

# Check CUDA
nvcc --version

# Fallback: Use CPU mode
OLLAMA_NUM_GPU=0 ollama serve
```

#### "Ollama not responding"

```bash
# Check if running
curl http://localhost:11434/api/tags

# Restart Ollama
systemctl restart ollama  # Linux
ollama serve              # Manual start
```

#### "Anthropic API error"

```bash
# Verify API key
echo $ANTHROPIC_API_KEY

# Test API
curl https://api.anthropic.com/v1/models \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2024-01-01"
```

#### "Tests timing out"

```typescript
// Increase timeouts in playwright.config.ts
export default defineConfig({
  timeout: 60000,        // Per-test timeout
  expect: {
    timeout: 10000,      // Assertion timeout
  },
});
```

### Debug Mode

Enable verbose logging:

```bash
# Set debug environment
DEBUG=heal:* npm run heal

# Or in PowerShell
$env:DEBUG="heal:*"; npm run heal
```

### Manual Investigation

1. Check `healing-results/run-*/healing-output.log`
2. Review screenshots in `test-results/`
3. Open trace: `npx playwright show-trace <trace.zip>`
4. Check GitHub Actions logs

---

## Configuration Reference

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HEAL_DRY_RUN` | `false` | Run without applying fixes |
| `HEAL_SKIP_LLM` | `false` | Skip LLM analysis |
| `HEAL_PROJECTS` | `health,contracts,modules` | Test projects to run |
| `HEAL_MAX_FIXES` | `3` | Max fixes per run |
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama server URL |
| `ANTHROPIC_API_KEY` | - | Required for cloud LLM |
| `BASE_URL` | `https://react.ecbtx.com/app` | Frontend URL |
| `API_URL` | Railway URL | Backend API URL |

### Config File

`healing/healing.config.ts`:

```typescript
export default {
  // Test execution
  projects: ['health', 'contracts', 'modules'],
  timeout: 30000,
  retries: 1,

  // Fix limits
  maxFixAttemptsPerFailure: 2,
  maxFixesPerRun: 3,
  cooldownBetweenFixes: 5000,

  // LLM settings
  llm: {
    preferLocal: true,
    ollamaModel: 'llama3.2',
    anthropicModel: 'claude-3-5-sonnet-20241022',
    maxTokens: 4096,
  },

  // Artifacts
  artifacts: {
    screenshots: true,
    traces: true,
    videos: true,
    retentionDays: 7,
  },
}
```

---

## Integration with CI/CD

### GitHub Actions Workflow

The healing workflow (`.github/workflows/healing.yml`) includes:

1. **Scheduled trigger** - Every 12 hours
2. **Manual trigger** - Via workflow_dispatch
3. **Deployment trigger** - After new deployments

### PR Automation

For Class B fixes, the system:

1. Creates a new branch: `heal/fix-<type>-<timestamp>`
2. Commits the fix with description
3. Opens PR with:
   - Summary of the failure
   - Applied fix details
   - Test results before/after
4. Requests review from maintainers

### Issue Automation

For Class C issues:

1. Creates GitHub issue
2. Labels: `self-heal`, `needs-investigation`
3. Includes:
   - Failure details
   - Screenshots/traces
   - Suggested investigation steps

---

## Metrics & Monitoring

### Health Score

The system tracks overall health:

```
Health Score = (Passed / Total) * 100

HEALTHY:  >= 95%
DEGRADED: 80-95%
FAILING:  < 80%
```

### Tracked Metrics

- Test pass rate over time
- Mean time to recovery (MTTR)
- Fix success rate
- LLM usage (tokens/cost)
- Common failure patterns

### Viewing Metrics

```bash
# View latest run summary
cat healing-results/latest.json | jq .

# View historical runs
ls healing-results/run-* | tail -10
```

---

## Related Documentation

- [Security Policy](../SECURITY.md)
- [Architecture](../healing/ARCHITECTURE.md)
- [Runbook](../healing/RUNBOOK.md)
- [Playwright Tests](../e2e/README.md)
