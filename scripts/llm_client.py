#!/usr/bin/env python3
"""
llm_client.py - LLM Client with RTX 5090 Local + Anthropic Fallback

Priority:
1. Local Ollama (RTX 5090 GPU) - free, private
2. Anthropic API - fallback when local unavailable

NEVER sends secrets or PII to LLMs.
Only allows output of unified diff patches.
"""

import os
import re
import subprocess
import sys
from typing import Optional

import httpx

# Import redaction
try:
    from redact import redact_sensitive_data
except ImportError:
    def redact_sensitive_data(text):
        return text


# Configuration
OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.2")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = "claude-3-5-sonnet-20241022"

# Timeout settings
TIMEOUT_SECONDS = 120


def check_gpu_available() -> bool:
    """Check if NVIDIA GPU is available."""
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode == 0 and result.stdout.strip():
            gpu_info = result.stdout.strip()
            print(f"[LLM] GPU detected: {gpu_info}")
            return True
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    return False


def check_ollama_available() -> bool:
    """Check if Ollama is running and has a model."""
    try:
        with httpx.Client(timeout=10) as client:
            # Check if Ollama is running
            response = client.get(f"{OLLAMA_HOST}/api/tags")
            if response.status_code != 200:
                return False

            # Check if we have any models
            data = response.json()
            models = data.get("models", [])

            if not models:
                print("[LLM] Ollama running but no models installed")
                return False

            # Check for our preferred model
            model_names = [m.get("name", "").split(":")[0] for m in models]
            if OLLAMA_MODEL.split(":")[0] in model_names:
                print(f"[LLM] Ollama available with model: {OLLAMA_MODEL}")
                return True
            else:
                # Use first available model
                print(f"[LLM] Ollama available, using model: {model_names[0]}")
                return True

    except Exception as e:
        print(f"[LLM] Ollama not available: {e}")
        return False


def check_anthropic_available() -> bool:
    """Check if Anthropic API key is configured."""
    if not ANTHROPIC_API_KEY:
        print("[LLM] Anthropic API key not configured")
        return False
    print("[LLM] Anthropic API available as fallback")
    return True


def is_llm_available() -> bool:
    """Check if any LLM is available."""
    return check_ollama_available() or check_anthropic_available()


def query_ollama(prompt: str, max_tokens: int = 2000) -> Optional[str]:
    """Query local Ollama instance."""
    try:
        with httpx.Client(timeout=TIMEOUT_SECONDS) as client:
            response = client.post(
                f"{OLLAMA_HOST}/api/generate",
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "num_predict": max_tokens,
                        "temperature": 0.1,  # Low temp for deterministic output
                    },
                },
            )

            if response.status_code == 200:
                data = response.json()
                return data.get("response", "")
            else:
                print(f"[LLM] Ollama error: {response.status_code}")
                return None

    except Exception as e:
        print(f"[LLM] Ollama query failed: {e}")
        return None


def query_anthropic(prompt: str, max_tokens: int = 2000) -> Optional[str]:
    """Query Anthropic API."""
    if not ANTHROPIC_API_KEY:
        return None

    try:
        # Use httpx directly to avoid dependency on anthropic package
        with httpx.Client(timeout=TIMEOUT_SECONDS) as client:
            response = client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": ANTHROPIC_MODEL,
                    "max_tokens": max_tokens,
                    "temperature": 0.1,
                    "messages": [
                        {"role": "user", "content": prompt}
                    ],
                },
            )

            if response.status_code == 200:
                data = response.json()
                content = data.get("content", [])
                if content and len(content) > 0:
                    return content[0].get("text", "")
            else:
                print(f"[LLM] Anthropic error: {response.status_code} - {response.text[:200]}")
                return None

    except Exception as e:
        print(f"[LLM] Anthropic query failed: {e}")
        return None


def validate_output_is_diff(output: str) -> bool:
    """Validate that LLM output is a unified diff."""
    if not output:
        return False

    # Must contain diff markers
    has_diff_header = "---" in output or "+++" in output
    has_hunk_header = "@@" in output

    # Must not contain dangerous patterns
    dangerous_patterns = [
        r"rm\s+-rf",
        r"sudo\s+",
        r"chmod\s+777",
        r"curl\s+.*\|\s*sh",
        r"eval\s*\(",
        r"exec\s*\(",
        r"os\.system",
        r"subprocess\.call.*shell=True",
    ]

    for pattern in dangerous_patterns:
        if re.search(pattern, output, re.IGNORECASE):
            print(f"[LLM] Dangerous pattern detected in output: {pattern}")
            return False

    return has_diff_header or has_hunk_header


def get_llm_suggestion(
    prompt: str,
    max_tokens: int = 2000,
    require_diff: bool = True,
) -> Optional[str]:
    """
    Get LLM suggestion with local-first fallback.

    Args:
        prompt: The prompt to send (will be redacted)
        max_tokens: Maximum tokens in response
        require_diff: If True, validate output is a unified diff

    Returns:
        LLM response or None if failed/invalid
    """
    # Redact sensitive data from prompt
    safe_prompt = redact_sensitive_data(prompt)

    # Add instruction to output only diff
    if require_diff:
        safe_prompt += "\n\nIMPORTANT: Output ONLY a unified diff patch. No explanations."

    print("[LLM] Querying LLM for suggestion...")

    # Try Ollama first (local, free, private)
    if check_ollama_available():
        print("[LLM] Using local Ollama")
        response = query_ollama(safe_prompt, max_tokens)

        if response:
            if not require_diff or validate_output_is_diff(response):
                return response
            else:
                print("[LLM] Ollama output failed diff validation")

    # Fallback to Anthropic
    if check_anthropic_available():
        print("[LLM] Falling back to Anthropic API")
        response = query_anthropic(safe_prompt, max_tokens)

        if response:
            if not require_diff or validate_output_is_diff(response):
                return response
            else:
                print("[LLM] Anthropic output failed diff validation")

    print("[LLM] No valid response from any LLM")
    return None


def main():
    """Test LLM availability and query."""
    print("=" * 50)
    print("LLM Client Test")
    print("=" * 50)

    print("\n[TEST] Checking GPU...")
    gpu = check_gpu_available()
    print(f"  GPU available: {gpu}")

    print("\n[TEST] Checking Ollama...")
    ollama = check_ollama_available()
    print(f"  Ollama available: {ollama}")

    print("\n[TEST] Checking Anthropic...")
    anthropic = check_anthropic_available()
    print(f"  Anthropic available: {anthropic}")

    print("\n[TEST] Overall LLM availability...")
    available = is_llm_available()
    print(f"  Any LLM available: {available}")

    if available:
        print("\n[TEST] Testing simple query...")
        test_prompt = "Generate a unified diff that adds a comment '// test' to line 1 of a file called test.ts"
        result = get_llm_suggestion(test_prompt, max_tokens=500, require_diff=False)
        if result:
            print(f"  Response:\n{result[:500]}")
        else:
            print("  No response received")


if __name__ == "__main__":
    main()
