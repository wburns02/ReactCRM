# LLM Usage Policy

## Overview

This document defines the policy for using Large Language Models (LLMs) within the React CRM self-healing system. The system uses LLMs for failure analysis, fix suggestions, and code generation.

## Core Principles

1. **Local First**: Always prefer local LLM (Ollama) over cloud services
2. **Privacy by Default**: Never send secrets, PII, or sensitive data to any LLM
3. **Human Review**: All LLM-generated code changes require human approval
4. **Minimal Scope**: Only send necessary context, redact everything else

## LLM Fallback Chain

```
┌──────────────────────────────────────────────────────┐
│                   LLM Request                        │
└────────────────────────┬─────────────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │  Redact Sensitive   │
              │       Data          │
              └──────────┬──────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │  Check Ollama       │────── Available? ──┐
              │  (Local GPU)        │                    │
              └──────────┬──────────┘                    │
                         │ No                           Yes
                         ▼                               │
              ┌─────────────────────┐                    │
              │  Check Anthropic    │                    │
              │  (Cloud Fallback)   │                    │
              └──────────┬──────────┘                    │
                         │                               │
                         ▼                               ▼
              ┌─────────────────────┐      ┌─────────────────────┐
              │  Return Error       │      │  Query LLM          │
              │  (No LLM Available) │      │  (Validate Output)  │
              └─────────────────────┘      └─────────────────────┘
```

## Local LLM (Ollama) - PRIMARY

### Requirements

- **GPU**: NVIDIA RTX 3080+ (10GB+ VRAM)
- **Recommended**: RTX 5090 (48GB VRAM) for codellama:34b
- **Software**: Ollama installed and running

### Supported Models

| Model | VRAM Required | Recommended For |
|-------|---------------|-----------------|
| `codellama:34b` | 48GB | RTX 5090, full precision |
| `codellama:34b-q4` | 24GB | RTX 4090/3090, quantized |
| `codellama:13b` | 16GB | RTX 4080/3090 |
| `codellama:7b` | 8GB | RTX 3080/3070 |

### Configuration

```bash
# Environment variables
export OLLAMA_HOST=http://localhost:11434
export OLLAMA_MODEL=codellama:34b

# Test connectivity
curl http://localhost:11434/api/tags
```

### Why Local First?

1. **Privacy**: No data leaves your machine
2. **Cost**: No per-token charges
3. **Speed**: No network latency
4. **Availability**: Works offline

## Cloud LLM (Anthropic) - FALLBACK ONLY

### When Used

Anthropic API is ONLY used when:
1. Ollama is not installed
2. Ollama is not running
3. Ollama fails to respond
4. No GPU available

### Requirements

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

### Model Used

- `claude-3-5-sonnet-20241022` (primary)
- Fallback: `claude-3-haiku-20240307` (for simple queries)

### Cost Considerations

| Operation | Est. Tokens | Est. Cost |
|-----------|-------------|-----------|
| Failure analysis | ~2,000 | $0.006 |
| Fix suggestion | ~4,000 | $0.012 |
| Code generation | ~8,000 | $0.024 |

*Costs based on claude-3-5-sonnet pricing ($3/$15 per MTok)*

## Sensitive Data Redaction

### MANDATORY Redaction

Before ANY LLM query, the following are redacted:

| Data Type | Pattern | Replacement |
|-----------|---------|-------------|
| API Keys | `api_key=...` | `[REDACTED_API_KEY]` |
| Passwords | `password=...` | `[REDACTED_PASSWORD]` |
| JWT Tokens | `eyJ...` | `[REDACTED_JWT]` |
| Database URLs | `postgres://...` | `[REDACTED_DB_URL]` |
| Email Addresses | `*@*.com` | `[REDACTED_EMAIL]` |
| Phone Numbers | `+1...` | `[REDACTED_PHONE]` |
| IP Addresses | `192.168.*.*` | `[REDACTED_IP]` |
| Credit Cards | `4xxx...` | `[REDACTED_CC]` |
| SSNs | `xxx-xx-xxxx` | `[REDACTED_SSN]` |
| AWS Keys | `AKIA...` | `[REDACTED_AWS_KEY]` |
| Twilio SIDs | `AC...` | `[REDACTED_TWILIO]` |
| GitHub Tokens | `ghp_...` | `[REDACTED_GITHUB_TOKEN]` |

