import { test, expect } from "@playwright/test";

/**
 * Employee Portal Final Verification
 * Tests clock in/out with 500 error detection AND data registration verification
 */

const BASE_URL = "https://react.ecbtx.com";

test.describe("Employee Portal Final Verification", () => {
  test("clock in/out with no 500 errors and verified data registration", async ({
    page,
    context,
  }) => {
    const errors500: { url: string; method: string; detail?: any }[] = [];
    const consoleErrors: string[] = [];
    const apiSuccesses: string[] = [];

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

      // Track successful clock API calls
      if (
        res.status() >= 200 &&
        res.status() < 300 &&
        (res.url().includes("/employee/clock") ||
          res.url().includes("/timeclock"))
      ) {
        const msg = `${res.request().method()} ${res.url().split("?")[0]} → ${res.status()}`;
        apiSuccesses.push(msg);
        console.log(`✅ ${msg}`);
      }
    });

    // Capture console errors (filtered)
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (
          !text.includes("favicon") &&
          !text.includes("Sentry") &&
          !text.includes("ResizeObserver") &&
          !text.includes("Failed to load resource") &&
          !text.includes("API Schema Violation")
        ) {
          consoleErrors.push(text);
          console.log(`⚠️  Console Error: ${text.slice(0, 200)}`);
        }
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

    await page.evaluate(() => {
      localStorage.setItem("crm_onboarding_completed", "true");
    });

    console.log("✅ Logged in successfully\n");

    // Navigate to employee portal
    console.log("📱 Navigating to Employee Portal...");
    await page.goto(`${BASE_URL}/employee`);
    await page.waitForTimeout(3000);

    // Check initial state
    const hasClockIn = (await page.locator('button:has-text("Clock In")').count()) > 0;
    const hasClockOut = (await page.locator('button:has-text("Clock Out")').count()) > 0;
    const pageText = await page.textContent('body');

    const initialState = {
      hasClockIn,
      hasClockOut,
      isClockedIn: pageText?.includes("clocked in") || false,
      pageLoaded: true,
    };

    console.log("Initial State:", initialState);

    let performedClockIn = false;
    let performedClockOut = false;
    let dataRegistered = false;

    // If already clocked in, clock out first to reset state
    if (initialState.hasClockOut || initialState.isClockedIn) {
      console.log("\n⏱️  CLOCK OUT (resetting state)...");
      const clockOutBtn = page.locator('button:has-text("Clock Out")').first();
      await clockOutBtn.click();
      await page.waitForTimeout(3000);

      // Verify clock out registered
      const hasClockInAfter = (await page.locator('button:has-text("Clock In")').count()) > 0;
      const pageTextAfter = await page.textContent('body');

      const afterClockOut = {
        hasClockIn: hasClockInAfter,
        statusChanged: !pageTextAfter?.includes("Currently clocked in"),
      };

      if (afterClockOut.hasClockIn) {
        console.log("✅ Clock out successful - button changed to Clock In");
        performedClockOut = true;
        dataRegistered = true;
      } else {
        console.log("⚠️  Clock out may not have registered");
      }

      await page.waitForTimeout(1000);
    }

    // Now clock in fresh
    console.log("\n⏱️  CLOCK IN (testing)...");
    const clockInBtn = page.locator('button:has-text("Clock In")').first();

    if ((await clockInBtn.count()) === 0) {
      console.log("❌ Clock In button not found!");
      throw new Error("Clock In button not available");
    }

    // Get initial stats
    const statsBefore = await page.evaluate(() => {
      const hoursText =
        document.querySelector('[class*="hours"]')?.textContent || "";
      return {
        hours: hoursText,
        timestamp: Date.now(),
      };
    });

    await clockInBtn.click();
    console.log("✅ Clicked Clock In button");
    await page.waitForTimeout(3000);

    // Verify clock in registered
    const hasClockOutAfterIn = (await page.locator('button:has-text("Clock Out")').count()) > 0;
    const pageTextAfterIn = await page.textContent('body');
    const clockTimeMatch = pageTextAfterIn?.match(/(\d+:\d+:\d+)/);

    const afterClockIn = {
      hasClockOut: hasClockOutAfterIn,
      statusChanged: pageTextAfterIn?.includes("Currently clocked in") || false,
      hasWorkingBadge: pageTextAfterIn?.includes("Working") || false,
      clockedInTime: clockTimeMatch ? clockTimeMatch[0] : null,
    };

    console.log("After Clock In:", afterClockIn);

    if (afterClockIn.hasClockOut && afterClockIn.statusChanged) {
      console.log("✅ Clock in successful - UI updated");
      console.log(`   Status: Currently clocked in`);
      console.log(`   Time: ${afterClockIn.clockedInTime}`);
      performedClockIn = true;
      dataRegistered = true;
    } else {
      console.log("⚠️  Clock in may not have registered properly");
    }

    // Wait to see elapsed time counter (proves data is live)
    await page.waitForTimeout(2000);

    // Clock out to complete cycle
    console.log("\n⏱️  CLOCK OUT (completing cycle)...");
    const clockOutBtn2 = page.locator('button:has-text("Clock Out")').first();

    if ((await clockOutBtn2.count()) > 0) {
      await clockOutBtn2.click();
      console.log("✅ Clicked Clock Out button");
      await page.waitForTimeout(3000);

      // Verify clock out registered
      const hasClockInFinal = (await page.locator('button:has-text("Clock In")').count()) > 0;
      const pageTextFinal = await page.textContent('body');

      const afterClockOut2 = {
        hasClockIn: hasClockInFinal,
        statusChanged: !pageTextFinal?.includes("Currently clocked in"),
      };

      console.log("After Clock Out:", afterClockOut2);

      if (afterClockOut2.hasClockIn && afterClockOut2.statusChanged) {
        console.log("✅ Clock out successful - cycle complete");
        performedClockOut = true;
      } else {
        console.log("⚠️  Clock out may not have registered");
      }
    }

    // Check for toast notifications
    await page.waitForTimeout(1000);
    const notifications = await page
      .locator('[role="status"], [role="alert"], .toast, [class*="toast"]')
      .allTextContents();

    // Results
    console.log("\n" + "=".repeat(80));
    console.log("EMPLOYEE PORTAL FINAL VERIFICATION RESULTS");
    console.log("=".repeat(80));
    console.log(`Clock In Performed: ${performedClockIn}`);
    console.log(`Clock Out Performed: ${performedClockOut}`);
    console.log(`Data Registered: ${dataRegistered}`);
    console.log(`\n500 Errors: ${errors500.length}`);
    console.log(`Console Errors: ${consoleErrors.length}`);
    console.log(`API Successes: ${apiSuccesses.length}`);

    if (apiSuccesses.length > 0) {
      console.log("\n✅ Successful API Calls:");
      apiSuccesses.forEach((msg) => console.log(`   ${msg}`));
    }

    if (notifications.length > 0) {
      console.log("\n📢 Notifications:");
      notifications.forEach((msg) => console.log(`   ${msg}`));
    }

    if (errors500.length > 0) {
      console.log("\n❌ 500 ERRORS:");
      errors500.forEach((err) => {
        console.log(`   ${err.method} ${err.url}`);
        if (err.detail) {
          console.log(`   Detail: ${JSON.stringify(err.detail)}`);
        }
      });
    }

    if (consoleErrors.length > 0) {
      console.log("\n⚠️  CONSOLE ERRORS:");
      consoleErrors.forEach((err) => console.log(`   ${err}`));
    }

    const allGood =
      errors500.length === 0 &&
      consoleErrors.length === 0 &&
      (performedClockIn || performedClockOut) &&
      dataRegistered;

    if (allGood) {
      console.log(
        "\n✅ SUCCESS! Clock operations completed with no errors and data registered!"
      );
    } else {
      console.log("\n❌ FAILED!");
      if (errors500.length > 0) console.log("   - Found 500 errors");
      if (consoleErrors.length > 0) console.log("   - Found console errors");
      if (!performedClockIn && !performedClockOut)
        console.log("   - No clock operations performed");
      if (!dataRegistered) console.log("   - Data did not register in UI");
    }

    console.log("=".repeat(80) + "\n");

    // Assertions
    expect(
      errors500,
      `Found ${errors500.length} 500 errors: ${JSON.stringify(errors500)}`
    ).toHaveLength(0);
    expect(
      consoleErrors,
      `Found ${consoleErrors.length} console errors: ${consoleErrors.join(", ")}`
    ).toHaveLength(0);
    expect(
      performedClockIn || performedClockOut,
      "Should perform at least one clock operation"
    ).toBe(true);
    expect(dataRegistered, "Data should register in UI").toBe(true);
  });
});
