import { test, expect } from "@playwright/test";

/**
 * Employee Portal Clock Cycle Test
 * Complete clock in/out cycle with 500 error detection
 */

const BASE_URL = "https://react.ecbtx.com";

test.describe("Employee Portal Clock Cycle", () => {
  test("complete clock in/out cycle without errors", async ({ page, context }) => {
    const errors500: { url: string; method: string; detail?: any }[] = [];
    const successNotifications: string[] = [];

    // Capture 500 errors
    page.on("response", async (res) => {
      if (res.status() === 500) {
        let detail;
        try {
          detail = await res.json();
        } catch (e) {
          try {
            detail = await res.text();
          } catch (e2) {
            detail = null;
          }
        }

        errors500.push({
          url: res.url(),
          method: res.request().method(),
          detail,
        });

        console.log(`❌ 500 ERROR: ${res.request().method()} ${res.url()}`);
        if (detail) {
          console.log(`   Detail: ${JSON.stringify(detail).slice(0, 300)}`);
        }
      }

      // Log successful clock requests
      if (res.status() === 200 && res.url().includes("/employee/clock")) {
        console.log(`✅ ${res.request().method()} ${res.url()} → 200 OK`);
      }
    });

    // Grant geolocation permission
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ latitude: 30.2672, longitude: -97.7431 });

    // Login
    console.log("🔐 Logging in...");
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.click('button:has-text("Sign In")');

    await page.waitForFunction(() => !window.location.href.includes("/login"), {
      timeout: 20000,
    });

    console.log("✅ Logged in");

    await page.evaluate(() => {
      localStorage.setItem("crm_onboarding_completed", "true");
    });

    // Navigate to employee portal
    console.log("\n📱 Navigating to Employee Portal...");
    await page.goto(`${BASE_URL}/employee`);
    await page.waitForTimeout(3000);

    // Determine current state
    const clockInButton = page.locator('button:has-text("Clock In")');
    const clockOutButton = page.locator('button:has-text("Clock Out")');

    const hasClockedIn = (await clockOutButton.count()) > 0;
    const hasClockIn = (await clockInButton.count()) > 0;

    console.log(`Current state: ${hasClockedIn ? "Clocked IN" : "Clocked OUT"}`);

    let performedClockIn = false;
    let performedClockOut = false;

    // If already clocked in, clock out first
    if (hasClockedIn) {
      console.log("\n⏱️  Clocking OUT (already clocked in)...");
      await clockOutButton.first().click();
      await page.waitForTimeout(3000);

      // Verify clock out succeeded
      const nowHasClockIn = (await page.locator('button:has-text("Clock In")').count()) > 0;
      if (nowHasClockIn) {
        console.log("✅ Successfully clocked out!");
        performedClockOut = true;
      } else {
        console.log("⚠️  Clock out may have failed - button didn't change");
      }

      await page.waitForTimeout(1000);
    }

    // Now clock in
    console.log("\n⏱️  Clocking IN...");
    const clockInBtn = page.locator('button:has-text("Clock In")').first();

    if ((await clockInBtn.count()) > 0) {
      await clockInBtn.click();
      console.log("✅ Clicked Clock In button");

      await page.waitForTimeout(3000);

      // Verify clock in succeeded
      const nowHasClockOut = (await page.locator('button:has-text("Clock Out")').count()) > 0;
      if (nowHasClockOut) {
        console.log("✅ Successfully clocked in!");
        performedClockIn = true;

        // Wait to see elapsed time counter
        await page.waitForTimeout(2000);

        // Clock out again
        console.log("\n⏱️  Clocking OUT...");
        await page.locator('button:has-text("Clock Out")').first().click();
        console.log("✅ Clicked Clock Out button");

        await page.waitForTimeout(3000);

        // Verify clock out succeeded
        const finalClockIn = (await page.locator('button:has-text("Clock In")').count()) > 0;
        if (finalClockIn) {
          console.log("✅ Successfully clocked out!");
          performedClockOut = true;
        } else {
          console.log("⚠️  Clock out may have failed");
        }
      } else {
        console.log("⚠️  Clock in may have failed - button didn't change");
      }
    } else {
      console.log("❌ Clock In button not found");
    }

    // Check for notifications (toast messages)
    const toastMessages = await page.locator('[role="status"], [role="alert"], .toast, .notification').allTextContents();
    if (toastMessages.length > 0) {
      console.log("\n📢 Notifications:");
      toastMessages.forEach((msg) => {
        console.log(`  - ${msg}`);
        if (msg.toLowerCase().includes("clock") || msg.toLowerCase().includes("success")) {
          successNotifications.push(msg);
        }
      });
    }

    // Wait for final requests
    await page.waitForTimeout(2000);

    // Results
    console.log("\n" + "=".repeat(80));
    console.log("EMPLOYEE PORTAL CLOCK CYCLE RESULTS");
    console.log("=".repeat(80));
    console.log(`Performed Clock In: ${performedClockIn}`);
    console.log(`Performed Clock Out: ${performedClockOut}`);
    console.log(`500 Errors: ${errors500.length}`);
    console.log(`Success Notifications: ${successNotifications.length}`);

    if (errors500.length > 0) {
      console.log("\n❌ 500 ERRORS FOUND:");
      errors500.forEach((err) => {
        console.log(`\n  ${err.method} ${err.url}`);
        if (err.detail) {
          console.log(`  Detail: ${JSON.stringify(err.detail)}`);
        }
      });
    }

    if (successNotifications.length > 0) {
      console.log("\n✅ SUCCESS NOTIFICATIONS:");
      successNotifications.forEach((msg) => console.log(`  - ${msg}`));
    }

    const testPassed = errors500.length === 0 && (performedClockIn || performedClockOut);

    if (testPassed) {
      console.log("\n✅ SUCCESS! Clock operations completed with no 500 errors!");
    } else if (errors500.length > 0) {
      console.log("\n❌ FAILED! 500 errors detected");
    } else {
      console.log("\n⚠️  No clock operations performed (button state issue)");
    }

    console.log("=".repeat(80) + "\n");

    // Assertions
    expect(errors500, `Found ${errors500.length} 500 errors: ${JSON.stringify(errors500)}`).toHaveLength(0);
    expect(performedClockIn || performedClockOut, "Should perform at least one clock operation").toBe(true);
  });
});
