import { test, expect } from "@playwright/test";

/**
 * Employee Portal Clock-In Verification Test
 * Tests the full clock-in flow with GPS and without
 */

test.describe("Employee Portal Clock-In Verification", () => {
  test.beforeEach(async ({ page }) => {
    // Grant geolocation permission and set coordinates
    await page.context().grantPermissions(["geolocation"]);
    await page.context().setGeolocation({
      latitude: 29.864755,
      longitude: -97.946829,
    });
  });

  test("Clock-In with GPS should succeed", async ({ page }) => {
    console.log("\n=== VERIFICATION TEST: Clock-In with GPS ===");

    // Track network requests
    const requests: Array<{ url: string; status: number; method: string }> = [];
    page.on("response", async (response) => {
      if (response.url().includes("/api/v2/employee/timeclock/clock-in")) {
        requests.push({
          url: response.url(),
          status: response.status(),
          method: response.request().method(),
        });
        console.log(`📡 POST /clock-in → ${response.status()}`);
        if (response.status() === 200 || response.status() === 201) {
          const body = await response.json();
          console.log(`✅ Response: ${JSON.stringify(body, null, 2)}`);
        } else {
          const body = await response.text();
          console.log(`❌ Error: ${body.substring(0, 300)}`);
        }
      }
    });

    // Login
    await page.goto("https://react.ecbtx.com/login");
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => !window.location.href.includes("/login"));

    // Navigate to employee portal
    await page.goto("https://react.ecbtx.com/employee");
    await page.waitForTimeout(2000);

    // Check initial button state
    const clockButton = page.getByRole("button", { name: /Clock (In|Out)/i }).first();
    const initialText = await clockButton.textContent();
    console.log(`🔘 Initial button state: "${initialText}"`);

    // If already clocked in, clock out first
    if (initialText?.includes("Out")) {
      console.log("⏸️ Already clocked in, clocking out first...");
      await clockButton.click();
      await page.waitForTimeout(3000);
    }

    // Now click Clock In
    console.log("🎯 Clicking Clock In...");
    await page.waitForTimeout(1000);
    const clockInButton = page.getByRole("button", { name: /Clock In/i }).first();
    await clockInButton.click();

    // Wait for request to complete
    await page.waitForTimeout(4000);

    // Verify request was made
    expect(requests.length).toBeGreaterThan(0);
    const clockInRequest = requests.find((r) => r.method === "POST");
    expect(clockInRequest).toBeDefined();

    // Verify success (200 or 201)
    if (clockInRequest) {
      console.log(`\n✓ Clock-in request status: ${clockInRequest.status}`);
      expect([200, 201]).toContain(clockInRequest.status);
    }

    // Verify UI updated
    const newButtonText = await clockButton.textContent();
    console.log(`🔘 Button after clock-in: "${newButtonText}"`);

    // Check for error toasts
    const errorToast = page.locator('[role="alert"]').filter({ hasText: /error|fail/i });
    const errorCount = await errorToast.count();
    if (errorCount > 0) {
      const errorText = await errorToast.first().textContent();
      console.log(`⚠️ Error toast found: ${errorText}`);
      expect(errorCount).toBe(0); // Fail if errors present
    }

    // Verify no console errors related to clock-in
    const logs: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        logs.push(msg.text());
      }
    });
    await page.waitForTimeout(1000);

    const clockInErrors = logs.filter(
      (l) => l.includes("clock") || l.includes("404") || l.includes("422") || l.includes("500"),
    );
    if (clockInErrors.length > 0) {
      console.log(`❌ Console errors: ${clockInErrors.join(", ")}`);
    }
    expect(clockInErrors.length).toBe(0);

    console.log("\n✅ Clock-In verification PASSED!");
  });

  test("Clock-In without GPS should succeed", async ({ page }) => {
    console.log("\n=== VERIFICATION TEST: Clock-In without GPS ===");

    // Deny geolocation to simulate GPS failure
    await page.context().clearPermissions();

    const requests: Array<{ url: string; status: number }> = [];
    page.on("response", async (response) => {
      if (response.url().includes("/api/v2/employee/timeclock/clock-in")) {
        requests.push({
          url: response.url(),
          status: response.status(),
        });
        console.log(`📡 POST /clock-in (no GPS) → ${response.status()}`);
      }
    });

    // Login
    await page.goto("https://react.ecbtx.com/login");
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => !window.location.href.includes("/login"));

    // Navigate to employee portal
    await page.goto("https://react.ecbtx.com/employee");
    await page.waitForTimeout(2000);

    // Clock out if needed
    const clockButton = page.getByRole("button", { name: /Clock (In|Out)/i }).first();
    const initialText = await clockButton.textContent();
    if (initialText?.includes("Out")) {
      await clockButton.click();
      await page.waitForTimeout(3000);
    }

    // Click Clock In (without GPS)
    console.log("🎯 Clicking Clock In (GPS will fail)...");
    const clockInButton = page.getByRole("button", { name: /Clock In/i }).first();
    await clockInButton.click();
    await page.waitForTimeout(4000);

    // Verify request succeeded even without GPS
    expect(requests.length).toBeGreaterThan(0);
    const clockInRequest = requests[requests.length - 1];
    console.log(`\n✓ Clock-in status (no GPS): ${clockInRequest.status}`);

    // Should succeed with 200/201, not 422 validation error
    expect([200, 201]).toContain(clockInRequest.status);

    console.log("\n✅ Clock-In without GPS verification PASSED!");
  });
});
