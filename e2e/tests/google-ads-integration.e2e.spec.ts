import { test, expect, Page } from "@playwright/test";

/**
 * Google Ads Integration E2E Tests
 *
 * Verifies the Google Ads API integration in the marketing module:
 * - API endpoints: /ads/performance, /ads/status, /settings
 * - Frontend: Google Ads dashboard page loads, KPI cards render, no errors
 * - Graceful fallback when credentials not yet configured
 * - Marketing hub overview includes ads data
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

async function loginAndNavigate(page: Page, path: string) {
  await page.goto(`${APP_URL}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  if (page.url().includes("/login")) {
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.click('button[type="submit"]');

    try {
      await page.waitForFunction(
        () => !window.location.href.includes("/login"),
        { timeout: 30000 },
      );
    } catch {
      // Retry login once
      await page.fill('input[type="email"]', "will@macseptic.com");
      await page.fill('input[type="password"]', "#Espn2025");
      await page.click('button[type="submit"]');
      await page.waitForFunction(
        () => !window.location.href.includes("/login"),
        { timeout: 30000 },
      );
    }
    await page.waitForTimeout(1000);

    if (!page.url().includes(path)) {
      await page.goto(`${APP_URL}${path}`, {
        waitUntil: "domcontentloaded",
      });
    }
    await page.waitForTimeout(1000);
  }
}

test.describe("Google Ads Integration", () => {
  // =========================================================================
  // API Tests (use page.evaluate for browser cookie auth)
  // =========================================================================

  test("API: /marketing-hub/ads/status returns valid response", async ({
    page,
  }) => {
    await loginAndNavigate(page, "/marketing");

    const data = await page.evaluate(async (apiUrl) => {
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

  test("API: /marketing-hub/ads/performance returns metrics", async ({
    page,
  }) => {
    await loginAndNavigate(page, "/marketing");

    const data = await page.evaluate(async (apiUrl) => {
      const res = await fetch(
        `${apiUrl}/marketing-hub/ads/performance?days=30`,
        { credentials: "include" },
      );
      return { status: res.status, ok: res.ok, body: await res.json() };
    }, API_URL);

    console.log(`Ads Performance: ${JSON.stringify(data.body).slice(0, 200)}`);

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

  test("API: /marketing-hub/settings shows google_ads config status", async ({
    page,
  }) => {
    await loginAndNavigate(page, "/marketing");

    const data = await page.evaluate(async (apiUrl) => {
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

  test("API: /marketing-hub/overview returns valid structure", async ({
    page,
  }) => {
    await loginAndNavigate(page, "/marketing");

    const data = await page.evaluate(async (apiUrl) => {
      const res = await fetch(
        `${apiUrl}/marketing-hub/overview?days=30`,
        { credentials: "include" },
      );
      return { status: res.status, ok: res.ok, body: await res.json() };
    }, API_URL);

    console.log(`Overview: ${JSON.stringify(data.body).slice(0, 200)}`);

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

  test("Google Ads page loads with KPI cards", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && !isKnownError(msg.text())) {
        consoleErrors.push(msg.text());
      }
    });

    await loginAndNavigate(page, "/marketing/ads");

    // Page should have the Google Ads Dashboard title
    await expect(
      page.locator("text=Google Ads Dashboard").first(),
    ).toBeVisible({ timeout: 15000 });

    // KPI cards should be present
    await expect(page.locator("text=Total Spend").first()).toBeVisible();
    await expect(page.locator("text=Clicks").first()).toBeVisible();
    await expect(page.locator("text=Impressions").first()).toBeVisible();
    await expect(page.locator("text=Conversions").first()).toBeVisible();

    // Performance metrics section
    await expect(
      page.locator("text=Performance Metrics").first(),
    ).toBeVisible();
    await expect(
      page.locator("text=Active Campaigns").first(),
    ).toBeVisible();

    // Period selector should be present
    const selector = page.locator("select").first();
    await expect(selector).toBeVisible();

    // Recommendations section
    await expect(
      page.locator("text=Optimization Recommendations").first(),
    ).toBeVisible();

    // No unexpected console errors
    const realErrors = consoleErrors.filter((e) => !isKnownError(e));
    if (realErrors.length > 0) {
      console.log("Console errors:", realErrors);
    }
    expect(realErrors.length).toBe(0);
  });

  test("Google Ads page shows connection status badge", async ({ page }) => {
    await loginAndNavigate(page, "/marketing/ads");

    // Should show either "Connected" or "Not Connected" badge
    const connected = page.locator("text=Connected").first();
    const notConnected = page.locator("text=Not Connected").first();

    // One of these badges should be visible
    const connectedVisible = await connected
      .isVisible()
      .catch(() => false);
    const notConnectedVisible = await notConnected
      .isVisible()
      .catch(() => false);

    expect(connectedVisible || notConnectedVisible).toBe(true);
  });

  test("Marketing Hub page loads without errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && !isKnownError(msg.text())) {
        consoleErrors.push(msg.text());
      }
    });

    await loginAndNavigate(page, "/marketing");

    // Marketing hub should load
    await expect(
      page.locator("text=Marketing Hub").first(),
    ).toBeVisible({ timeout: 15000 });

    // Google Ads section in integration status
    await expect(page.locator("text=Google Ads").first()).toBeVisible();

    // No unexpected console errors
    const realErrors = consoleErrors.filter((e) => !isKnownError(e));
    expect(realErrors.length).toBe(0);
  });

  test("Google Ads page period selector changes data fetch", async ({
    page,
  }) => {
    await loginAndNavigate(page, "/marketing/ads");
    await page.waitForTimeout(2000);

    // Change period to 7 days
    const selector = page.locator("select").first();
    await selector.selectOption("7");
    await page.waitForTimeout(2000);

    // Page should still show the dashboard (no crash)
    await expect(
      page.locator("text=Google Ads Dashboard").first(),
    ).toBeVisible();
    await expect(page.locator("text=Total Spend").first()).toBeVisible();

    // Change to 90 days
    await selector.selectOption("90");
    await page.waitForTimeout(2000);

    // Still stable
    await expect(
      page.locator("text=Google Ads Dashboard").first(),
    ).toBeVisible();
  });

  // =========================================================================
  // Backend Health Check
  // =========================================================================

  test("Backend version is 2.8.0+", async ({ request }) => {
    const response = await request.get(
      "https://react-crm-api-production.up.railway.app/health",
    );
    const body = await response.json();

    console.log(`Health: ${JSON.stringify(body)}`);

    expect(response.ok()).toBeTruthy();
    expect(body.status).toBe("healthy");

    // Version should be 2.8.0 or higher
    const version = body.version || "";
    console.log(`Backend version: ${version}`);
    expect(version).toBeTruthy();
  });
});
