# Self-Healing System Runbook

## Quick Start

### Local Run

```bash
# Full healing run (will auto-fix safe issues)
npx tsx healing/orchestrator.ts

# Dry run (no fixes applied)
npx tsx healing/orchestrator.ts --dry-run

# Skip LLM analysis (faster, pattern-matching only)
npx tsx healing/orchestrator.ts --skip-llm

# Run specific projects only
npx tsx healing/orchestrator.ts --projects=health,contracts

# Verbose output
npx tsx healing/orchestrator.ts --verbose
```

### GitHub Actions

**Manual Trigger:**
1. Go to Actions → "Self-Healing System"
2. Click "Run workflow"
3. Configure options:
   - `dry_run`: Test without applying fixes
   - `skip_llm`: Skip LLM analysis
   - `projects`: Comma-separated list (default: health,contracts,modules)
   - `max_fixes`: Maximum auto-fixes per run (default: 3)

**Scheduled Runs:**
- Every 12 hours (6 AM and 6 PM UTC)
- Configurable via cron in `.github/workflows/healing.yml`

---

## Environment Setup

### Required Secrets (GitHub Actions)

| Secret | Description | Required |
|--------|-------------|----------|
| `TEST_EMAIL` | Test account email | Yes |
| `TEST_PASSWORD` | Test account password | Yes |
| `ANTHROPIC_API_KEY` | Claude API key (fallback LLM) | Optional |
| `RAILWAY_TOKEN` | Railway API token (for restart) | Optional |
| `RAILWAY_PROJECT_ID` | Railway project ID | Optional |
| `RAILWAY_SERVICE_ID` | Railway service ID | Optional |
| `SLACK_WEBHOOK_URL` | Slack notifications | Optional |

### Local Environment

Create `.env` file:
```bash
# Test credentials
TEST_EMAIL=will@macseptic.com
TEST_PASSWORD=your_password

# LLM (optional - will use Ollama if available)
ANTHROPIC_API_KEY=sk-ant-...

# Railway (optional - for backend restart)
RAILWAY_TOKEN=...
RAILWAY_PROJECT_ID=...
RAILWAY_SERVICE_ID=...

# Targets
BASE_URL=https://react.ecbtx.com/app
API_URL=https://react-crm-api-production.up.railway.app
```

---

## Understanding Results

### Status Levels

| Status | Meaning | Action |
|--------|---------|--------|
| `healthy` | All tests pass | None needed |
| `degraded` | Some failures, non-critical | Review failures, fixes may be pending |
| `failing` | Critical failures | Immediate investigation required |

### Fix Classes

| Class | Risk | Auto-Execute | Examples |
|-------|------|--------------|----------|
| **A** | Safe | Yes | Restart service, clear cache, refresh tokens |
| **B** | Moderate | PR required | Config changes, test data updates |
| **C** | High | PR + review | Schema changes, code modifications |

### Failure Categories

| Category | Common Causes | Typical Fix |
|----------|---------------|-------------|
| `auth` | Session expired, token invalid | Refresh tokens, clear session |
| `api` | Server error, timeout | Restart backend |
| `network` | Connection refused, DNS failure | Restart backend, check infra |
| `ui` | Element not found, text mismatch | Code fix (PR) |
| `database` | Query error, constraint violation | Schema fix (PR) |

---

## Playbook Reference

### restart-backend (Class A)
**Triggers:** 500/502/503 errors, connection refused, timeouts
**Action:** Triggers Railway deployment restart
**Requirements:** `RAILWAY_TOKEN`, `RAILWAY_PROJECT_ID`, `RAILWAY_SERVICE_ID`

### clear-session (Class A)
**Triggers:** Session expired, cookie missing, storage state errors
**Action:** Deletes `.auth/user.json` to force re-authentication
**Requirements:** None

### refresh-tokens (Class A)
**Triggers:** JWT expired, 401 unauthorized
**Action:** Re-runs `auth.setup.ts` to get fresh tokens
**Requirements:** Test credentials

---

## LLM Configuration

### Priority Order

1. **Ollama (Local)** - Free, fast if GPU available
   - Detects NVIDIA GPU automatically
   - Preferred models: llama3.3:70b, deepseek-r1:32b, qwen2.5-coder:32b
   - Requires Ollama running: `ollama serve`

2. **Anthropic API (Cloud)** - Paid fallback
   - Model: claude-3-haiku (cheapest)
   - Requires: `ANTHROPIC_API_KEY`

