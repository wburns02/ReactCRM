import { test, expect } from "@playwright/test";

/**
 * Employee Portal 500 Error Hunt
 * Tests clock in/out and captures all 500 errors
 */

const BASE_URL = "https://react.ecbtx.com";

test.describe("Employee Portal 500 Error Hunt", () => {
  test("clock in and out without 500 errors", async ({ page, context }) => {
    const errors500: { url: string; method: string; detail?: any }[] = [];
    const consoleErrors: string[] = [];

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
    });

    // Capture console errors (filtered)
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (
          !text.includes("favicon") &&
          !text.includes("Sentry") &&
          !text.includes("ResizeObserver") &&
          !text.includes("Failed to load resource")
        ) {
          consoleErrors.push(text);
          console.log(`⚠️  Console: ${text.slice(0, 200)}`);
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

    console.log("✅ Logged in");

    // Set onboarding complete
    await page.evaluate(() => {
      localStorage.setItem("crm_onboarding_completed", "true");
    });

    // Navigate to employee portal
    console.log("\n📱 Navigating to Employee Portal...");
    await page.goto(`${BASE_URL}/employee`);
    await page.waitForTimeout(3000);

    console.log("Current URL:", page.url());

    // Check for clock in button
    const clockButton = page.locator('button:has-text("Clock In"), button:has-text("Clock Out")').first();
    const buttonExists = (await clockButton.count()) > 0;

    if (!buttonExists) {
      console.log("⚠️  No clock button found, trying alternative selectors...");
      const allButtons = await page.locator("button").all();
      console.log(`Found ${allButtons.length} buttons on page`);

      const h1 = await page.locator("h1").first().textContent();
      console.log("Page heading:", h1);
    }

    // Take a screenshot for debugging
    await page.screenshot({ path: "/tmp/employee-portal-before-clock.png" });

    // Try to clock in
    console.log("\n⏱️  Attempting Clock In...");
    const clockInButton = page.locator('button:has-text("Clock In")').first();

    if ((await clockInButton.count()) > 0) {
      await clockInButton.click();
      console.log("✅ Clicked Clock In button");

      // Wait for API response
      await page.waitForTimeout(3000);

      // Check if clocked in
      const clockOutButton = page.locator('button:has-text("Clock Out")');
      const isClockedIn = (await clockOutButton.count()) > 0;

      if (isClockedIn) {
        console.log("✅ Successfully clocked in!");

        // Wait a moment
        await page.waitForTimeout(2000);

        // Clock out
        console.log("\n⏱️  Attempting Clock Out...");
        await clockOutButton.first().click();
        console.log("✅ Clicked Clock Out button");

        await page.waitForTimeout(3000);

        // Check if clocked out
        const clockInAgain = page.locator('button:has-text("Clock In")');
        const isClockedOut = (await clockInAgain.count()) > 0;

        if (isClockedOut) {
          console.log("✅ Successfully clocked out!");
        } else {
          console.log("⚠️  Clock out may not have completed");
        }
      } else {
        console.log("⚠️  Clock in may not have completed");
      }
    } else {
      console.log("❌ Clock In button not found");

      // Check what's on the page
      const pageText = await page.locator("body").textContent();
      console.log("Page contains:", pageText?.slice(0, 500));
    }

    // Wait for any final requests
    await page.waitForTimeout(2000);

    // Take final screenshot
    await page.screenshot({ path: "/tmp/employee-portal-after-clock.png" });

    // Results
    console.log("\n" + "=".repeat(80));
    console.log("EMPLOYEE PORTAL TEST RESULTS");
    console.log("=".repeat(80));
    console.log(`500 Errors: ${errors500.length}`);
    console.log(`Console Errors (filtered): ${consoleErrors.length}`);

    if (errors500.length > 0) {
      console.log("\n❌ 500 ERRORS FOUND:");
      errors500.forEach((err) => {
        console.log(`\n  ${err.method} ${err.url}`);
        if (err.detail) {
          console.log(`  Detail: ${JSON.stringify(err.detail)}`);
        }
      });
    }

    if (consoleErrors.length > 0) {
      console.log("\n⚠️  CONSOLE ERRORS:");
      consoleErrors.forEach((err) => console.log(`  - ${err}`));
    }

    if (errors500.length === 0 && consoleErrors.length === 0) {
      console.log("\n✅ SUCCESS! No 500 errors or console errors!");
    } else {
      console.log("\n❌ FAILED! Errors detected");
    }

    console.log("=".repeat(80) + "\n");

    console.log("Screenshots saved:");
    console.log("  - /tmp/employee-portal-before-clock.png");
    console.log("  - /tmp/employee-portal-after-clock.png");

    // Assertions
    expect(errors500, `Found ${errors500.length} 500 errors: ${JSON.stringify(errors500)}`).toHaveLength(0);
    expect(consoleErrors, `Found ${consoleErrors.length} console errors`).toHaveLength(0);
  });
});
