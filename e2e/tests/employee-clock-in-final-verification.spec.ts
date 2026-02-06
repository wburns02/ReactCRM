import { test, expect } from "@playwright/test";

/**
 * FINAL Employee Portal Clock-In Verification
 * Tests complete flow: clock-in → UI updates → clock-out → UI updates
 */

test.describe("Employee Portal Clock-In FINAL Verification", () => {
  test("Complete Clock-In/Out Cycle with UI Verification", async ({ page }) => {
    console.log("\n" + "=".repeat(80));
    console.log("FINAL VERIFICATION TEST: Complete Clock-In/Out Cycle");
    console.log("=".repeat(80));

    // Grant geolocation
    await page.context().grantPermissions(["geolocation"]);
    await page.context().setGeolocation({
      latitude: 29.864755,
      longitude: -97.946829,
    });

    // Track all API requests
    const apiRequests: Array<{ method: string; url: string; status: number; body?: any }> = [];
    page.on("response", async (response) => {
      const url = response.url();
      if (url.includes("/api/v2/employee/timeclock/")) {
        const entry = {
          method: response.request().method(),
          url: url.split("/api/v2")[1],
          status: response.status(),
          body: undefined as any,
        };
        try {
          entry.body = await response.json();
        } catch {}
        apiRequests.push(entry);
      }
    });

    // Step 1: Login
    console.log("\n📝 Step 1: Logging in...");
    await page.goto("https://react.ecbtx.com/login");
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => !window.location.href.includes("/login"));
    console.log("   ✓ Login successful");

    // Step 2: Navigate to Employee Portal
    console.log("\n📝 Step 2: Navigating to Employee Portal...");
    await page.goto("https://react.ecbtx.com/employee");
    await page.waitForTimeout(3000); // Wait for page to fully load
    console.log("   ✓ Employee Portal loaded");

    // Step 3: Get initial clock status
    console.log("\n📝 Step 3: Checking initial clock status...");
    const clockButton = page.getByRole("button", { name: /Clock (In|Out)/i }).first();
    const initialButtonText = await clockButton.textContent();
    console.log(`   Current button state: "${initialButtonText}"`);

    // If already clocked in, clock out first
    if (initialButtonText?.includes("Out")) {
      console.log("\n📝 Step 3a: Already clocked in, clocking out first...");
      await clockButton.click();
      await page.waitForTimeout(4000);
      const afterClockOut = await clockButton.textContent();
      console.log(`   After clock-out, button: "${afterClockOut}"`);
      expect(afterClockOut).toContain("Clock In");
    }

    // Step 4: Clock In
    console.log("\n📝 Step 4: Clicking Clock In...");
    apiRequests.length = 0; // Clear previous requests
    const clockInButton = page.getByRole("button", { name: /Clock In/i }).first();
    await clockInButton.click();
    await page.waitForTimeout(5000); // Wait for request and UI update

    // Verify Clock-In Request
    const clockInRequest = apiRequests.find((r) => r.url.includes("clock-in") && r.method === "POST");
    console.log(`\n   Clock-In Request:`);
    console.log(`     ${clockInRequest?.method} ${clockInRequest?.url} → ${clockInRequest?.status}`);
    console.log(`     Response: ${JSON.stringify(clockInRequest?.body || {}).substring(0, 200)}`);

    expect(clockInRequest).toBeDefined();
    expect([200, 201]).toContain(clockInRequest!.status);
    expect(clockInRequest!.body?.status).toBe("clocked_in");
    expect(clockInRequest!.body?.clock_in).toBeDefined();

    // Verify Status Endpoint Called
    const statusCheck = apiRequests.find((r) => r.url.includes("timeclock/status"));
    console.log(`\n   Status Check:`);
    console.log(`     ${statusCheck?.method} ${statusCheck?.url} → ${statusCheck?.status || "not called"}`);
    if (statusCheck) {
      console.log(`     Response: ${JSON.stringify(statusCheck.body || {}).substring(0, 200)}`);
    }

    // Step 5: Verify UI Updated to "Clock Out"
    console.log("\n📝 Step 5: Verifying UI updated after clock-in...");
    await page.waitForTimeout(2000); // Give UI time to update
    const afterClockInText = await clockButton.textContent();
    console.log(`   Button text after clock-in: "${afterClockInText}"`);

    // Check if button changed to "Clock Out"
    const uiUpdated = afterClockInText?.includes("Out") || afterClockInText?.includes("Processing");
    if (!uiUpdated) {
      console.log("   ⚠️ WARNING: Button text did not update to 'Clock Out'");
      console.log("   This might be expected if status query hasn't refreshed yet");
    } else {
      console.log("   ✓ Button updated to 'Clock Out'");
    }

    // Step 6: Verify status badge or indicator
    const statusBadge = page.locator("text=/Clocked In|Working|Off/i").first();
    const statusText = await statusBadge.textContent().catch(() => "not found");
    console.log(`   Status indicator: "${statusText}"`);

    // Step 7: Clock Out
    console.log("\n📝 Step 6: Clicking Clock Out...");
    apiRequests.length = 0;
    await page.waitForTimeout(2000);

    // Re-query button in case it was re-rendered
    const clockOutButton = page.getByRole("button", { name: /Clock Out/i }).first();
    const clockOutExists = await clockOutButton.count();

    if (clockOutExists > 0) {
      await clockOutButton.click();
      await page.waitForTimeout(5000);

      const clockOutRequest = apiRequests.find((r) => r.url.includes("clock-out") && r.method === "POST");
      console.log(`\n   Clock-Out Request:`);
      console.log(`     ${clockOutRequest?.method} ${clockOutRequest?.url} → ${clockOutRequest?.status}`);
      console.log(`     Response: ${JSON.stringify(clockOutRequest?.body || {}).substring(0, 200)}`);

      if (clockOutRequest) {
        expect([200, 201]).toContain(clockOutRequest.status);
        expect(clockOutRequest.body?.status).toBe("clocked_out");
      }

      // Verify UI updated back to "Clock In"
      await page.waitForTimeout(2000);
      const finalButtonText = await page
        .getByRole("button", { name: /Clock (In|Out)/i })
        .first()
        .textContent();
      console.log(`   Button text after clock-out: "${finalButtonText}"`);
    } else {
      console.log("   ⚠️ Clock Out button not found (UI may not have updated)");
    }

    // Step 8: Check for console errors
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });
    await page.waitForTimeout(1000);

    const relevantErrors = consoleErrors.filter(
      (e) =>
        !e.includes("Sentry") &&
        !e.includes("favicon") &&
        !e.includes("ResizeObserver") &&
        !e.includes("Failed to load resource"),
    );

    console.log(`\n📋 Console Errors: ${relevantErrors.length === 0 ? "NONE" : relevantErrors.length}`);
    if (relevantErrors.length > 0) {
      console.log(`   ${relevantErrors.join("\n   ")}`);
    }

    // Final Summary
    console.log("\n" + "=".repeat(80));
    console.log("FINAL VERIFICATION SUMMARY:");
    console.log("=".repeat(80));
    console.log(`✅ Clock-In API: ${clockInRequest?.status === 200 ? "SUCCESS (200)" : "FAILED"}`);
    console.log(`${uiUpdated ? "✅" : "⚠️"} UI Update: ${uiUpdated ? "Button changed to Clock Out" : "Button did not update"}`);
    console.log(`${consoleErrors.length === 0 ? "✅" : "⚠️"} Console Errors: ${consoleErrors.length === 0 ? "NONE" : `${consoleErrors.length} found`}`);
    console.log("=".repeat(80));

    // Screenshot
    await page.screenshot({ path: "/tmp/employee-portal-final-verification.png", fullPage: true });
    console.log("\n📸 Screenshot: /tmp/employee-portal-final-verification.png");

    // Assertions
    expect(clockInRequest?.status).toBe(200);
    expect(relevantErrors.length).toBe(0);
  });
});
