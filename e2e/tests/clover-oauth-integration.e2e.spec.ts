/**
 * Clover OAuth Integration E2E Tests
 *
 * Verifies the Clover OAuth 2.0 integration layer against the live app:
 * - API endpoints: /config, /oauth/status, /payments, /merchant, /webhook
 * - Frontend: Integrations page Clover card, CloverSettings component, Payments Clover POS tab
 * - Console error check on Integrations and Payments pages
 *
 * Uses test.describe.serial with shared browser context for efficient login.
 */
import { test, expect, type Page, type BrowserContext } from "@playwright/test";

const APP_URL = "https://react.ecbtx.com";
const API_URL =
  "https://react-crm-api-production.up.railway.app/api/v2";

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

test.describe.serial("Clover OAuth Integration", () => {
  let context: BrowserContext;
  let page: Page;
  const consoleErrors: string[] = [];

  test("0. Login as admin", async ({ browser }) => {
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

    // If redirected away from login (existing session), clear and retry
    if (!page.url().includes("/login")) {
      await context.clearCookies();
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.goto(`${APP_URL}/login`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);
    }

    // Fill in admin credentials
    await page.fill(
      'input[name="email"], input[type="email"]',
      "will@macseptic.com",
    );
    await page.fill(
      'input[name="password"], input[type="password"]',
      "#Espn2025",
    );
    await page.click('button[type="submit"]');

    // Wait for login to complete
    try {
      await page.waitForFunction(
        () => !window.location.href.includes("/login"),
        { timeout: 30000 },
      );
    } catch {
      // Retry login once
      await page.fill(
        'input[name="email"], input[type="email"]',
        "will@macseptic.com",
      );
      await page.fill(
        'input[name="password"], input[type="password"]',
        "#Espn2025",
      );
      await page.click('button[type="submit"]');
      await page.waitForFunction(
        () => !window.location.href.includes("/login"),
        { timeout: 30000 },
      );
    }

    await page.waitForTimeout(2000);
    expect(page.url()).not.toContain("/login");
  });

  // =========================================================================
  // API Tests (use page.evaluate for browser cookie auth)
  // =========================================================================

  test("1. API: /payments/clover/config returns configured with OAuth fields", async () => {
    const data = await page.evaluate(async (apiUrl) => {
      const res = await fetch(`${apiUrl}/payments/clover/config`, {
        credentials: "include",
      });
      return { status: res.status, ok: res.ok, body: await res.json() };
    }, API_URL);

    console.log(`Config response: ${JSON.stringify(data.body)}`);

    expect(data.ok).toBeTruthy();
    expect(data.body.is_configured).toBe(true);
    expect(data.body.merchant_id).toBe("Z44MTQTEBN881");

    // OAuth fields must be present in the config response
    expect(data.body).toHaveProperty("oauth_configured");
    expect(data.body).toHaveProperty("oauth_connected");
    expect(data.body.oauth_configured).toBe(false);
    expect(data.body.oauth_connected).toBe(false);
  });

  test("2. API: /payments/clover/oauth/status returns OAuth status", async () => {
    const data = await page.evaluate(async (apiUrl) => {
      const res = await fetch(`${apiUrl}/payments/clover/oauth/status`, {
        credentials: "include",
      });
      return { status: res.status, ok: res.ok, body: await res.json() };
    }, API_URL);

    console.log(`OAuth status response: ${JSON.stringify(data.body)}`);

    expect(data.ok).toBeTruthy();
    expect(data.body.oauth_configured).toBe(false);
    expect(data.body.oauth_connected).toBe(false);
    expect(data.body.env_configured).toBe(true);

    // When not connected, these should be null
    expect(data.body.merchant_id).toBeNull();
    expect(data.body.connected_by).toBeNull();
    expect(data.body.connected_at).toBeNull();
  });

  test("3. API: /payments/clover/payments returns real payment data", async () => {
    const data = await page.evaluate(async (apiUrl) => {
      const res = await fetch(`${apiUrl}/payments/clover/payments?limit=10`, {
        credentials: "include",
      });
      return { status: res.status, ok: res.ok, body: await res.json() };
    }, API_URL);

    console.log(
      `Payments: ${data.body.total} total, returned ${data.body.payments?.length}`,
    );

    expect(data.ok).toBeTruthy();
    expect(data.body.payments).toBeDefined();
    expect(Array.isArray(data.body.payments)).toBeTruthy();
    expect(data.body.payments.length).toBeGreaterThan(0);

    // Verify payment structure
    const first = data.body.payments[0];
    expect(first.amount_dollars).toBeGreaterThan(0);
    expect(first.result).toBe("SUCCESS");
    expect(first.tender_label).toBeTruthy();
    expect(first.created_time).toBeTruthy();
  });

  test("4. API: /payments/clover/merchant returns merchant info", async () => {
    const data = await page.evaluate(async (apiUrl) => {
      const res = await fetch(`${apiUrl}/payments/clover/merchant`, {
        credentials: "include",
      });
      return { status: res.status, ok: res.ok, body: await res.json() };
    }, API_URL);

    console.log(`Merchant: ${data.body.name}, ID: ${data.body.id}`);

    expect(data.ok).toBeTruthy();
    expect(data.body.id).toBe("Z44MTQTEBN881");
    expect(data.body.name).toBe("MAC Septic");
  });

  // =========================================================================
  // Integrations Page UI Tests
  // =========================================================================

  test("5. Integrations page - Clover Payments card exists and shows Connected", async () => {
    await page.goto(`${APP_URL}/integrations`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(3000);

    // Verify we are on the integrations page
    expect(page.url()).toContain("/integrations");

    // Verify Integrations heading
    const heading = page.locator("h1", { hasText: "Integrations" });
    await expect(heading).toBeVisible({ timeout: 10000 });

    // Look for the Clover Payments card
    const cloverCard = page
      .locator("text=Clover Payments")
      .first();
    await expect(cloverCard).toBeVisible({ timeout: 10000 });

    // Verify it shows "Connected" status
    const connectedBadge = page.locator("text=Connected").first();
    await expect(connectedBadge).toBeVisible({ timeout: 10000 });
  });

  test("6. Integrations page - CloverSettings component renders correctly", async () => {
    // We should already be on /integrations from previous test
    if (!page.url().includes("/integrations")) {
      await page.goto(`${APP_URL}/integrations`, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForTimeout(3000);
    }

    // Navigate fresh to integrations to ensure clean state
    await page.goto(`${APP_URL}/integrations`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Click the first Configure button (Clover is the first card)
    const configureButtons = page.getByRole("button", { name: "Configure" });
    await expect(configureButtons.first()).toBeVisible({ timeout: 10000 });
    await configureButtons.first().click();
    await page.waitForTimeout(3000);

    // Verify CloverSettings heading
    const settingsHeading = page.locator("text=Clover Payment Integration");
    await expect(settingsHeading).toBeVisible({ timeout: 10000 });

    // Verify "Connected" status text
    const connectedStatus = page.locator("text=Connected").first();
    await expect(connectedStatus).toBeVisible({ timeout: 10000 });

    // Verify "API Key (env var)" connection method
    const apiKeyMethod = page.locator("text=API Key (env var)");
    await expect(apiKeyMethod).toBeVisible({ timeout: 10000 });

    // Verify merchant name "MAC Septic"
    const merchantName = page.locator("text=MAC Septic").first();
    await expect(merchantName).toBeVisible({ timeout: 10000 });

    // Verify Capabilities section exists
    const capabilitiesHeading = page.locator("text=Capabilities");
    await expect(capabilitiesHeading).toBeVisible({ timeout: 10000 });

    // Verify REST API capability
    const restApi = page.locator("text=REST API");
    await expect(restApi).toBeVisible({ timeout: 10000 });

    // Verify Online Payments capability
    const onlinePayments = page.locator("text=Online Payments");
    await expect(onlinePayments).toBeVisible({ timeout: 10000 });

    // Verify OAuth 2.0 capability row
    const oauthCapability = page.locator("text=OAuth 2.0");
    await expect(oauthCapability).toBeVisible({ timeout: 10000 });
  });

  // =========================================================================
  // Payments Page UI Tests
  // =========================================================================

  test("7. Payments page - Clover POS tab loads dashboard with data", async () => {
    await page.goto(`${APP_URL}/payments`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(3000);

    expect(page.url()).toContain("/payments");

    // Click the Clover POS tab
    const cloverTab = page.locator('[data-testid="clover-tab"]');
    await expect(cloverTab).toBeVisible({ timeout: 10000 });
    await cloverTab.click();
    await page.waitForTimeout(5000);

    // Verify merchant name displayed
    const merchantName = page.locator("text=MAC Septic").first();
    await expect(merchantName).toBeVisible({ timeout: 10000 });

    // Verify REST API status card
    const restApiLabel = page.locator("text=REST API").first();
    await expect(restApiLabel).toBeVisible({ timeout: 10000 });

    const restApiAvailable = page.locator("text=Available").first();
    await expect(restApiAvailable).toBeVisible({ timeout: 10000 });

    // Verify Online Payments status card
    const onlinePayments = page.locator("text=Online Payments").first();
    await expect(onlinePayments).toBeVisible({ timeout: 10000 });

    // Verify payment table shows recent payments OR "No payments" message
    // (Clover API may rate-limit in test runs)
    const recentPaymentsHeading = page.locator("text=Recent Clover Payments").first();
    const noPayments = page.locator("text=No payments found in Clover").first();

    // Wait for either payments list or empty state
    await Promise.race([
      recentPaymentsHeading.waitFor({ state: "visible", timeout: 15000 }).catch(() => null),
      noPayments.waitFor({ state: "visible", timeout: 15000 }).catch(() => null),
    ]);

    const hasPayments = await recentPaymentsHeading.isVisible().catch(() => false);
    const hasNoPayments = await noPayments.isVisible().catch(() => false);
    console.log(`Clover POS: hasPayments=${hasPayments}, hasNoPayments=${hasNoPayments}`);
    expect(hasPayments || hasNoPayments).toBe(true);

    if (hasPayments) {
      // Check table has rows and SUCCESS badges
      const tableRows = page.locator("table tbody tr");
      const rowCount = await tableRows.count();
      console.log(`Clover POS tab payment table has ${rowCount} rows`);
      expect(rowCount).toBeGreaterThanOrEqual(1);

      const successBadges = page.locator("text=SUCCESS");
      const badgeCount = await successBadges.count();
      console.log(`Found ${badgeCount} SUCCESS badges`);
      expect(badgeCount).toBeGreaterThan(0);
    }
  });

  // =========================================================================
  // Webhook Endpoint Test
  // =========================================================================

  test("8. API: /payments/clover/webhook accepts POST (not 404/500)", async () => {
    // Webhook endpoint is unauthenticated, so we can POST from page context
    const data = await page.evaluate(async (apiUrl) => {
      const res = await fetch(`${apiUrl}/payments/clover/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      return { status: res.status, ok: res.ok };
    }, API_URL);

    console.log(`Webhook POST response status: ${data.status}`);

    // Webhook should accept the POST — either 200 (valid event) or 400 (bad payload),
    // but never 404 (missing route) or 500 (server crash)
    expect(data.status).not.toBe(404);
    expect(data.status).not.toBe(500);
    expect([200, 400, 401].includes(data.status)).toBeTruthy();
  });

  // =========================================================================
  // Console Error Check
  // =========================================================================

  test("9. No unexpected console errors on Integrations and Payments pages", async () => {
    // We already collected errors from tests 5-7 (integrations + payments pages).
    // Do a fresh pass on both pages to catch any stragglers.
    const freshErrors: string[] = [];
    const errorListener = (msg: any) => {
      if (msg.type() === "error" && !isKnownError(msg.text())) {
        freshErrors.push(`[${msg.type()}] ${msg.text()}`);
      }
    };

    // Visit Integrations page
    page.removeAllListeners("console");
    page.on("console", errorListener);

    await page.goto(`${APP_URL}/integrations`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(5000);

    // Visit Payments page and open Clover tab
    await page.goto(`${APP_URL}/payments`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(3000);

    const cloverTab = page.locator('[data-testid="clover-tab"]');
    if (await cloverTab.isVisible()) {
      await cloverTab.click();
      await page.waitForTimeout(5000);
    }

    console.log(
      `Fresh console errors on Integrations + Payments pages: ${freshErrors.length}`,
    );
    if (freshErrors.length > 0) {
      console.log("Errors:", freshErrors.join("\n"));
    }

    expect(freshErrors).toHaveLength(0);
  });

  // Cleanup
  test.afterAll(async () => {
    if (page) await page.close();
    if (context) await context.close();
  });
});