### Installing Ollama Models

```bash
# Install Ollama
# See: https://ollama.ai/download

# Pull recommended models
ollama pull llama3.3:70b      # Best overall (if you have 48GB+ VRAM)
ollama pull deepseek-r1:32b   # Great for code
ollama pull qwen2.5-coder:32b # Code-focused
ollama pull llama3.2:latest   # Smaller fallback
```

### GPU Detection

The system automatically detects NVIDIA GPUs via `nvidia-smi`. RTX 5090 is ideal for running larger models.

---

## Troubleshooting

### Common Issues

#### "No LLM available"
- **Cause:** Neither Ollama nor Anthropic configured
- **Fix:** Install Ollama or set `ANTHROPIC_API_KEY`

#### "Railway restart failed"
- **Cause:** Missing Railway credentials
- **Fix:** Set `RAILWAY_TOKEN`, `RAILWAY_PROJECT_ID`, `RAILWAY_SERVICE_ID`

#### "Auth setup failed"
- **Cause:** Invalid test credentials or app down
- **Fix:** Verify `TEST_EMAIL` and `TEST_PASSWORD`, check app health

#### "All tests pass but status is degraded"
- **Cause:** Flaky tests or retries
- **Fix:** Review test stability, increase retries

### Logs Location

- **Local:** `healing-results/run-*.json`
- **GitHub:** Actions → Run → "Healing Results" artifact
- **Playwright:** `playwright-report/`, `test-results/`

---

## Extending the System

### Adding New Playbooks

1. Create file in `healing/playbooks/safe/` or `healing/playbooks/approval-required/`
2. Extend `BasePlaybook` class:

```typescript
import { BasePlaybook, PlaybookResult } from '../types';
import { FailureReport, FixClass } from '../../triage/types';

export class MyPlaybook extends BasePlaybook {
  name = 'my-playbook';
  description = 'Description of what it does';
  class: FixClass = 'A'; // or 'B' or 'C'
  autoExecute = true; // false for approval-required
  applicableCategories = ['api', 'network'];

  async execute(failure: FailureReport, dryRun = false): Promise<PlaybookResult> {
    const startTime = Date.now();

    if (dryRun) {
      return this.createResult(true, 'DRY RUN: Would do X', startTime);
    }

    // Your fix logic here
    try {
      // ...
      return this.createResult(true, 'Fixed successfully', startTime);
    } catch (error) {
      return this.createResult(false, `Failed: ${error}`, startTime);
    }
  }

  isApplicable(failure: FailureReport): boolean {
    return /your-pattern/i.test(failure.errorMessage);
  }
}
```

3. Register in `healing/playbooks/index.ts`

### Adding New Patterns

Edit `healing/triage/patterns.ts`:

```typescript
{
  id: 'my-pattern-id',
  name: 'Pattern Name',
  description: 'What this pattern catches',
  regex: /your regex here/i,
  category: 'api',
  severity: 'high',
  fixClass: 'A',
  playbook: 'my-playbook',  // Optional: link to playbook
}
```

---

## Metrics & Monitoring

### Key Metrics to Track

- **Test pass rate:** `testsPassed / testsRun`
- **Auto-fix success rate:** `fixesSuccessful / fixesAttempted`
- **LLM usage:** Calls per run, provider distribution
- **Time to healthy:** Duration from failure to successful fix

### Slack Notifications

Configure `SLACK_WEBHOOK_URL` to receive alerts on:
- Critical failures
- Scheduled run failures
- Successful auto-fixes

---

## Security Considerations

1. **Secrets:** All credentials in environment variables, never in code
2. **Auto-fix limits:** Maximum 3 fixes per run by default
3. **Class B/C fixes:** Require PR and human review
4. **Audit trail:** All runs logged with timestamps and actions taken
5. **Dry run mode:** Test changes without applying them

---

## FAQ

**Q: How often should I run the healing system?**
A: Every 12 hours is a good default. Increase frequency if your app changes often.

**Q: Will auto-fixes break my production?**
A: Class A fixes are safe (restart, clear cache). Risky changes require PRs.

**Q: What if Ollama is slow?**
A: Use smaller models or fall back to Anthropic API for faster responses.

**Q: Can I run this on Windows?**
A: Yes, the system is cross-platform. GPU detection uses `nvidia-smi`.

**Q: How do I add custom fixes?**
A: Create a new playbook class and register it. See "Extending the System" above.
