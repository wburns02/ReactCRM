/**
 * Restart Backend Playbook
 *
 * Triggers a Railway deployment restart for the backend service.
 * Class A: Safe to auto-execute.
 */

import { BasePlaybook, PlaybookResult } from '../types';
import { FailureReport, FixClass } from '../../triage/types';
import config from '../../healing.config';

export class RestartBackendPlaybook extends BasePlaybook {
  name = 'restart-backend';
  description = 'Restart the Railway backend deployment to recover from server errors';
  class: FixClass = 'A';
  autoExecute = true;
  applicableCategories = ['api', 'network', 'database'];

  async execute(failure: FailureReport, dryRun = false): Promise<PlaybookResult> {
    const startTime = Date.now();
    this.log(`Executing for failure: ${failure.testName}`);

    if (!config.railway.restartEnabled) {
      return this.createResult(
        false,
        'Railway restart not enabled - RAILWAY_TOKEN not configured',
        startTime
      );
    }

    if (!config.railway.projectId || !config.railway.serviceId) {
      return this.createResult(
        false,
        'Railway project/service ID not configured',
        startTime
      );
    }

    if (dryRun) {
      this.log('DRY RUN: Would restart Railway deployment');
      return this.createResult(true, 'DRY RUN: Would restart Railway deployment', startTime, {
        projectId: config.railway.projectId,
        serviceId: config.railway.serviceId,
      });
    }

    try {
      // Railway API to trigger redeploy
      const response = await fetch('https://backboard.railway.app/graphql/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.RAILWAY_TOKEN}`,
        },
        body: JSON.stringify({
          query: `
            mutation ServiceRestart($serviceId: String!) {
              serviceInstanceRedeploy(serviceId: $serviceId)
            }
          `,
          variables: {
            serviceId: config.railway.serviceId,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return this.createResult(false, `Railway API error: ${error}`, startTime);
      }

      const data = await response.json();

      if (data.errors) {
        return this.createResult(
          false,
          `Railway mutation error: ${JSON.stringify(data.errors)}`,
          startTime
        );
      }

      this.log('Railway deployment restart triggered successfully');

      // Wait for deployment to come back up
      await this.waitForHealthy(30000); // 30 second timeout

      return this.createResult(true, 'Backend restarted successfully', startTime, {
        projectId: config.railway.projectId,
        serviceId: config.railway.serviceId,
      });
    } catch (error) {
      return this.createResult(
        false,
        `Failed to restart backend: ${error instanceof Error ? error.message : String(error)}`,
        startTime
      );
    }
  }

  /**
   * Wait for backend to become healthy after restart
   */
  private async waitForHealthy(timeoutMs: number): Promise<boolean> {
    const startTime = Date.now();
    const checkInterval = 5000; // 5 seconds

    while (Date.now() - startTime < timeoutMs) {
      try {
        const response = await fetch(`${config.targets.api}/health`);
        if (response.ok) {
          this.log('Backend is healthy');
          return true;
        }
      } catch {
        // Still restarting
      }
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }

    this.log('Timeout waiting for backend to become healthy');
    return false;
  }

  isApplicable(failure: FailureReport): boolean {
    // Apply to server errors, connection issues, timeouts
    const patterns = [
      /500|502|503/,
      /server.*error/i,
      /connection.*refused/i,
      /timeout/i,
      /ECONNREFUSED/,
      /ECONNRESET/,
    ];

    return patterns.some((p) => p.test(failure.errorMessage));
  }
}
