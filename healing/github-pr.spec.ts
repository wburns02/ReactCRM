/**
 * GitHub PR Creator Tests
 *
 * Unit tests for the self-healing PR creation functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitHubPRCreator, PRCreationConfig, createPRCreatorFromEnv } from './github-pr';
import { FailureReport } from './triage/types';

// Mock @octokit/rest
vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn().mockImplementation(() => ({
    git: {
      getRef: vi.fn().mockResolvedValue({
        data: { object: { sha: 'abc123' } },
      }),
      createRef: vi.fn().mockResolvedValue({}),
    },
    repos: {
      getContent: vi.fn().mockRejectedValue(new Error('Not found')),
      createOrUpdateFileContents: vi.fn().mockResolvedValue({}),
    },
    pulls: {
      create: vi.fn().mockResolvedValue({
        data: {
          number: 42,
          html_url: 'https://github.com/owner/repo/pull/42',
        },
      }),
    },
    issues: {
      addLabels: vi.fn().mockResolvedValue({}),
    },
  })),
}));

describe('GitHubPRCreator', () => {
  let creator: GitHubPRCreator;
  const mockConfig: PRCreationConfig = {
    owner: 'test-owner',
    repo: 'test-repo',
    baseBranch: 'main',
    token: 'test-token',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    creator = new GitHubPRCreator(mockConfig);
  });

  describe('generatePRDetails', () => {
    it('generates correct branch name format', () => {
      const failure = createMockFailure();
      const details = creator.generatePRDetails(failure);

      expect(details.branchName).toMatch(/^heal\/fix-auth-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/);
    });

    it('generates title with category and truncated error', () => {
      const failure = createMockFailure();
      const details = creator.generatePRDetails(failure);

      expect(details.title).toContain('[Self-Heal]');
      expect(details.title).toContain('auth');
    });

    it('includes required labels', () => {
      const failure = createMockFailure();
      const details = creator.generatePRDetails(failure);

      expect(details.labels).toContain('self-heal');
      expect(details.labels).toContain('automated');
      expect(details.labels).toContain('critical'); // severity
    });

    it('includes failure details in PR body', () => {
      const failure = createMockFailure();
      const details = creator.generatePRDetails(failure);

      expect(details.body).toContain('## Summary');
      expect(details.body).toContain('## Failure Details');
      expect(details.body).toContain(failure.testName);
      expect(details.body).toContain(failure.errorMessage);
    });

    it('includes LLM analysis when available', () => {
      const failure = createMockFailure({
        llmAnalysis: {
          provider: 'anthropic',
          model: 'claude-3',
          rootCause: 'Token expired',
          suggestedFix: 'Refresh auth token before request',
          confidence: 0.85,
          additionalNotes: 'Consider adding retry logic',
        },
      });
      const details = creator.generatePRDetails(failure);

      expect(details.body).toContain('## LLM Analysis');
      expect(details.body).toContain('Token expired');
      expect(details.body).toContain('Refresh auth token');
      expect(details.body).toContain('85%');
    });

    it('extracts file changes from LLM analysis', () => {
      const failure = createMockFailure({
        llmAnalysis: {
          provider: 'anthropic',
          model: 'claude-3',
          rootCause: 'Missing null check',
          suggestedFix: 'Add null check',
          confidence: 0.9,
          codeChanges: [
            {
              file: 'src/auth.ts',
              description: 'Add null check',
              before: 'const token = data.token;',
              after: 'const token = data?.token ?? null;',
            },
          ],
        },
      });
      const details = creator.generatePRDetails(failure);

      expect(details.files).toHaveLength(1);
      expect(details.files[0].path).toBe('src/auth.ts');
      expect(details.files[0].content).toBe('const token = data?.token ?? null;');
    });
  });

  describe('createPRForFailure', () => {
    it('creates PR successfully', async () => {
      const failure = createMockFailure();
      const result = await creator.createPRForFailure(failure);

      expect(result.success).toBe(true);
      expect(result.prNumber).toBe(42);
      expect(result.prUrl).toBe('https://github.com/owner/repo/pull/42');
    });

    it('handles API errors gracefully', async () => {
      const { Octokit } = await import('@octokit/rest');
      vi.mocked(Octokit).mockImplementationOnce(
        () =>
          ({
            git: {
              getRef: vi.fn().mockRejectedValue(new Error('API rate limit exceeded')),
            },
          }) as unknown as InstanceType<typeof Octokit>
      );

      const errorCreator = new GitHubPRCreator(mockConfig);
      const failure = createMockFailure();
      const result = await errorCreator.createPRForFailure(failure);

      expect(result.success).toBe(false);
      expect(result.error).toContain('rate limit');
    });

    it('creates issue markdown when no code changes', async () => {
      const failure = createMockFailure();
      await creator.createPRForFailure(failure);

      // Verify createOrUpdateFileContents was called with issue markdown
      const { Octokit } = await import('@octokit/rest');
      const mockInstance = new Octokit();
      expect(mockInstance.repos.createOrUpdateFileContents).toHaveBeenCalled();
    });
  });
});

describe('createPRCreatorFromEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns null when GITHUB_TOKEN is missing', () => {
    delete process.env.GITHUB_TOKEN;
    process.env.GITHUB_OWNER = 'owner';
    process.env.GITHUB_REPO = 'repo';

    const creator = createPRCreatorFromEnv();
    expect(creator).toBeNull();
  });

  it('returns null when owner/repo is missing', () => {
    process.env.GITHUB_TOKEN = 'token';
    delete process.env.GITHUB_OWNER;
    delete process.env.GITHUB_REPO;
    delete process.env.GITHUB_REPOSITORY;

    const creator = createPRCreatorFromEnv();
    expect(creator).toBeNull();
  });

  it('creates creator from GITHUB_REPOSITORY format', () => {
    process.env.GITHUB_TOKEN = 'token';
    process.env.GITHUB_REPOSITORY = 'owner/repo';

    const creator = createPRCreatorFromEnv();
    expect(creator).not.toBeNull();
  });

  it('uses custom base branch when provided', () => {
    process.env.GITHUB_TOKEN = 'token';
    process.env.GITHUB_OWNER = 'owner';
    process.env.GITHUB_REPO = 'repo';
    process.env.GITHUB_BASE_BRANCH = 'develop';

    const creator = createPRCreatorFromEnv();
    expect(creator).not.toBeNull();
  });
});

/**
 * Helper to create a mock FailureReport
 */
function createMockFailure(overrides: Partial<FailureReport> = {}): FailureReport {
  return {
    id: 'test-failure-123',
    timestamp: new Date().toISOString(),
    testName: 'Authentication > Login > should authenticate user',
    testFile: 'e2e/tests/auth.spec.ts',
    projectName: 'e2e',
    errorMessage: 'Expected element to be visible but it was hidden',
    errorStack: 'Error: Expected element to be visible\n  at auth.spec.ts:42:10',
    category: 'auth',
    severity: 'critical',
    autoFixable: false,
    fixClass: 'C',
    fixAttempted: false,
    ...overrides,
  };
}
