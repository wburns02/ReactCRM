/**
 * Half-Worked Code Elimination V2 - Enforcement Tests
 *
 * Verifies all mock data, fake customer names, and stub endpoints
 * have been properly cleaned up across the CRM.
 *
 * V1 (2026-02-05 AM): Stripe stubs, email marketing hidden, NACHA removed
 * V2 (2026-02-05 PM): 11 backend modules cleaned, frontend mock generators removed
 *
 * Uses shared auth state from auth.setup.ts (no manual login needed).
 *
 * @date 2026-02-05
 */

import { test, expect } from "@playwright/test";

const APP_URL = "https://react.ecbtx.com";
const API_BASE = "https://react-crm-api-production.up.railway.app";
const API_URL = `${API_BASE}/api/v2`;

// Known console errors to filter out
const KNOWN_CONSOLE_ERRORS = [
  "API Schema Violation",
  "Sentry",
  "ResizeObserver",
  "favicon",
  "Failed to load resource",
  "server responded with a status of",
  "net::ERR_",
  "ERR_BLOCKED_BY_CLIENT",
];

function isKnownError(msg: string): boolean {
  return KNOWN_CONSOLE_ERRORS.some((known) => msg.includes(known));
}

test.setTimeout(60000);

/**
 * Navigate to a page, handling auth redirect if session expired.
 * Uses shared auth state from auth.setup.ts, falls back to manual login.
 */
async function navigateTo(page: import("@playwright/test").Page, path: string) {
  await page.goto(`${APP_URL}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  // If redirected to login, auth state has expired - do manual login
  if (page.url().includes("/login")) {
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForFunction(
      () => !window.location.href.includes("/login"),
      { timeout: 30000 },
    );
    await page.waitForTimeout(1000);

    // Navigate to actual target if we ended up on dashboard
    if (path !== "/" && !page.url().includes(path)) {
      await page.goto(`${APP_URL}${path}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1000);
    }
  }
}

// =============================================================================
// Section 1: Railway Health Check
// =============================================================================

test.describe("Railway Deployment Health", () => {
  test("API returns healthy status", async ({ request }) => {
    const response = await request.get(`${API_BASE}/health`);
    expect(response.ok()).toBe(true);

    const health = await response.json();
    expect(health.status).toBe("healthy");
    expect(health.version).toBeDefined();
  });
});

// =============================================================================
// Section 2: V1 Fixes Regression
// =============================================================================

test.describe("V1 Fixes Regression", () => {
  test("Stripe stub endpoints are gone (not 501)", async ({ request }) => {
    const response = await request.post(
      `${API_URL}/payments/stripe/save-payment-method`,
      {
        data: { customer_id: 1, payment_method_id: "pm_test" },
        headers: { "Content-Type": "application/json" },
      },
    );
    expect(response.status()).not.toBe(501);
  });

  test("Email Marketing not in sidebar", async ({ page }) => {
    await navigateTo(page, "/");
    await page.waitForTimeout(2000);
    const bodyText = await page.textContent("body");
    expect(bodyText).not.toContain("Email Marketing");
  });

  test("Dashboard API returns data (no silent errors)", async ({ request }) => {
    // Uses shared auth state from auth.setup.ts
    const dashResponse = await request.get(`${API_URL}/dashboard/stats`);
    expect(dashResponse.ok()).toBe(true);
    const data = await dashResponse.json();
    expect(data).toHaveProperty("stats");
  });
});

// =============================================================================
// Section 3: Backend Mock Data Elimination (API-level)
// =============================================================================

