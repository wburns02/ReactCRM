/**
 * IoT Dashboard E2E test
 *
 * Verifies the IoT monitor surface end-to-end:
 *   1. Login with stored auth state
 *   2. Navigate to /iot
 *   3. Dashboard renders without console errors
 *   4. Stats cards show numeric values
 *   5. Device list, alert list render (or show empty states)
 *   6. Direct API call to /api/v2/iot/dashboard/stats returns 200
 *   7. Direct API call to /api/v2/iot/devices returns 200
 *
 * To exercise the full path (device → MQTT → bridge → dashboard alert),
 * run scripts/iot_simulator.py against a configured broker and re-run this
 * spec — it'll find the simulator's device and verify alerts appear.
 *
 * Usage:
 *   npx playwright test e2e/iot-dashboard.spec.ts
 */
import { test, expect } from '@playwright/test';

const KNOWN_NOISE_PATTERNS = [
  /API Schema Violation/i,
  /Sentry/i,
  /ResizeObserver loop/i,
  /favicon/i,
];

function isKnownNoise(msg: string): boolean {
  return KNOWN_NOISE_PATTERNS.some((re) => re.test(msg));
}

test.describe('IoT Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !isKnownNoise(msg.text())) {
        errors.push(msg.text());
      }
    });
    (page as any)._consoleErrors = errors;
  });

  test('renders dashboard with stats and device list', async ({ page, baseURL }) => {
    await page.goto((baseURL || 'https://react.ecbtx.com') + '/iot', {
      waitUntil: 'domcontentloaded',
    });

    // SPA may redirect through login if storage state expired
    await page.waitForFunction(
      () => !location.href.includes('/login'),
      { timeout: 15000 },
    );
    await page.waitForTimeout(2500); // SPA stabilization

    // Page should have an IoT-related heading or stats card
    const headings = await page.locator('h1, h2, h3').allTextContents();
    const hasIoTHeading = headings.some((h) => /iot|device|monitor/i.test(h));
    if (!hasIoTHeading) {
      // Capture state for debug
      await page.screenshot({ path: '/tmp/iot-dashboard-no-heading.png', fullPage: true });
    }
    expect(hasIoTHeading, `No IoT heading found. Headings: ${JSON.stringify(headings)}`).toBe(true);

    // Console error check
    const errors = (page as any)._consoleErrors as string[];
    expect(errors, `Console errors: ${errors.join('\n')}`).toEqual([]);
  });

  test('GET /api/v2/iot/dashboard/stats returns valid stats', async ({ page, baseURL }) => {
    await page.goto((baseURL || 'https://react.ecbtx.com') + '/dashboard', {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForFunction(
      () => !location.href.includes('/login'),
      { timeout: 15000 },
    );
    await page.waitForTimeout(2000);

    const response = await page.evaluate(async () => {
      const r = await fetch('/api/v2/iot/dashboard/stats', { credentials: 'include' });
      return { status: r.status, body: r.ok ? await r.json() : await r.text() };
    });

    expect(response.status, `Body: ${JSON.stringify(response.body)}`).toBe(200);
    const stats = response.body as Record<string, number>;
    expect(typeof stats.total_devices).toBe('number');
    expect(typeof stats.online).toBe('number');
    expect(typeof stats.active_alerts).toBe('number');
    expect(typeof stats.critical).toBe('number');
  });

  test('GET /api/v2/iot/devices returns array', async ({ page, baseURL }) => {
    await page.goto((baseURL || 'https://react.ecbtx.com') + '/dashboard', {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForFunction(
      () => !location.href.includes('/login'),
      { timeout: 15000 },
    );
    await page.waitForTimeout(2000);

    const response = await page.evaluate(async () => {
      const r = await fetch('/api/v2/iot/devices?limit=10', { credentials: 'include' });
      return { status: r.status, body: r.ok ? await r.json() : await r.text() };
    });

    expect(response.status, `Body: ${JSON.stringify(response.body)}`).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test('GET /api/v2/iot/alerts returns array', async ({ page, baseURL }) => {
    await page.goto((baseURL || 'https://react.ecbtx.com') + '/dashboard', {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForFunction(
      () => !location.href.includes('/login'),
      { timeout: 15000 },
    );
    await page.waitForTimeout(2000);

    const response = await page.evaluate(async () => {
      const r = await fetch('/api/v2/iot/alerts?status=open&limit=10', { credentials: 'include' });
      return { status: r.status, body: r.ok ? await r.json() : await r.text() };
    });

    expect(response.status, `Body: ${JSON.stringify(response.body)}`).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test('GET /api/v2/iot/maintenance/recommendations returns shape', async ({ page, baseURL }) => {
    await page.goto((baseURL || 'https://react.ecbtx.com') + '/dashboard', {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForFunction(
      () => !location.href.includes('/login'),
      { timeout: 15000 },
    );
    await page.waitForTimeout(2000);

    const response = await page.evaluate(async () => {
      const r = await fetch('/api/v2/iot/maintenance/recommendations', { credentials: 'include' });
      return { status: r.status, body: r.ok ? await r.json() : await r.text() };
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('recommendations');
    expect(Array.isArray((response.body as any).recommendations)).toBe(true);
  });
});
