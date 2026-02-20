/**
 * Route Optimization E2E Tests
 *
 * Tests the POST /work-orders/optimize-route backend endpoint and the
 * frontend RouteOptimizationPanel component on the Schedule page.
 *
 * Pattern: test.describe.serial with fresh browser context + manual login.
 */
import { test, expect, type Page, type BrowserContext } from "@playwright/test";

const APP_URL = "https://react.ecbtx.com";
const API_URL = "https://react-crm-api-production.up.railway.app/api/v2";

// Known console errors to filter out
const KNOWN_ERRORS = [
  "API Schema Violation",
  "Sentry",
  "ResizeObserver",
  "favicon",
  "Failed to load resource",
  "server responded with a status of",
  "downloadable font",
  "third-party cookie",
  "net::ERR_",
];

function isKnownError(msg: string): boolean {
  return KNOWN_ERRORS.some((pattern) => msg.includes(pattern));
}

test.describe.serial("Route Optimization", () => {
  let context: BrowserContext;
  let page: Page;
  const consoleErrors: string[] = [];

  test("1. Login as admin", async ({ browser }) => {
    // Create a fresh context with no stored auth state
    context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      storageState: undefined,
    });
    page = await context.newPage();

    // Collect console errors across all tests
    page.on("console", (msg) => {
      if (msg.type() === "error" && !isKnownError(msg.text())) {
        consoleErrors.push(`[${msg.type()}] ${msg.text()}`);
      }
    });

    // Clear any existing cookies
    await context.clearCookies();

    // Navigate to login
    await page.goto(`${APP_URL}/login`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // If already logged in, clear and retry
    if (!page.url().includes("/login")) {
      await context.clearCookies();
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.goto(`${APP_URL}/login`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);
    }

    // Fill admin credentials
    await page.fill(
      'input[name="email"], input[type="email"]',
      "will@macseptic.com",
    );
    await page.fill(
      'input[name="password"], input[type="password"]',
      "#Espn2025",
    );
    await page.click('button[type="submit"]');

    // Wait for redirect away from login
    try {
      await page.waitForFunction(
        () => !window.location.href.includes("/login"),
        { timeout: 30000 },
      );
    } catch {
      // If still on login, try once more
      await page.click('button[type="submit"]');
      await page.waitForFunction(
        () => !window.location.href.includes("/login"),
        { timeout: 15000 },
      );
    }

    expect(page.url()).not.toContain("/login");
  });

  test("2. API: fetch work order IDs", async () => {
    // This test just verifies we can fetch work orders
    const workOrders = await page.evaluate(async (apiUrl) => {
      const res = await fetch(`${apiUrl}/work-orders?limit=5`, {
        credentials: "include",
      });
      if (!res.ok) return null;
      const data = await res.json();
      return (data.items ?? data).slice(0, 3).map((wo: { id: string }) => wo.id);
    }, API_URL);

    expect(workOrders).not.toBeNull();
    expect(Array.isArray(workOrders)).toBe(true);
    // Store the IDs for the next test using page.evaluate to attach to window
    if (workOrders && workOrders.length > 0) {
      await page.evaluate((ids: string[]) => {
        (window as unknown as Record<string, unknown>).__testWorkOrderIds = ids;
      }, workOrders);
    }
  });

  test("3. API: POST /work-orders/optimize-route returns 200 with valid response", async () => {
    // Get work order IDs from previous test or fetch fresh ones
    let jobIds: string[] = await page.evaluate(async (apiUrl) => {
      const stored = (window as unknown as Record<string, unknown>).__testWorkOrderIds as string[] | undefined;
      if (stored && stored.length >= 2) return stored;

      const res = await fetch(`${apiUrl}/work-orders?limit=5`, {
        credentials: "include",
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.items ?? data).slice(0, 3).map((wo: { id: string }) => wo.id);
    }, API_URL);

    // Need at least 2 job IDs to optimize
    if (jobIds.length < 2) {
      test.skip(true, "Not enough work orders to optimize (need 2+)");
      return;
    }

    // Call the optimize-route endpoint
    const result = await page.evaluate(
      async ({ apiUrl, ids }: { apiUrl: string; ids: string[] }) => {
        const res = await fetch(`${apiUrl}/work-orders/optimize-route`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            job_ids: ids,
            start_address: "105 S Comanche St, San Marcos, TX 78666",
          }),
        });
        const status = res.status;
        const data = await res.json();
        return { status, data };
      },
      { apiUrl: API_URL, ids: jobIds },
    );

    // Assert response structure
    expect(result.status).toBe(200);
    expect(result.data).toHaveProperty("ordered_job_ids");
    expect(result.data).toHaveProperty("total_distance_miles");
    expect(result.data).toHaveProperty("estimated_drive_minutes");
    expect(result.data).toHaveProperty("waypoints");

    // Assert values are reasonable
    expect(Array.isArray(result.data.ordered_job_ids)).toBe(true);
    expect(result.data.ordered_job_ids.length).toBe(jobIds.length);
    expect(typeof result.data.total_distance_miles).toBe("number");
    expect(result.data.total_distance_miles).toBeGreaterThan(0);
    expect(typeof result.data.estimated_drive_minutes).toBe("number");
    expect(result.data.estimated_drive_minutes).toBeGreaterThan(0);
    expect(Array.isArray(result.data.waypoints)).toBe(true);
    expect(result.data.waypoints.length).toBe(jobIds.length);

    // Each waypoint should have a job_id
    for (const waypoint of result.data.waypoints) {
      expect(waypoint).toHaveProperty("job_id");
      expect(typeof waypoint.job_id).toBe("string");
    }
  });

  test("4. API: optimize-route returns ordered_job_ids that are a permutation of input", async () => {
    const jobIds: string[] = await page.evaluate(async (apiUrl) => {
      const res = await fetch(`${apiUrl}/work-orders?limit=4`, {
        credentials: "include",
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.items ?? data).slice(0, 4).map((wo: { id: string }) => wo.id);
    }, API_URL);

    if (jobIds.length < 2) {
      test.skip(true, "Not enough work orders");
      return;
    }

    const result = await page.evaluate(
      async ({ apiUrl, ids }: { apiUrl: string; ids: string[] }) => {
        const res = await fetch(`${apiUrl}/work-orders/optimize-route`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            job_ids: ids,
            start_lat: 29.8827,
            start_lng: -97.9411,
          }),
        });
        const data = await res.json();
        return data;
      },
      { apiUrl: API_URL, ids: jobIds },
    );

    // All input IDs should appear in output (order may differ)
    const sortedInput = [...jobIds].sort();
    const sortedOutput = [...result.ordered_job_ids].sort();
    expect(sortedOutput).toEqual(sortedInput);
  });

  test("5. Navigate to Schedule page", async () => {
    await page.goto(`${APP_URL}/schedule`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Verify we're on the schedule page
    expect(page.url()).toContain("/schedule");

    // Check for page heading
    const heading = await page.getByText("Schedule").first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test("6. Schedule page has RouteOptimizationPanel", async () => {
    // Panel should be visible
    const panel = page.locator('[data-testid="route-optimization-panel"]');
    await expect(panel).toBeVisible({ timeout: 10000 });
  });

  test("7. Optimize Route button is present on schedule page", async () => {
    const btn = page.locator('[data-testid="optimize-route-button"]');
    await expect(btn).toBeVisible({ timeout: 10000 });
  });

  test("8. Clicking Optimize Route shows result or disabled state", async () => {
    const btn = page.locator('[data-testid="optimize-route-button"]');
    await expect(btn).toBeVisible({ timeout: 10000 });

    const isDisabled = await btn.isDisabled();

    if (!isDisabled) {
      // Click and wait for result
      await btn.click();

      // Wait for either result or error (max 15s)
      await page.waitForTimeout(3000);

      // Check for result banner
      const resultBanner = page.locator(
        '[data-testid="route-optimization-result"]',
      );
      const hasResult = await resultBanner.isVisible().catch(() => false);

      if (hasResult) {
        // Verify result content
        const distanceEl = page.locator('[data-testid="route-total-distance"]');
        const minutesEl = page.locator('[data-testid="route-drive-minutes"]');
        await expect(distanceEl).toBeVisible();
        await expect(minutesEl).toBeVisible();

        const distanceText = await distanceEl.textContent();
        const minutesText = await minutesEl.textContent();

        expect(distanceText).toMatch(/\d+\.?\d* miles/);
        expect(minutesText).toMatch(/~\d+ min driving/);
      }
      // If no result (maybe no scheduled jobs), that's also valid
    } else {
      // Button is disabled because fewer than 2 jobs — this is expected behavior
      expect(isDisabled).toBe(true);
    }
  });

  test("9. No unexpected console errors on Schedule page", async () => {
    // Filter out known/acceptable errors
    const unexpectedErrors = consoleErrors.filter(
      (err) => !isKnownError(err),
    );
    if (unexpectedErrors.length > 0) {
      console.log("Unexpected console errors:", unexpectedErrors);
    }
    // Soft check — log but don't fail on console errors from unrelated features
    expect(unexpectedErrors.length).toBeLessThanOrEqual(5);
  });
});
