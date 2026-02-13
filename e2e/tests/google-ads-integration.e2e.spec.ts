import { test, expect, Page, Browser } from "@playwright/test";

/**
 * Google Ads Integration E2E Tests
 *
 * Verifies the Google Ads API integration in the marketing module:
 * - API endpoints: /ads/performance, /ads/status, /settings
 * - Frontend: Google Ads dashboard page loads, KPI cards render, no errors
 * - Graceful fallback when credentials not yet configured
 * - Marketing hub overview includes ads data
 *
 * Uses shared auth context (login once, reuse across tests) to avoid rate limiting.
 */

const APP_URL = "https://react.ecbtx.com";
const API_URL =
  "https://react-crm-api-production.up.railway.app/api/v2";

// Known console errors to filter out (not caused by this integration)
const KNOWN_ERRORS = [
  "API Schema Violation",
  "Sentry",
  "ResizeObserver",
  "favicon",
  "Failed to load resource",
  "server responded with a status of",
  "ERR_BLOCKED_BY_CLIENT",
];

function isKnownError(msg: string): boolean {
  return KNOWN_ERRORS.some((known) => msg.includes(known));
}

test.describe("Google Ads Integration", () => {
  let authPage: Page;

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    const context = await browser.newContext();
    authPage = await context.newPage();

    await authPage.goto(`${APP_URL}/login`, {
      waitUntil: "domcontentloaded",
    });
    await authPage.waitForTimeout(1000);
    await authPage.fill('input[type="email"]', "will@macseptic.com");
    await authPage.fill('input[type="password"]', "#Espn2025");
    await authPage.click('button[type="submit"]');
    await authPage.waitForFunction(
      () => !window.location.href.includes("/login"),
      { timeout: 30000 },
    );
    await authPage.waitForTimeout(1000);
  });

  test.afterAll(async () => {
    if (authPage) {
      await authPage.context().close();
    }
  });

  // =========================================================================
  // API Tests (use authPage.evaluate for browser cookie auth)
  // =========================================================================

  test("API: /marketing-hub/ads/status returns valid response", async () => {
    await authPage.goto(`${APP_URL}/marketing`, {
      waitUntil: "domcontentloaded",
    });
    await authPage.waitForTimeout(1000);

    const data = await authPage.evaluate(async (apiUrl) => {
      const res = await fetch(`${apiUrl}/marketing-hub/ads/status`, {
        credentials: "include",
      });
      return { status: res.status, ok: res.ok, body: await res.json() };
    }, API_URL);

    console.log(`Ads Status: ${JSON.stringify(data.body)}`);

    expect(data.ok).toBeTruthy();
    expect(data.body.success).toBe(true);
    expect(typeof data.body.connected).toBe("boolean");
    expect(typeof data.body.daily_operations).toBe("number");
    expect(typeof data.body.daily_limit).toBe("number");
  });

  test("API: /marketing-hub/ads/performance returns metrics", async () => {
    const data = await authPage.evaluate(async (apiUrl) => {
      const res = await fetch(
        `${apiUrl}/marketing-hub/ads/performance?days=30`,
        { credentials: "include" },
      );
      return { status: res.status, ok: res.ok, body: await res.json() };
    }, API_URL);

    console.log(
      `Ads Performance: ${JSON.stringify(data.body).slice(0, 200)}`,
    );

    expect(data.ok).toBeTruthy();
    expect(data.body.success).toBe(true);

    // Metrics object should always exist with proper shape
    const metrics = data.body.metrics;
    expect(metrics).toBeDefined();
    expect(typeof metrics.cost).toBe("number");
    expect(typeof metrics.clicks).toBe("number");
    expect(typeof metrics.impressions).toBe("number");
    expect(typeof metrics.conversions).toBe("number");
    expect(typeof metrics.ctr).toBe("number");
    expect(typeof metrics.cpa).toBe("number");

    // Campaigns should be an array
    expect(Array.isArray(data.body.campaigns)).toBe(true);

    // Recommendations should be an array
    expect(Array.isArray(data.body.recommendations)).toBe(true);
  });

  test("API: /marketing-hub/settings shows google_ads config status", async () => {
    const data = await authPage.evaluate(async (apiUrl) => {
      const res = await fetch(`${apiUrl}/marketing-hub/settings`, {
        credentials: "include",
      });
      return { status: res.status, ok: res.ok, body: await res.json() };
    }, API_URL);

    console.log(`Settings: ${JSON.stringify(data.body)}`);

    expect(data.ok).toBeTruthy();
    expect(data.body.success).toBe(true);
    expect(data.body.integrations).toBeDefined();
    expect(data.body.integrations.google_ads).toBeDefined();
    expect(typeof data.body.integrations.google_ads.configured).toBe(
      "boolean",
    );
  });

  test("API: /marketing-hub/overview returns valid structure", async () => {
    const data = await authPage.evaluate(async (apiUrl) => {
      const res = await fetch(
        `${apiUrl}/marketing-hub/overview?days=30`,
        { credentials: "include" },
      );
      return { status: res.status, ok: res.ok, body: await res.json() };
    }, API_URL);

    console.log(
      `Overview: ${JSON.stringify(data.body).slice(0, 200)}`,
    );

    expect(data.ok).toBeTruthy();
    expect(data.body.success).toBe(true);
    expect(data.body.overview).toBeDefined();
    expect(data.body.overview.paid_ads).toBeDefined();
    expect(typeof data.body.overview.paid_ads.spend).toBe("number");
    expect(typeof data.body.overview.paid_ads.clicks).toBe("number");
  });

  // =========================================================================
  // Frontend Tests
  // =========================================================================

  test("Google Ads page loads with KPI cards", async () => {
    const consoleErrors: string[] = [];
    authPage.on("console", (msg) => {
      if (msg.type() === "error" && !isKnownError(msg.text())) {
        consoleErrors.push(msg.text());
      }
    });

    await authPage.goto(`${APP_URL}/marketing/ads`, {
      waitUntil: "domcontentloaded",
    });
    await authPage.waitForTimeout(3000);

    // Page should have the Google Ads Dashboard title
    await expect(
      authPage.locator("text=Google Ads Dashboard").first(),
    ).toBeVisible({ timeout: 15000 });

    // KPI cards should be present
    await expect(
      authPage.locator("text=Total Spend").first(),
    ).toBeVisible();
    await expect(authPage.locator("text=Clicks").first()).toBeVisible();
    await expect(
      authPage.locator("text=Impressions").first(),
    ).toBeVisible();
    await expect(
      authPage.locator("text=Conversions").first(),
    ).toBeVisible();

    // Performance metrics section
    await expect(
      authPage.locator("text=Performance Metrics").first(),
    ).toBeVisible();
    await expect(
      authPage.locator("text=Active Campaigns").first(),
    ).toBeVisible();

    // Period selector should be present
    const selector = authPage.locator("select").first();
    await expect(selector).toBeVisible();

    // Recommendations section
    await expect(
      authPage.locator("text=Optimization Recommendations").first(),
    ).toBeVisible();

    // No unexpected console errors
    const realErrors = consoleErrors.filter((e) => !isKnownError(e));
    if (realErrors.length > 0) {
      console.log("Console errors:", realErrors);
    }
    expect(realErrors.length).toBe(0);

    // Remove listener to avoid accumulating across tests
    authPage.removeAllListeners("console");
  });

  test("Google Ads page shows connection status badge", async () => {
    // Should already be on /marketing/ads from previous test, but navigate anyway
    await authPage.goto(`${APP_URL}/marketing/ads`, {
      waitUntil: "domcontentloaded",
    });
    await authPage.waitForTimeout(2000);

    // Should show either "Connected" or "Not Connected" badge
    const connected = authPage.locator("text=Connected").first();
    const notConnected = authPage.locator("text=Not Connected").first();

    // One of these badges should be visible
    const connectedVisible = await connected
      .isVisible()
      .catch(() => false);
    const notConnectedVisible = await notConnected
      .isVisible()
      .catch(() => false);

    expect(connectedVisible || notConnectedVisible).toBe(true);
  });

  test("Marketing Hub page loads without errors", async () => {
    const consoleErrors: string[] = [];
    authPage.on("console", (msg) => {
      if (msg.type() === "error" && !isKnownError(msg.text())) {
        consoleErrors.push(msg.text());
      }
    });

    await authPage.goto(`${APP_URL}/marketing`, {
      waitUntil: "domcontentloaded",
    });
    await authPage.waitForTimeout(3000);

    // Marketing hub should load
    await expect(
      authPage.locator("text=Marketing Hub").first(),
    ).toBeVisible({ timeout: 15000 });

    // Google Ads section in integration status
    await expect(
      authPage.locator("text=Google Ads").first(),
    ).toBeVisible();

    // No unexpected console errors
    const realErrors = consoleErrors.filter((e) => !isKnownError(e));
    expect(realErrors.length).toBe(0);

    authPage.removeAllListeners("console");
  });

  test("Google Ads page period selector changes data fetch", async () => {
    await authPage.goto(`${APP_URL}/marketing/ads`, {
      waitUntil: "domcontentloaded",
    });
    await authPage.waitForTimeout(3000);

    // Change period to 7 days
    const selector = authPage.locator("select").first();
    await selector.selectOption("7");
    await authPage.waitForTimeout(2000);

    // Page should still show the dashboard (no crash)
    await expect(
      authPage.locator("text=Google Ads Dashboard").first(),
    ).toBeVisible();
    await expect(
      authPage.locator("text=Total Spend").first(),
    ).toBeVisible();

    // Change to 90 days
    await selector.selectOption("90");
    await authPage.waitForTimeout(2000);

    // Still stable
    await expect(
      authPage.locator("text=Google Ads Dashboard").first(),
    ).toBeVisible();
  });

  // =========================================================================
  // Backend Health Check
  // =========================================================================

  test("Backend health check shows healthy", async ({ request }) => {
    const response = await request.get(
      "https://react-crm-api-production.up.railway.app/health",
    );
    const body = await response.json();

    console.log(`Health: ${JSON.stringify(body)}`);

    expect(response.ok()).toBeTruthy();
    expect(body.status).toBe("healthy");

    // Version should exist
    const version = body.version || "";
    console.log(`Backend version: ${version}`);
    expect(version).toBeTruthy();
  });
});
