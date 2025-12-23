/**
 * GitHub PR Creation for Self-Healing System
 *
 * Creates pull requests for issues that require human review.
 * Uses @octokit/rest for GitHub API interactions.
 */

import { Octokit } from '@octokit/rest';
import { FailureReport, CodeChange } from './triage/types';

export interface PRCreationConfig {
  owner: string;
  repo: string;
  baseBranch: string;
  token: string;
}

export interface PRCreationResult {
  success: boolean;
  prNumber?: number;
  prUrl?: string;
  error?: string;
}

export interface PRDetails {
  title: string;
  body: string;
  branchName: string;
  files: FileChange[];
  labels: string[];
}

export interface FileChange {
  path: string;
  content: string;
}

/**
 * GitHub PR Creator
 *
 * Handles the creation of pull requests for self-healing fixes.
 */
export class GitHubPRCreator {
  private octokit: Octokit;
  private config: PRCreationConfig;

  constructor(config: PRCreationConfig) {
    this.config = config;
    this.octokit = new Octokit({ auth: config.token });
  }

  /**
   * Create a PR for a failure report with suggested fixes
   */
  async createPRForFailure(failure: FailureReport): Promise<PRCreationResult> {
    try {
      const prDetails = this.generatePRDetails(failure);

      // Get base branch SHA
      const baseSha = await this.getBaseBranchSha();

      // Create new branch
      await this.createBranch(prDetails.branchName, baseSha);

      // Apply file changes if there are any
      if (prDetails.files.length > 0) {
        for (const file of prDetails.files) {
          await this.createOrUpdateFile(prDetails.branchName, file);
        }
      } else {
        // If no file changes, create a placeholder file with the failure details
        await this.createOrUpdateFile(prDetails.branchName, {
          path: `healing/issues/${failure.id}.md`,
          content: this.generateIssueMarkdown(failure),
        });
      }

      // Create the PR
      const pr = await this.octokit.pulls.create({
        owner: this.config.owner,
        repo: this.config.repo,
        title: prDetails.title,
        body: prDetails.body,
        head: prDetails.branchName,
        base: this.config.baseBranch,
      });

      // Add labels
      if (prDetails.labels.length > 0) {
        await this.octokit.issues.addLabels({
          owner: this.config.owner,
          repo: this.config.repo,
          issue_number: pr.data.number,
          labels: prDetails.labels,
        });
      }

      return {
        success: true,
        prNumber: pr.data.number,
        prUrl: pr.data.html_url,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Generate PR details from a failure report
   */
  generatePRDetails(failure: FailureReport): PRDetails {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const categorySlug = failure.category.toLowerCase().replace(/[^a-z0-9]/g, '-');

    return {
      title: `[Self-Heal] Fix ${failure.category} issue: ${this.truncate(failure.errorMessage, 60)}`,
      body: this.generatePRBody(failure),
      branchName: `heal/fix-${categorySlug}-${timestamp}`,
      files: this.extractFileChanges(failure),
      labels: ['self-heal', 'automated', failure.severity],
    };
  }

  /**
   * Generate PR body markdown
   */
  private generatePRBody(failure: FailureReport): string {
    const sections: string[] = [];

    sections.push('## Summary');
    sections.push(`This PR addresses an automated test failure detected by the self-healing system.`);
    sections.push('');

    sections.push('## Failure Details');
    sections.push(`- **Test**: ${failure.testName}`);
    sections.push(`- **File**: ${failure.testFile}`);
    sections.push(`- **Category**: ${failure.category}`);
    sections.push(`- **Severity**: ${failure.severity}`);
    sections.push('');

    sections.push('### Error Message');
    sections.push('```');
    sections.push(failure.errorMessage);
    sections.push('```');
    sections.push('');

    if (failure.llmAnalysis) {
      sections.push('## LLM Analysis');
      sections.push(`**Root Cause**: ${failure.llmAnalysis.rootCause}`);
      sections.push('');
      sections.push(`**Suggested Fix**: ${failure.llmAnalysis.suggestedFix}`);
      sections.push('');
      sections.push(`**Confidence**: ${(failure.llmAnalysis.confidence * 100).toFixed(0)}%`);
      sections.push('');

      if (failure.llmAnalysis.additionalNotes) {
        sections.push('**Notes**: ' + failure.llmAnalysis.additionalNotes);
        sections.push('');
      }
    }

    sections.push('## Test Plan');
    sections.push('- [ ] Review the suggested changes');
    sections.push('- [ ] Run the affected tests locally');
    sections.push('- [ ] Verify the fix addresses the root cause');
    sections.push('');

    sections.push('---');
    sections.push('*This PR was automatically generated by the self-healing system.*');

    return sections.join('\n');
  }

  /**
   * Extract file changes from LLM analysis
   */
  private extractFileChanges(failure: FailureReport): FileChange[] {
    const changes: FileChange[] = [];

    if (failure.llmAnalysis?.codeChanges) {
      for (const change of failure.llmAnalysis.codeChanges) {
        changes.push({
          path: change.file,
          content: change.after,
        });
      }
    }

    return changes;
  }

  /**
   * Generate markdown for issue documentation
   */
  private generateIssueMarkdown(failure: FailureReport): string {
    const sections: string[] = [];

    sections.push(`# Test Failure: ${failure.testName}`);
    sections.push('');
    sections.push(`**ID**: ${failure.id}`);
    sections.push(`**Timestamp**: ${failure.timestamp}`);
    sections.push(`**Category**: ${failure.category}`);
    sections.push(`**Severity**: ${failure.severity}`);
    sections.push('');
    sections.push('## Error');
    sections.push('```');
    sections.push(failure.errorMessage);
    sections.push('```');
    sections.push('');

    if (failure.errorStack) {
      sections.push('## Stack Trace');
      sections.push('```');
      sections.push(failure.errorStack);
      sections.push('```');
      sections.push('');
    }

    if (failure.llmAnalysis) {
      sections.push('## Analysis');
      sections.push(`**Root Cause**: ${failure.llmAnalysis.rootCause}`);
      sections.push(`**Suggested Fix**: ${failure.llmAnalysis.suggestedFix}`);
      sections.push('');
    }

    return sections.join('\n');
  }

  /**
   * Get the SHA of the base branch
   */
  private async getBaseBranchSha(): Promise<string> {
    const ref = await this.octokit.git.getRef({
      owner: this.config.owner,
      repo: this.config.repo,
      ref: `heads/${this.config.baseBranch}`,
    });
    return ref.data.object.sha;
  }

  /**
   * Create a new branch from a SHA
   */
  private async createBranch(branchName: string, sha: string): Promise<void> {
    await this.octokit.git.createRef({
      owner: this.config.owner,
      repo: this.config.repo,
      ref: `refs/heads/${branchName}`,
      sha,
    });
  }

  /**
   * Create or update a file in a branch
   */
  private async createOrUpdateFile(branch: string, file: FileChange): Promise<void> {
    const content = Buffer.from(file.content).toString('base64');

    // Check if file exists
    let sha: string | undefined;
    try {
      const existing = await this.octokit.repos.getContent({
        owner: this.config.owner,
        repo: this.config.repo,
        path: file.path,
        ref: branch,
      });
      if (!Array.isArray(existing.data) && 'sha' in existing.data) {
        sha = existing.data.sha;
      }
    } catch {
      // File doesn't exist, that's fine
    }

    await this.octokit.repos.createOrUpdateFileContents({
      owner: this.config.owner,
      repo: this.config.repo,
      path: file.path,
      message: `chore: Add self-healing fix for ${file.path}`,
      content,
      branch,
      sha,
    });
  }

  /**
   * Truncate a string to a maximum length
   */
  private truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + '...';
  }
}

/**
 * Create a PR creator with config from environment
 */
export function createPRCreatorFromEnv(): GitHubPRCreator | null {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER || process.env.GITHUB_REPOSITORY?.split('/')[0];
  const repo = process.env.GITHUB_REPO || process.env.GITHUB_REPOSITORY?.split('/')[1];
  const baseBranch = process.env.GITHUB_BASE_BRANCH || 'main';

  if (!token || !owner || !repo) {
    console.warn('GitHub PR creation not configured: missing GITHUB_TOKEN, GITHUB_OWNER, or GITHUB_REPO');
    return null;
  }

  return new GitHubPRCreator({
    token,
    owner,
    repo,
    baseBranch,
  });
}
