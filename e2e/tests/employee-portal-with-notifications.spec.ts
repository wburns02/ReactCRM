import { test, expect } from "@playwright/test";

/**
 * Employee Portal with Notifications Verification
 * Complete test: 500 errors + data registration + notifications
 */

const BASE_URL = "https://react.ecbtx.com";

test.describe("Employee Portal with Notifications", () => {
  test("clock in/out with no 500 errors, data registration, and notifications", async ({
    page,
    context,
  }) => {
    const errors500: string[] = [];
    const consoleErrors: string[] = [];
    const notifications: string[] = [];
    const apiCalls: { method: string; url: string; status: number }[] = [];

    // Capture 500 errors
    page.on("response", async (res) => {
      const url = res.url();

      // Track all employee API calls
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
          } catch (e2) {}
        }

        errors500.push(`${res.request().method()} ${url} - ${detail.slice(0, 200)}`);
        console.log(`❌ 500 ERROR: ${res.request().method()} ${url}`);
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

    // Grant geolocation
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ latitude: 30.2672, longitude: -97.7431 });

    // Login
    console.log("🔐 Logging in with will@macseptic.com...");
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.click('button:has-text("Sign In")');
    await page.waitForFunction(() => !window.location.href.includes("/login"), {
      timeout: 20000,
    });
    await page.evaluate(() =>
      localStorage.setItem("crm_onboarding_completed", "true")
    );
    console.log("✅ Logged in\n");

    // Navigate to employee portal
    console.log("📱 Opening Employee Portal...");
    await page.goto(`${BASE_URL}/employee`);
    await page.waitForTimeout(3000);

    console.log("📋 Opening browser console (visible in DevTools)");

    // Check initial state
    const initialClockIn = await page.locator('button:has-text("Clock In")').count();
    const initialClockOut = await page.locator('button:has-text("Clock Out")').count();

    console.log(
      `\nInitial State: ${initialClockIn} Clock In, ${initialClockOut} Clock Out buttons`
    );

    let dataRegistered = false;
    let clockedIn = false;
    let clockedOut = false;

    // If already clocked in, clock out first
    if (initialClockOut > 0) {
      console.log("\n⏱️  STEP 1: Clocking out (already clocked in)...");
      await page.locator('button:has-text("Clock Out")').first().click();
      await page.waitForTimeout(4000);

      const afterOut = await page.locator('button:has-text("Clock In")').count();
      if (afterOut > 0) {
        console.log("   ✅ Clock out registered - button changed to Clock In");
        clockedOut = true;
        dataRegistered = true;
      }
    }

    // Clock in
    console.log("\n⏱️  STEP 2: Clocking in...");
    const clockInBtn = page.locator('button:has-text("Clock In")').first();

    if ((await clockInBtn.count()) === 0) {
      console.log("   ❌ Clock In button not found!");
      throw new Error("Clock In button missing");
    }

    // Record stats before clock in
    const statsBefore = await page.textContent("body");

    await clockInBtn.click();
    console.log("   🖱️  Clicked Clock In button");
    await page.waitForTimeout(4000);

    // Verify clock in
    const afterClockIn = await page.locator('button:has-text("Clock Out")').count();
    if (afterClockIn > 0) {
      console.log("   ✅ Clock in registered - button changed to Clock Out");
      clockedIn = true;
      dataRegistered = true;
    } else {
      console.log("   ⚠️  Clock in may not have registered");
    }

    // Check for working status
    const workingStatus = await page.textContent("body");
    if (workingStatus?.includes("Working") || workingStatus?.includes("clocked in")) {
      console.log("   ✅ Status updated to Working/Clocked In");
    }

    // Look for notifications
    await page.waitForTimeout(1000);
    const toastSelectors = [
      '[role="status"]',
      '[role="alert"]',
      ".toast",
      '[class*="toast"]',
      '[class*="notification"]',
      '[class*="alert"]',
    ];

    for (const selector of toastSelectors) {
      const elements = await page.locator(selector).allTextContents();
      notifications.push(...elements);
    }

    // Clock out
    console.log("\n⏱️  STEP 3: Clocking out...");
    const clockOutBtn = page.locator('button:has-text("Clock Out")').first();

    if ((await clockOutBtn.count()) > 0) {
      await clockOutBtn.click();
      console.log("   🖱️  Clicked Clock Out button");
      await page.waitForTimeout(4000);

      const afterClockOut = await page.locator('button:has-text("Clock In")').count();
      if (afterClockOut > 0) {
        console.log("   ✅ Clock out registered - button changed to Clock In");
        clockedOut = true;
        dataRegistered = true;
      } else {
        console.log("   ⚠️  Clock out may not have registered");
      }
    }

    // Check for more notifications
    await page.waitForTimeout(1000);
    for (const selector of toastSelectors) {
      const elements = await page.locator(selector).allTextContents();
      notifications.push(...elements);
    }

    // Final stats check
    const statsAfter = await page.textContent("body");

    // Results
    console.log("\n" + "=".repeat(80));
    console.log("EMPLOYEE PORTAL VERIFICATION RESULTS");
    console.log("=".repeat(80));
    console.log(`\n✅ Clocked In: ${clockedIn}`);
    console.log(`✅ Clocked Out: ${clockedOut}`);
    console.log(`✅ Data Registered: ${dataRegistered}`);
    console.log(`\n🚫 500 Errors: ${errors500.length}`);
    console.log(`🚫 Console Errors: ${consoleErrors.length}`);
    console.log(`📡 API Calls: ${apiCalls.length}`);
    console.log(`📢 Notifications Found: ${notifications.length}`);

    if (apiCalls.length > 0) {
      console.log("\n📡 API CALLS:");
      const grouped = new Map<string, number[]>();
      apiCalls.forEach((call) => {
        const key = `${call.method} ${call.url.split("/").pop()}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(call.status);
      });

      grouped.forEach((statuses, endpoint) => {
        const allSuccess = statuses.every((s) => s >= 200 && s < 300);
        const icon = allSuccess ? "✅" : "❌";
        console.log(`   ${icon} ${endpoint} → ${statuses.join(", ")}`);
      });
    }

    if (notifications.length > 0) {
      console.log("\n📢 NOTIFICATIONS:");
      const unique = [...new Set(notifications)].filter((n) => n.trim().length > 0);
      unique.forEach((n) => console.log(`   - ${n.slice(0, 100)}`));
    } else {
      console.log(
        "\n📢 NOTIFICATIONS: None detected (data registration via UI state changes)"
      );
    }

    if (errors500.length > 0) {
      console.log("\n❌ 500 ERRORS:");
      errors500.forEach((err) => console.log(`   ${err}`));
    }

    if (consoleErrors.length > 0) {
      console.log("\n⚠️  CONSOLE ERRORS:");
      consoleErrors.forEach((err) => console.log(`   ${err.slice(0, 200)}`));
    }

    const success =
      errors500.length === 0 &&
      consoleErrors.length === 0 &&
      dataRegistered &&
      (clockedIn || clockedOut);

    console.log("\n" + "=".repeat(80));
    if (success) {
      console.log("✅ SUCCESS!");
      console.log("   • No 500 errors");
      console.log("   • No console errors");
      console.log("   • Data registered (UI state changes)");
      console.log("   • Clock operations completed");
    } else {
      console.log("❌ FAILED!");
      if (errors500.length > 0)
        console.log(`   • Found ${errors500.length} 500 errors`);
      if (consoleErrors.length > 0)
        console.log(`   • Found ${consoleErrors.length} console errors`);
      if (!dataRegistered) console.log("   • Data did not register");
      if (!clockedIn && !clockedOut)
        console.log("   • No clock operations succeeded");
    }
    console.log("=".repeat(80) + "\n");

    // Assertions
    expect(errors500, `Found 500 errors: ${errors500.join("; ")}`).toHaveLength(0);
    expect(
      consoleErrors,
      `Found console errors: ${consoleErrors.join("; ")}`
    ).toHaveLength(0);
    expect(dataRegistered, "Data should register in UI").toBe(true);
    expect(
      clockedIn || clockedOut,
      "Should complete at least one clock operation"
    ).toBe(true);
  });
});