### Allowlist (NOT Redacted)

- `localhost`, `127.0.0.1`, `0.0.0.0`
- `example.com`, `test@example.com`
- Already redacted tokens `[REDACTED_*]`

### Implementation

```python
# scripts/redact.py
from scripts.redact import redact_sensitive_data, get_redaction_summary

# Before LLM query
safe_prompt = redact_sensitive_data(raw_prompt)

# Verify what was redacted
summary = get_redaction_summary(raw_prompt, safe_prompt)
print(f"Redacted {summary['redactions_made']} items")
```

## Output Validation

### Required Format

LLM-generated fixes MUST be in unified diff format:

```diff
--- a/src/file.ts
+++ b/src/file.ts
@@ -10,3 +10,4 @@
 existing code
-old line
+new line
+added line
```

### Validation Rules

1. Must start with `---` and `+++` markers
2. Must include `@@` hunk headers
3. File paths must exist in codebase
4. Changes must not exceed 100 lines

### Rejection Criteria

LLM output is rejected if:
- No valid diff format detected
- Attempts to modify protected files (`.env`, `secrets.*`)
- Contains dangerous patterns (`rm -rf`, `DROP TABLE`, etc.)
- Exceeds maximum change size

## Guardrails

### Request Limits

| Setting | Value | Purpose |
|---------|-------|---------|
| `max_tokens` | 4096 | Prevent runaway generation |
| `temperature` | 0.1 | Low variance for code |
| `max_retries` | 2 | Limit retry attempts |

### Prompt Restrictions

The LLM system prompt includes:
- Role definition (code repair assistant)
- Output format requirements (unified diff)
- Forbidden actions list
- Context size limits

### Logging

All LLM interactions are logged:
- Timestamp
- Prompt (redacted)
- Response (truncated)
- Model used
- Token count
- Success/failure

Logs stored in: `artifacts/*/logs/llm_interactions.json`

## Disable LLM

To completely disable LLM analysis:

```bash
# Skip LLM in self-heal runs
export SKIP_LLM=true
./scripts/self_heal_run.sh

# Or in GitHub Actions
# Set repository variable: SKIP_LLM=true
```

## Security Audit

### Monthly Review

1. Review `llm_interactions.json` for any leaked data
2. Verify redaction patterns catch new sensitive data
3. Check Anthropic API usage/billing
4. Audit LLM-suggested fixes that were applied

### Incident Response

If sensitive data is sent to LLM:

1. **Immediately** rotate affected credentials
2. Log incident with timestamp and data type
3. Review and update redaction patterns
4. Notify security team

## Compliance

### GDPR/Privacy

- PII is redacted before LLM queries
- Local LLM preferred (no data export)
- No long-term storage of LLM conversations
- User data never sent to LLM

### SOC 2

- API keys are secrets-managed
- LLM access is logged and auditable
- No direct database access from LLM
- Changes require human approval

## Configuration Reference

### Environment Variables

```bash
# Local LLM
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=codellama:34b

# Cloud fallback
ANTHROPIC_API_KEY=sk-ant-...

# Control flags
SKIP_LLM=false                  # Disable LLM entirely
LLM_FALLBACK_ONLY=false         # Skip local, use cloud only
LLM_LOCAL_ONLY=false            # Skip cloud fallback
LLM_MAX_TOKENS=4096             # Max tokens per request
LLM_TEMPERATURE=0.1             # Generation temperature
```

### Python Client

```python
from scripts.llm_client import (
    is_llm_available,
    get_llm_suggestion,
    check_ollama_available,
    check_anthropic_available
)

# Check availability
if is_llm_available():
    # Get fix suggestion
    fix = get_llm_suggestion(
        prompt="Analyze this test failure...",
        max_tokens=2000,
        require_diff=True
    )
```

## Changelog

| Date | Change |
|------|--------|
| 2024-12-23 | Initial policy created |
| - | RTX 5090 support added |
| - | Anthropic fallback implemented |
| - | Redaction patterns expanded |