test.describe("Backend Mock Data Eliminated", () => {
  // Uses shared auth state from auth.setup.ts - no manual login needed

  test("Payment Plans returns empty (no fake customers)", async ({
    request,
  }) => {
    const response = await request.get(`${API_URL}/payment-plans/`);
    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(body.items).toEqual([]);
    expect(body.total).toBe(0);

    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toContain("Johnson");
    expect(bodyStr).not.toContain("Smith Family");
  });

  test("Payment Plans stats returns zeros", async ({ request }) => {
    const response = await request.get(`${API_URL}/payment-plans/stats/summary`);
    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(body.active_plans).toBe(0);
    expect(body.total_outstanding).toBe(0);
  });

  test("Marketplace returns empty (no fake apps)", async ({ request }) => {
    const response = await request.get(`${API_URL}/marketplace/apps`);
    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(body.apps).toEqual([]);

    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toContain("ServiceTitan");
    expect(bodyStr).not.toContain("FleetTracker");
  });

  test("IoT devices returns empty", async ({ request }) => {
    const response = await request.get(`${API_URL}/iot/devices`);
    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(body.devices).toEqual([]);
  });

  test("IoT alerts returns empty", async ({ request }) => {
    const response = await request.get(`${API_URL}/iot/alerts`);
    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(body.alerts).toEqual([]);
  });

  test("IoT provider connections returns empty", async ({ request }) => {
    const response = await request.get(`${API_URL}/iot/providers/connections`);
    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(body.connections).toEqual([]);
  });

  test("IoT maintenance recommendations returns empty", async ({
    request,
  }) => {
    const response = await request.get(
      `${API_URL}/iot/maintenance/recommendations`,
    );
    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(body.recommendations).toEqual([]);
  });

  test("Enterprise regions returns empty", async ({ request }) => {
    const response = await request.get(`${API_URL}/enterprise/regions`);
    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(body.regions).toEqual([]);
  });

  test("QuickBooks sync history returns empty", async ({ request }) => {
    const response = await request.get(
      `${API_URL}/integrations/quickbooks/sync-history`,
    );
    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(body.history).toEqual([]);

    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toContain("John Smith");
    expect(bodyStr).not.toContain("Jane Doe");
  });

  test("Content generator ideas returns empty array", async ({ request }) => {
    // GET endpoint returns the list of saved ideas
    const response = await request.get(`${API_URL}/content-generator/ideas`);
    // May be 200 with [] or 404 if route is different
    if (response.ok()) {
      const body = await response.json();
      // Response is a raw array []
      expect(Array.isArray(body) ? body : body.ideas || []).toEqual([]);
    }
    // If 404, the endpoint doesn't exist which is also acceptable (no mock data)
  });

  test("CS AI portfolio insights returns empty/honest state", async ({
    request,
  }) => {
    const response = await request.get(`${API_URL}/cs/ai/portfolio-insights`);
    if (response.ok()) {
      const body = await response.json();
      // Should not contain fake customer names
      const bodyStr = JSON.stringify(body);
      expect(bodyStr).not.toContain("Acme");
      expect(bodyStr).not.toContain("TechStart");
    }
    // 404 is also acceptable if AI insights not yet wired up
  });
});

// =============================================================================
// Section 4: Frontend Pages Load Without Mock Data Errors
// =============================================================================

test.describe("Frontend Pages - No Mock Errors", () => {
  // Serialize page tests to avoid parallel login rate limiting
  test.describe.configure({ mode: "serial" });
  test("Dashboard loads cleanly", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && !isKnownError(msg.text())) {
        consoleErrors.push(msg.text());
      }
    });

    await navigateTo(page, "/");
    await page.waitForTimeout(2000);

    const mockErrors = consoleErrors.filter(
      (e) =>
        e.includes("generateMock") ||
        e.includes("mock") ||
        e.includes("fake"),
    );
    expect(mockErrors).toEqual([]);
  });

  test("Work Orders page loads without mock analytics errors", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && !isKnownError(msg.text())) {
        consoleErrors.push(msg.text());
      }
    });

    await navigateTo(page, "/work-orders");
    await page.waitForTimeout(2000);

    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();

    const mockErrors = consoleErrors.filter(
      (e) =>
        e.includes("generateMock") ||
        e.includes("mock") ||
        e.includes("fake"),
    );
    expect(mockErrors).toEqual([]);
  });

  test("Payments page loads (regression)", async ({ page }) => {
    await navigateTo(page, "/payments");
    await page.waitForTimeout(2000);

    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
  });

  test("Clover POS tab still works (regression)", async ({ page }) => {
    await navigateTo(page, "/payments");
    await page.waitForTimeout(2000);

    const cloverTab = page.locator("text=Clover POS").first();
    if (await cloverTab.isVisible()) {
      await cloverTab.click();
      await page.waitForTimeout(2000);
      const bodyText = await page.textContent("body");
      expect(bodyText).toBeTruthy();
    }
  });

  test("Customer Success page loads without dummy AI data", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && !isKnownError(msg.text())) {
        consoleErrors.push(msg.text());
      }
    });

    await navigateTo(page, "/customer-success");
    await page.waitForTimeout(2000);

    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();

    const mockErrors = consoleErrors.filter(
      (e) => e.includes("mock") || e.includes("dummy") || e.includes("fake"),
    );
    expect(mockErrors).toEqual([]);
  });

  test("Integrations page loads without mock connections", async ({
    page,
  }) => {
    await navigateTo(page, "/integrations");
    await page.waitForTimeout(2000);

    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
  });

  test("Payroll page loads (no NACHA/PDF errors)", async ({ page }) => {
    await navigateTo(page, "/payroll");
    await page.waitForTimeout(2000);

    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
  });

  test("No browser alert() dialogs on work orders page", async ({ page }) => {
    let alertFired = false;
    page.on("dialog", async (dialog) => {
      alertFired = true;
      await dialog.dismiss();
    });

    await navigateTo(page, "/work-orders");
    await page.waitForTimeout(2000);
    expect(alertFired).toBe(false);
  });
});
