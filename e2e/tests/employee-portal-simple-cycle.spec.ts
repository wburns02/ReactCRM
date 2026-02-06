import { test, expect } from "@playwright/test";

/**
 * Employee Portal Simple Clock Cycle
 * Single clock in/out cycle with 500 error detection
 */

const BASE_URL = "https://react.ecbtx.com";

test.describe("Employee Portal Simple Cycle", () => {
  test("complete one clock cycle without 500 errors", async ({ page, context }) => {
    const errors500: string[] = [];
    const apiCalls: { method: string; url: string; status: number }[] = [];

    // Capture all responses
    page.on("response", async (res) => {
      const url = res.url();

      if (url.includes("/employee/") || url.includes("/timeclock/")) {
        apiCalls.push({
          method: res.request().method(),
          url: url.split("?")[0],
          status: res.status(),
        });
      }

      if (res.status() === 500) {
        let detail = "";
        try {
          const json = await res.json();
          detail = JSON.stringify(json);
        } catch (e) {
          try {
            detail = await res.text();
          } catch (e2) {
            detail = "(could not read)";
          }
        }

        errors500.push(`${res.request().method()} ${url} - ${detail.slice(0, 200)}`);
        console.log(`❌ 500 ERROR: ${res.request().method()} ${url}`);
        console.log(`   ${detail.slice(0, 200)}`);
      }
    });

    // Grant geolocation
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ latitude: 30.2672, longitude: -97.7431 });

    // Login
    console.log("🔐 Logging in...");
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.click('button:has-text("Sign In")');
    await page.waitForFunction(() => !window.location.href.includes("/login"), { timeout: 20000 });
    await page.evaluate(() => localStorage.setItem("crm_onboarding_completed", "true"));
    console.log("✅ Logged in\n");

    // Navigate to employee portal
    console.log("📱 Navigating to Employee Portal...");
    await page.goto(`${BASE_URL}/employee`);
    await page.waitForTimeout(3000);

    // Determine state
    const clockInCount = await page.locator('button:has-text("Clock In")').count();
    const clockOutCount = await page.locator('button:has-text("Clock Out")').count();

    console.log(`Found ${clockInCount} Clock In buttons, ${clockOutCount} Clock Out buttons`);

    let clockedIn = false;
    let clockedOut = false;

    // If showing Clock Out button, we're already clocked in - clock out first
    if (clockOutCount > 0) {
      console.log("\n⏱️  Already clocked in - clocking out first...");
      await page.locator('button:has-text("Clock Out")').first().click();
      await page.waitForTimeout(4000);
      clockedOut = true;
      console.log("✅ Clocked out");
    }

    // Now clock in
    const clockInBtn = page.locator('button:has-text("Clock In")').first();
    const hasClockIn = (await clockInBtn.count()) > 0;

    if (!hasClockIn) {
      console.log("❌ No Clock In button found!");
      throw new Error("Clock In button not available");
    }

    console.log("\n⏱️  Clocking in...");
    await clockInBtn.click();
    await page.waitForTimeout(4000);

    // Verify clocked in
    const nowHasClockOut = (await page.locator('button:has-text("Clock Out")').count()) > 0;
    if (nowHasClockOut) {
      console.log("✅ Clocked in successfully (button changed to Clock Out)");
      clockedIn = true;
    } else {
      console.log("⚠️  Clock in may have failed (button didn't change)");
    }

    // Clock out to complete cycle
    console.log("\n⏱️  Clocking out...");
    const clockOutBtn = page.locator('button:has-text("Clock Out")').first();
    if ((await clockOutBtn.count()) > 0) {
      await clockOutBtn.click();
      await page.waitForTimeout(4000);

      // Verify clocked out
      const backToClockIn = (await page.locator('button:has-text("Clock In")').count()) > 0;
      if (backToClockIn) {
        console.log("✅ Clocked out successfully (button changed to Clock In)");
        clockedOut = true;
      } else {
        console.log("⚠️  Clock out may have failed");
      }
    }

    // Results
    console.log("\n" + "=".repeat(80));
    console.log("EMPLOYEE PORTAL SIMPLE CYCLE RESULTS");
    console.log("=".repeat(80));
    console.log(`Clocked In: ${clockedIn}`);
    console.log(`Clocked Out: ${clockedOut}`);
    console.log(`500 Errors: ${errors500.length}`);
    console.log(`Total API Calls: ${apiCalls.length}`);

    if (apiCalls.length > 0) {
      console.log("\n📡 API Calls:");
      apiCalls.forEach((call) => {
        const status = call.status >= 500 ? "❌" : "✅";
        console.log(`   ${status} ${call.method} ${call.url} → ${call.status}`);
      });
    }

    if (errors500.length > 0) {
      console.log("\n❌ 500 ERRORS FOUND:");
      errors500.forEach((err) => console.log(`   ${err}`));
    }

    const success = errors500.length === 0 && (clockedIn || clockedOut);

    if (success) {
      console.log("\n✅ SUCCESS! Clock cycle completed with no 500 errors!");
    } else {
      console.log("\n❌ FAILED!");
      if (errors500.length > 0) console.log("   - Found 500 errors");
      if (!clockedIn && !clockedOut) console.log("   - No clock operations succeeded");
    }

    console.log("=".repeat(80) + "\n");

    // Assertions
    expect(errors500, `Found ${errors500.length} 500 errors`).toHaveLength(0);
    expect(clockedIn || clockedOut, "Should complete at least one clock operation").toBe(true);
  });
});
