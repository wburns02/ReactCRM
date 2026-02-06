import { test, expect, Page, BrowserContext } from "@playwright/test";

/**
 * Phase 1 Quick Wins E2E Test Suite
 *
 * Tests for:
 * 1. 422 Validation Errors - page_size/limit parameters
 * 2. 405 Method Not Allowed - GET /notifications/preferences
 * 3. 500 Internal Errors - async session misuse, general failures
 *
 * Covers pages: /analytics/ftfr, /analytics/bi, /equipment/health, /tracking, /settings/notifications
 */

const BASE_URL = "https://react.ecbtx.com";
const API_URL = "https://react-crm-api-production.up.railway.app/api/v2";

// Auth credentials (from MEMORY.md)
const TEST_USER_EMAIL = "will@macseptic.com";
const TEST_USER_PASSWORD = "#Espn2025";

// Network error collectors
interface NetworkError {
  url: string;
  status: number;
  statusText: string;
  method: string;
}

let authPage: Page;
let errors422: NetworkError[] = [];
let errors405: NetworkError[] = [];
let errors500: NetworkError[] = [];
let consoleErrors: string[] = [];

test.describe("Phase 1 Quick Wins - Production Site", () => {
  test.beforeAll(async ({ browser }) => {
    // Login once and reuse auth across all tests
    const context = await browser.newContext();
    authPage = await context.newPage();

    // Navigate to login
    await authPage.goto(`${BASE_URL}/login`);

    // Fill credentials
    await authPage.fill('input[name="email"], input[type="email"]', TEST_USER_EMAIL);
    await authPage.fill('input[name="password"], input[type="password"]', TEST_USER_PASSWORD);

    // Submit and wait for redirect
    await authPage.click('button[type="submit"]');
    await authPage.waitForFunction(() => !location.href.includes("/login"), { timeout: 10000 });

    console.log("✅ Authentication successful");
  });

  test.beforeEach(({ page }) => {
    // Reset error collectors
    errors422 = [];
    errors405 = [];
    errors500 = [];
    consoleErrors = [];

    // Setup network monitoring
    page.on("response", (response) => {
      const url = response.url();
      const status = response.status();
      const method = response.request().method();

      // Collect 422 errors
      if (status === 422) {
        errors422.push({ url, status, statusText: response.statusText(), method });
        console.error(`❌ 422 Validation Error: ${method} ${url}`);
      }

      // Collect 405 errors
      if (status === 405) {
        errors405.push({ url, status, statusText: response.statusText(), method });
        console.error(`❌ 405 Method Not Allowed: ${method} ${url}`);
      }

      // Collect 500+ errors
      if (status >= 500) {
        errors500.push({ url, status, statusText: response.statusText(), method });
        console.error(`❌ ${status} Server Error: ${method} ${url}`);
      }
    });

    // Setup console monitoring (filter known noisy errors)
    page.on("console", (msg) => {
      const text = msg.text();
      const type = msg.type();

      // Filter out known acceptable console messages (from MEMORY.md)
      const ignoredPatterns = [
        "API Schema Violation",
        "Sentry",
        "ResizeObserver",
        "favicon",
        "Failed to load resource",
        "server responded with a status of"
      ];

      if (type === "error" && !ignoredPatterns.some(pattern => text.includes(pattern))) {
        consoleErrors.push(text);
        console.error(`Console Error: ${text}`);
      }
    });
  });

  test("1. Analytics FTFR Dashboard - No 422 errors on page_size", async () => {
    const page = await authPage.context().newPage();

    // Apply response listener
    errors422 = [];
    page.on("response", (response) => {
      if (response.status() === 422) {
        errors422.push({
          url: response.url(),
          status: 422,
          statusText: response.statusText(),
          method: response.request().method()
        });
      }
    });

    // Navigate to FTFR analytics page
    await page.goto(`${BASE_URL}/analytics/ftfr`, { waitUntil: "networkidle", timeout: 30000 });

    // Wait for data to load
    await page.waitForTimeout(3000);

    // Assert no 422 errors
    expect(errors422.length).toBe(0);
    if (errors422.length > 0) {
      console.error("422 Errors found:", errors422);
    }

    await page.close();
  });

  test("2. Analytics BI Dashboard - No 422 errors on page_size", async () => {
    const page = await authPage.context().newPage();

    errors422 = [];
    page.on("response", (response) => {
      if (response.status() === 422) {
        errors422.push({
          url: response.url(),
          status: 422,
          statusText: response.statusText(),
          method: response.request().method()
        });
      }
    });

    // Navigate to BI analytics page
    await page.goto(`${BASE_URL}/analytics/bi`, { waitUntil: "networkidle", timeout: 30000 });

    await page.waitForTimeout(3000);

    expect(errors422.length).toBe(0);
    if (errors422.length > 0) {
      console.error("422 Errors found:", errors422);
    }

    await page.close();
  });

  test("3. Equipment Health Page - No 422 errors on equipment queries", async () => {
    const page = await authPage.context().newPage();

    errors422 = [];
    page.on("response", (response) => {
      if (response.status() === 422) {
        errors422.push({
          url: response.url(),
          status: 422,
          statusText: response.statusText(),
          method: response.request().method()
        });
      }
    });

    // Navigate to equipment health page
    await page.goto(`${BASE_URL}/equipment/health`, { waitUntil: "networkidle", timeout: 30000 });

    await page.waitForTimeout(3000);

    expect(errors422.length).toBe(0);
    if (errors422.length > 0) {
      console.error("422 Errors found:", errors422);
    }

    await page.close();
  });

  test("4. Tracking Page - No 422 errors on GPS/geofence queries", async () => {
    const page = await authPage.context().newPage();

    errors422 = [];
    errors500 = [];
    page.on("response", (response) => {
      const status = response.status();
      if (status === 422) {
        errors422.push({
          url: response.url(),
          status: 422,
          statusText: response.statusText(),
          method: response.request().method()
        });
      }
      if (status >= 500) {
        errors500.push({
          url: response.url(),
          status,
          statusText: response.statusText(),
          method: response.request().method()
        });
      }
    });

    // Navigate to tracking page
    await page.goto(`${BASE_URL}/tracking`, { waitUntil: "networkidle", timeout: 30000 });

    await page.waitForTimeout(5000); // GPS data may take longer

    expect(errors422.length).toBe(0);
    expect(errors500.length).toBe(0);

    if (errors422.length > 0) {
      console.error("422 Errors found:", errors422);
    }
    if (errors500.length > 0) {
      console.error("500 Errors found:", errors500);
    }

    await page.close();
  });

  test("5. Notification Settings - No 405 on GET /preferences", async () => {
    const page = await authPage.context().newPage();

    errors405 = [];
    let preferencesRequests: NetworkError[] = [];

    page.on("response", (response) => {
      const url = response.url();
      const status = response.status();

      // Track any preferences endpoint calls
      if (url.includes("/preferences")) {
        preferencesRequests.push({
          url,
          status,
          statusText: response.statusText(),
          method: response.request().method()
        });
      }

      if (status === 405) {
        errors405.push({
          url,
          status,
          statusText: response.statusText(),
          method: response.request().method()
        });
      }
    });

    // Navigate to notification settings
    await page.goto(`${BASE_URL}/settings/notifications`, { waitUntil: "networkidle", timeout: 30000 });

    await page.waitForTimeout(3000);

    // Assert no 405 errors
    expect(errors405.length).toBe(0);

    if (errors405.length > 0) {
      console.error("405 Errors found:", errors405);
    }

    // Log which preferences endpoints were called
    console.log("Preferences API calls:", preferencesRequests);

    await page.close();
  });

  test("6. No 500 errors across affected pages", async () => {
    const page = await authPage.context().newPage();

    errors500 = [];
    page.on("response", (response) => {
      if (response.status() >= 500) {
        errors500.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          method: response.request().method()
        });
      }
    });

    // Test all affected pages in sequence
    const pages = [
      "/analytics/ftfr",
      "/analytics/bi",
      "/equipment/health",
      "/tracking",
      "/settings/notifications"
    ];

    for (const pagePath of pages) {
      console.log(`Testing ${pagePath}...`);
      await page.goto(`${BASE_URL}${pagePath}`, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(2000);
    }

    expect(errors500.length).toBe(0);

    if (errors500.length > 0) {
      console.error("500 Errors found:", errors500);
    }

    await page.close();
  });

  test("7. Direct API test - GET /push-notifications/preferences (200 expected)", async ({ request }) => {
    // Test the actual API endpoint directly
    const response = await request.get(`${API_URL}/push-notifications/preferences`, {
      headers: {
        // Note: May need session cookie for auth - will test and see
      }
    });

    console.log(`GET /push-notifications/preferences: ${response.status()} ${response.statusText()}`);

    // Should NOT be 405 (may be 401 if auth required)
    expect(response.status()).not.toBe(405);

    // If 200, check response structure
    if (response.status() === 200) {
      const data = await response.json();
      console.log("Preferences response:", data);
    }
  });

  test("8. Direct API test - Validate page_size limits", async ({ request }) => {
    // Test various endpoints with high page_size values
    const endpoints = [
      { path: "/work-orders", maxExpected: 500 },
      { path: "/invoices", maxExpected: 100 },
      { path: "/equipment", maxExpected: 100 },
      { path: "/gps/geofences/events", maxExpected: 1000 }, // Current outlier
    ];

    for (const { path, maxExpected } of endpoints) {
      // Try page_size at max limit (should work)
      const validResponse = await request.get(`${API_URL}${path}?page_size=${maxExpected}`);
      console.log(`GET ${path}?page_size=${maxExpected}: ${validResponse.status()}`);

      // Should be 200 or 401 (auth), NOT 422
      expect([200, 401, 403]).toContain(validResponse.status());

      // Try page_size over limit (should get 422)
      const invalidResponse = await request.get(`${API_URL}${path}?page_size=${maxExpected + 100}`);
      console.log(`GET ${path}?page_size=${maxExpected + 100}: ${invalidResponse.status()}`);

      // May get 422 or may succeed if we fix the limits
      // Just log for now, don't assert
    }
  });
});

test.describe("Phase 1 - Summary Report", () => {
  test("Generate error summary", async () => {
    console.log("\n=== PHASE 1 QUICK WINS ERROR SUMMARY ===");
    console.log(`422 Validation Errors: ${errors422.length}`);
    console.log(`405 Method Not Allowed: ${errors405.length}`);
    console.log(`500+ Server Errors: ${errors500.length}`);
    console.log(`Console Errors: ${consoleErrors.length}`);

    if (errors422.length > 0) {
      console.log("\n422 Errors Details:");
      errors422.forEach(e => console.log(`  - ${e.method} ${e.url}`));
    }

    if (errors405.length > 0) {
      console.log("\n405 Errors Details:");
      errors405.forEach(e => console.log(`  - ${e.method} ${e.url}`));
    }

    if (errors500.length > 0) {
      console.log("\n500+ Errors Details:");
      errors500.forEach(e => console.log(`  - ${e.status} ${e.method} ${e.url}`));
    }

    // This test always passes - just for reporting
    expect(true).toBe(true);
  });
});
