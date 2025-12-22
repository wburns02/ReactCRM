import { test as base, expect } from '@playwright/test';

/**
 * Extended Playwright test fixture with automatic console and network capture.
 *
 * Usage:
 *   import { test, expect } from '../fixtures/base.fixture';
 *
 * Features:
 *   - Captures console errors/warnings during test
 *   - Captures network failures (4xx, 5xx responses)
 *   - Logs captured issues for debugging in trace viewer
 */

type ConsoleMessage = {
  type: string;
  text: string;
  location: string;
};

type NetworkFailure = {
  url: string;
  status: number;
  method: string;
  statusText: string;
};

type BaseFixtures = {
  consoleMessages: ConsoleMessage[];
  networkFailures: NetworkFailure[];
};

export const test = base.extend<BaseFixtures>({
  /**
   * Captures console errors and warnings during test execution.
   * Access via test parameter: async ({ consoleMessages }) => { ... }
   */
  consoleMessages: async ({ page }, use) => {
    const messages: ConsoleMessage[] = [];

    page.on('console', (msg) => {
      const type = msg.type();
      if (type === 'error' || type === 'warning') {
        messages.push({
          type,
          text: msg.text(),
          location: msg.location().url || 'unknown',
        });
      }
    });

    // Also capture uncaught exceptions
    page.on('pageerror', (error) => {
      messages.push({
        type: 'pageerror',
        text: error.message,
        location: error.stack || 'unknown',
      });
    });

    await use(messages);

    // Log captured errors for visibility in trace/report
    const errors = messages.filter((m) => m.type === 'error' || m.type === 'pageerror');
    if (errors.length > 0) {
      console.log('\n--- Console Errors Captured ---');
      errors.forEach((e, i) => {
        console.log(`[${i + 1}] ${e.type}: ${e.text}`);
        if (e.location !== 'unknown') {
          console.log(`    at: ${e.location}`);
        }
      });
      console.log('-------------------------------\n');
    }
  },

  /**
   * Captures network failures (4xx, 5xx) during test execution.
   * Access via test parameter: async ({ networkFailures }) => { ... }
   */
  networkFailures: async ({ page }, use) => {
    const failures: NetworkFailure[] = [];

    page.on('response', (response) => {
      const status = response.status();
      if (status >= 400) {
        failures.push({
          url: response.url(),
          status,
          method: response.request().method(),
          statusText: response.statusText(),
        });
      }
    });

    await use(failures);

    // Log captured failures for visibility in trace/report
    if (failures.length > 0) {
      console.log('\n--- Network Failures Captured ---');
      failures.forEach((f, i) => {
        console.log(`[${i + 1}] ${f.method} ${f.url}`);
        console.log(`    Status: ${f.status} ${f.statusText}`);
      });
      console.log('---------------------------------\n');
    }
  },
});

export { expect };

/**
 * Helper to assert no console errors occurred during test.
 * Call at the end of a test to fail if any errors were captured.
 */
export function assertNoConsoleErrors(consoleMessages: ConsoleMessage[]) {
  const errors = consoleMessages.filter(
    (m) => m.type === 'error' || m.type === 'pageerror'
  );
  if (errors.length > 0) {
    const errorSummary = errors.map((e) => `${e.type}: ${e.text}`).join('\n');
    throw new Error(`Console errors detected:\n${errorSummary}`);
  }
}

/**
 * Helper to assert no network failures occurred during test.
 * Optionally exclude expected failures (e.g., 404 for "not found" tests).
 */
export function assertNoNetworkFailures(
  networkFailures: NetworkFailure[],
  options: { ignoreStatuses?: number[]; ignoreUrls?: RegExp[] } = {}
) {
  const { ignoreStatuses = [], ignoreUrls = [] } = options;

  const unexpected = networkFailures.filter((f) => {
    if (ignoreStatuses.includes(f.status)) return false;
    if (ignoreUrls.some((re) => re.test(f.url))) return false;
    return true;
  });

  if (unexpected.length > 0) {
    const failureSummary = unexpected
      .map((f) => `${f.method} ${f.url} -> ${f.status}`)
      .join('\n');
    throw new Error(`Network failures detected:\n${failureSummary}`);
  }
}
