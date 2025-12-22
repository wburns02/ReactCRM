/**
 * LLM Analysis Prompts
 *
 * Structured prompts for failure analysis using LLM.
 */

import { FailureReport } from '../triage/types';

/**
 * Generate system prompt for failure analysis
 */
export function getSystemPrompt(): string {
  return `You are an expert software engineer specializing in debugging and fixing test failures.
Your task is to analyze test failures from a React CRM application and provide:
1. Root cause analysis
2. Suggested fix with confidence level
3. Specific code changes if applicable

The application stack:
- Frontend: React 19, TypeScript, Vite, TailwindCSS
- Testing: Playwright for E2E tests
- Backend: FastAPI (Python), PostgreSQL
- Deployment: Railway (backend), Vercel/Cloudflare (frontend)

Be concise and actionable. Focus on the most likely root cause.
Response format: JSON`;
}

/**
 * Generate analysis prompt for a failure
 */
export function getAnalysisPrompt(failure: FailureReport): string {
  return `Analyze this test failure and provide a fix recommendation.

## Test Information
- **Test Name:** ${failure.testName}
- **Test File:** ${failure.testFile}
- **Project:** ${failure.projectName}
- **Category:** ${failure.category}
- **Severity:** ${failure.severity}

## Error
\`\`\`
${failure.errorMessage}
\`\`\`

${failure.errorStack ? `## Stack Trace\n\`\`\`\n${failure.errorStack.slice(0, 2000)}\n\`\`\`` : ''}

${failure.patternMatch ? `## Matched Pattern\n- **Name:** ${failure.patternMatch.name}\n- **Description:** ${failure.patternMatch.description}` : ''}

## Required Response Format (JSON)
{
  "rootCause": "Brief explanation of what caused the failure",
  "suggestedFix": "Specific action to fix the issue",
  "confidence": 0.0-1.0,
  "codeChanges": [
    {
      "file": "path/to/file.ts",
      "description": "What to change",
      "after": "new code if applicable"
    }
  ],
  "additionalNotes": "Any other relevant information"
}`;
}

/**
 * Generate batch analysis prompt for multiple failures
 */
export function getBatchAnalysisPrompt(failures: FailureReport[]): string {
  const failureSummaries = failures
    .map(
      (f, i) => `
### Failure ${i + 1}: ${f.testName}
- **Category:** ${f.category}
- **Error:** ${f.errorMessage.slice(0, 200)}...
`
    )
    .join('\n');

  return `Analyze these ${failures.length} test failures and identify if they share a common root cause.

${failureSummaries}

## Required Response Format (JSON)
{
  "commonRootCause": "If failures share a root cause, explain it. Otherwise null.",
  "individualAnalyses": [
    {
      "testName": "Name of the test",
      "rootCause": "Brief explanation",
      "suggestedFix": "Specific action",
      "confidence": 0.0-1.0
    }
  ],
  "priorityFix": "Which failure to fix first and why"
}`;
}

/**
 * Generate prompt for code fix generation
 */
export function getCodeFixPrompt(failure: FailureReport, fileContent?: string): string {
  return `Generate a code fix for this test failure.

## Test Failure
- **Test:** ${failure.testName}
- **Error:** ${failure.errorMessage}
${failure.errorStack ? `\n**Stack:**\n${failure.errorStack.slice(0, 1500)}` : ''}

${fileContent ? `## Current File Content\n\`\`\`typescript\n${fileContent.slice(0, 3000)}\n\`\`\`` : ''}

## Required Response Format (JSON)
{
  "fixDescription": "What the fix does",
  "codeChanges": [
    {
      "file": "exact/file/path.ts",
      "lineNumber": 123,
      "before": "exact line to replace (or null for new code)",
      "after": "replacement code"
    }
  ],
  "testingNotes": "How to verify the fix works"
}`;
}

/**
 * Parse LLM response to JSON
 */
export function parseLLMResponse<T>(response: string): T | null {
  // Try to extract JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    console.error('No JSON found in LLM response');
    return null;
  }

  try {
    return JSON.parse(jsonMatch[0]) as T;
  } catch (e) {
    console.error('Failed to parse LLM response as JSON:', e);
    return null;
  }
}
