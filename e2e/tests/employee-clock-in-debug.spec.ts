import { test, expect } from "@playwright/test";

/**
 * Employee Portal Clock-In Debug Test
 * Captures ALL network traffic to identify failing endpoints
 */

test.describe("Employee Portal Clock-In Debug", () => {
  let networkLog: Array<{
    method: string;
    url: string;
    status: number;
    requestBody?: any;
    responseBody?: any;
  }> = [];

  test.beforeEach(async ({ page }) => {
    networkLog = [];

    // Intercept all requests
    page.on("request", (request) => {
      const url = request.url();
      if (url.includes("/api/v2/")) {
        const log = {
          method: request.method(),
          url: url.replace("https://react-crm-api-production.up.railway.app", ""),
          status: 0,
          requestBody: request.postDataJSON(),
        };
        networkLog.push(log);
      }
    });

    // Intercept all responses
    page.on("response", async (response) => {
      const url = response.url();
      if (url.includes("/api/v2/")) {
        const logEntry = networkLog.find((l) => l.url === url.replace("https://react-crm-api-production.up.railway.app", "") && l.status === 0);
        if (logEntry) {
          logEntry.status = response.status();
          try {
            logEntry.responseBody = await response.json();
          } catch {
            // Not JSON
          }
        }
      }
    });

    // Grant geolocation permission and mock coordinates
    await page.context().grantPermissions(["geolocation"]);
    await page.context().setGeolocation({
      latitude: 29.864755,
      longitude: -97.946829,
    });
  });

  test("1. Page Load - Capture initial network traffic", async ({ page }) => {
    console.log("\n=== TEST 1: PAGE LOAD ===");

    // Navigate to login
    await page.goto("https://react.ecbtx.com/login");
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.click('button[type="submit"]');

    // Wait for login to complete
    await page.waitForFunction(() => !window.location.href.includes("/login"), {
      timeout: 10000,
    });

    // Navigate to employee portal
    networkLog = []; // Reset log to focus on employee portal
    await page.goto("https://react.ecbtx.com/employee");
    await page.waitForTimeout(3000); // Wait for all requests to complete

    console.log("\n📋 Network Requests on Page Load:");
    networkLog.forEach((log) => {
      const statusColor = log.status >= 500 ? "🔴" : log.status >= 400 ? "🟡" : "🟢";
      console.log(`  ${statusColor} ${log.method} ${log.url} → ${log.status}`);
      if (log.status >= 400) {
        console.log(`     Error: ${JSON.stringify(log.responseBody || {}).substring(0, 200)}`);
      }
    });

    // Capture screenshot
    await page.screenshot({ path: "/tmp/employee-portal-loaded.png", fullPage: true });
    console.log("\n📸 Screenshot saved to /tmp/employee-portal-loaded.png");
  });

  test("2. Clock In - Capture network traffic on button click", async ({ page }) => {
    console.log("\n=== TEST 2: CLOCK IN ===");

    // Login
    await page.goto("https://react.ecbtx.com/login");
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => !window.location.href.includes("/login"));

    // Go to employee portal
    await page.goto("https://react.ecbtx.com/employee");
    await page.waitForTimeout(2000);

    // Find and click Clock In button
    networkLog = []; // Reset log
    const clockInButton = page.getByRole("button", { name: /Clock In/i }).first();

    console.log("\n🎯 Clicking Clock In button...");
    await clockInButton.click();

    // Wait for network requests
    await page.waitForTimeout(3000);

    console.log("\n📋 Network Requests on Clock In:");
    networkLog.forEach((log) => {
      const statusColor = log.status >= 500 ? "🔴" : log.status >= 400 ? "🟡" : "🟢";
      console.log(`  ${statusColor} ${log.method} ${log.url} → ${log.status}`);
      if (log.requestBody) {
        console.log(`     Request: ${JSON.stringify(log.requestBody)}`);
      }
      if (log.status >= 400 && log.responseBody) {
        console.log(`     Response: ${JSON.stringify(log.responseBody).substring(0, 300)}`);
      }
    });

    // Check button state
    await page.waitForTimeout(1000);
    const buttonText = await clockInButton.textContent();
    console.log(`\n🔘 Button text after click: "${buttonText}"`);

    // Capture screenshot
    await page.screenshot({ path: "/tmp/employee-portal-after-clock-in.png", fullPage: true });
    console.log("\n📸 Screenshot saved to /tmp/employee-portal-after-clock-in.png");

    // Check for any error toasts
    const errorToast = page.locator('[role="alert"], .toast, .notification').filter({ hasText: /error|fail/i });
    if (await errorToast.count() > 0) {
      console.log(`\n⚠️ Error toast detected: ${await errorToast.first().textContent()}`);
    }
  });

  test("3. Check TimeClock Status Endpoint", async ({ page, request }) => {
    console.log("\n=== TEST 3: TIMECLOCK STATUS ENDPOINT ===");

    // Login to get session cookie
    await page.goto("https://react.ecbtx.com/login");
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => !window.location.href.includes("/login"));

    // Extract session cookie
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === "session");

    if (!sessionCookie) {
      console.log("❌ No session cookie found!");
      return;
    }

    // Test endpoints directly
    const endpoints = [
      "/api/v2/employee/dashboard",
      "/api/v2/employee/timeclock/status",
      "/api/v2/employee/jobs",
      "/api/v2/gps/config",
      "/api/v2/gps/geofences",
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(`https://react-crm-api-production.up.railway.app${endpoint}`, {
        headers: {
          Cookie: `session=${sessionCookie.value}`,
        },
      });

      const statusColor = response.status() >= 500 ? "🔴" : response.status() >= 400 ? "🟡" : "🟢";
      console.log(`  ${statusColor} GET ${endpoint} → ${response.status()}`);

      if (response.status() >= 400) {
        const body = await response.text();
        console.log(`     Error: ${body.substring(0, 200)}`);
      } else {
        const json = await response.json();
        console.log(`     Response: ${JSON.stringify(json).substring(0, 150)}...`);
      }
    }
  });

  test.afterAll(async () => {
    console.log("\n" + "=".repeat(80));
    console.log("SUMMARY OF FAILING ENDPOINTS:");
    console.log("=".repeat(80));

    const failedRequests = networkLog.filter((l) => l.status >= 400);
    if (failedRequests.length === 0) {
      console.log("✅ NO FAILURES DETECTED!");
    } else {
      failedRequests.forEach((log) => {
        console.log(`\n❌ ${log.method} ${log.url} → ${log.status}`);
        if (log.requestBody) console.log(`   Request: ${JSON.stringify(log.requestBody)}`);
        if (log.responseBody) console.log(`   Response: ${JSON.stringify(log.responseBody)}`);
      });
    }
  });
});
