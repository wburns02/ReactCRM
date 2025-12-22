/**
 * Refresh Tokens Playbook
 *
 * Attempts to refresh authentication tokens by re-running auth setup.
 * Class A: Safe to auto-execute.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { BasePlaybook, PlaybookResult } from '../types';
import { FailureReport, FixClass } from '../../triage/types';

const execAsync = promisify(exec);

export class RefreshTokensPlaybook extends BasePlaybook {
  name = 'refresh-tokens';
  description = 'Re-run authentication setup to refresh expired tokens';
  class: FixClass = 'A';
  autoExecute = true;
  applicableCategories = ['auth'];

  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    super();
    this.projectRoot = projectRoot;
  }

  async execute(failure: FailureReport, dryRun = false): Promise<PlaybookResult> {
    const startTime = Date.now();
    this.log(`Executing for failure: ${failure.testName}`);

    if (dryRun) {
      this.log('DRY RUN: Would re-run auth setup');
      return this.createResult(
        true,
        'DRY RUN: Would run npx playwright test --project=setup',
        startTime
      );
    }

    try {
      // Run the auth setup test to get fresh tokens
      this.log('Running auth setup to refresh tokens...');

      const { stdout, stderr } = await execAsync(
        'npx playwright test --project=setup',
        {
          cwd: this.projectRoot,
          timeout: 60000, // 1 minute timeout
          env: {
            ...process.env,
            // Ensure we don't use stale auth
            PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1',
          },
        }
      );

      // Check if setup succeeded
      if (stderr && stderr.includes('failed')) {
        return this.createResult(
          false,
          `Auth setup failed: ${stderr.slice(0, 500)}`,
          startTime,
          { stdout, stderr }
        );
      }

      this.log('Auth tokens refreshed successfully');

      return this.createResult(
        true,
        'Authentication tokens refreshed successfully',
        startTime,
        { stdout: stdout.slice(0, 500) }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check if it's a test failure vs execution error
      if (errorMessage.includes('auth.setup.ts')) {
        return this.createResult(
          false,
          'Auth setup test failed - credentials may be invalid',
          startTime,
          { error: errorMessage }
        );
      }

      return this.createResult(
        false,
        `Failed to refresh tokens: ${errorMessage}`,
        startTime
      );
    }
  }

  isApplicable(failure: FailureReport): boolean {
    // Apply to token expiration issues
    const patterns = [
      /token.*expired/i,
      /JWT.*expired/i,
      /session.*expired/i,
      /401/,
      /unauthorized/i,
      /authentication.*required/i,
    ];

    return patterns.some((p) => p.test(failure.errorMessage));
  }
}
