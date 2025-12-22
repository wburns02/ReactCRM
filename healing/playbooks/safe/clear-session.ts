/**
 * Clear Session Playbook
 *
 * Clears authentication state and forces re-authentication.
 * Class A: Safe to auto-execute.
 */

import { BasePlaybook, PlaybookResult } from '../types';
import { FailureReport, FixClass } from '../../triage/types';
import { unlink, access } from 'fs/promises';
import { join } from 'path';

export class ClearSessionPlaybook extends BasePlaybook {
  name = 'clear-session';
  description = 'Clear saved authentication state to force re-login';
  class: FixClass = 'A';
  autoExecute = true;
  applicableCategories = ['auth'];

  private authFilePath: string;

  constructor(projectRoot: string = process.cwd()) {
    super();
    this.authFilePath = join(projectRoot, '.auth', 'user.json');
  }

  async execute(failure: FailureReport, dryRun = false): Promise<PlaybookResult> {
    const startTime = Date.now();
    this.log(`Executing for failure: ${failure.testName}`);

    try {
      // Check if auth file exists
      try {
        await access(this.authFilePath);
      } catch {
        return this.createResult(
          true,
          'Auth file does not exist, nothing to clear',
          startTime,
          { authFile: this.authFilePath }
        );
      }

      if (dryRun) {
        this.log(`DRY RUN: Would delete ${this.authFilePath}`);
        return this.createResult(
          true,
          `DRY RUN: Would delete auth file at ${this.authFilePath}`,
          startTime,
          { authFile: this.authFilePath }
        );
      }

      // Delete the auth file
      await unlink(this.authFilePath);
      this.log('Auth state cleared successfully');

      return this.createResult(
        true,
        'Authentication state cleared - next test run will re-authenticate',
        startTime,
        { authFile: this.authFilePath }
      );
    } catch (error) {
      return this.createResult(
        false,
        `Failed to clear session: ${error instanceof Error ? error.message : String(error)}`,
        startTime
      );
    }
  }

  isApplicable(failure: FailureReport): boolean {
    // Apply to session/cookie issues
    const patterns = [
      /session.*expired/i,
      /cookie.*missing/i,
      /authentication.*failed/i,
      /invalid.*session/i,
      /401.*unauthorized/i,
      /storageState/i,
    ];

    return patterns.some((p) => p.test(failure.errorMessage));
  }
}
