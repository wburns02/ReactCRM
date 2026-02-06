import { test, expect } from "@playwright/test";

/**
 * Employee Portal 500 Errors Diagnostic
 * Captures ALL console errors and network 500 errors on page load and during clock operations
 */

test.describe("Employee Portal 500 Errors Diagnostic", () => {
  test("Capture all 500 errors on page load and clock operations", async ({ page }) => {
    console.log("\n" + "=".repeat(80));
    console.log("EMPLOYEE PORTAL 500 ERRORS DIAGNOSTIC");
    console.log("=".repeat(80) + "\n");

    // Track all console errors
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // Track all network requests
    const networkErrors: Array<{
      method: string;
      url: string;
      status: number;
      statusText: string;
      responseBody?: any;
    }> = [];

    const allRequests: Array<{
      method: string;
      url: string;
      status: number;
    }> = [];

    page.on("response", async (response) => {
      const url = response.url();
      if (url.includes("/api/v2/")) {
        const entry = {
          method: response.request().method(),
          url: url.split("/api/v2")[1],
          status: response.status(),
        };
        allRequests.push(entry);

        if (response.status() >= 500) {
          const error = {
            method: response.request().method(),
            url: url.split("/api/v2")[1],
            status: response.status(),
            statusText: response.statusText(),
            responseBody: undefined as any,
          };
          try {
            error.responseBody = await response.json();
          } catch {
            try {
              error.responseBody = await response.text();
            } catch {}
          }
          networkErrors.push(error);
        }
      }
    });

    // Setup GPS
    await page.context().grantPermissions(["geolocation"]);
    await page.context().setGeolocation({
      latitude: 29.864755,
      longitude: -97.946829,
    });

    // Step 1: Login
    console.log("Step 1: Logging in...");
    await page.goto("https://react.ecbtx.com/login");
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => !window.location.href.includes("/login"));
    console.log("✓ Logged in\n");

    // Step 2: Navigate to Employee Portal and wait for all requests
    console.log("Step 2: Loading Employee Portal and monitoring for 500 errors...");
    await page.goto("https://react.ecbtx.com/employee");
    await page.waitForTimeout(5000); // Wait for all async requests

    // Report page load errors
    console.log("\n📋 PAGE LOAD - Network Requests:");
    const pageLoadRequests = allRequests.slice();
    pageLoadRequests.forEach((req) => {
      const icon = req.status >= 500 ? "🔴" : req.status >= 400 ? "🟡" : "🟢";
      console.log(`   ${icon} ${req.method} ${req.url} → ${req.status}`);
    });

    const pageLoad500s = networkErrors.filter((e) => e.status >= 500);
    if (pageLoad500s.length > 0) {
      console.log("\n🔴 500 ERRORS FOUND ON PAGE LOAD:");
      pageLoad500s.forEach((error) => {
        console.log(`\n   ${error.method} ${error.url} → ${error.status}`);
        if (error.responseBody) {
          const bodyStr = typeof error.responseBody === "string"
            ? error.responseBody.substring(0, 300)
            : JSON.stringify(error.responseBody).substring(0, 300);
          console.log(`   Response: ${bodyStr}`);
        }
      });
    } else {
      console.log("\n✅ No 500 errors on page load");
    }

    // Report console errors
    const relevantConsoleErrors = consoleErrors.filter(
      (e) =>
        !e.includes("Sentry") &&
        !e.includes("favicon") &&
        !e.includes("ResizeObserver") &&
        !e.includes("Failed to load resource") &&
        !e.includes("websocket"),
    );

    if (relevantConsoleErrors.length > 0) {
      console.log("\n🔴 CONSOLE ERRORS:");
      relevantConsoleErrors.forEach((err) => {
        console.log(`   ${err.substring(0, 200)}`);
      });
    } else {
      console.log("\n✅ No relevant console errors");
    }

    // Step 3: Test Clock-In
    console.log("\n" + "-".repeat(80));
    console.log("Step 3: Testing Clock-In...");
    networkErrors.length = 0; // Reset
    allRequests.length = 0;

    const clockButton = page.getByRole("button", { name: /Clock (In|Out)/i }).first();
    const buttonText = await clockButton.textContent();
    console.log(`   Current button state: "${buttonText}"`);

    if (buttonText?.includes("In")) {
      await clockButton.click();
      console.log("   Clicked Clock In button");
      await page.waitForTimeout(5000);

      console.log("\n📋 CLOCK-IN - Network Requests:");
      allRequests.forEach((req) => {
        const icon = req.status >= 500 ? "🔴" : req.status >= 400 ? "🟡" : "🟢";
        console.log(`   ${icon} ${req.method} ${req.url} → ${req.status}`);
      });

      const clockIn500s = networkErrors.filter((e) => e.status >= 500);
      if (clockIn500s.length > 0) {
        console.log("\n🔴 500 ERRORS DURING CLOCK-IN:");
        clockIn500s.forEach((error) => {
          console.log(`\n   ${error.method} ${error.url} → ${error.status}`);
          if (error.responseBody) {
            const bodyStr = typeof error.responseBody === "string"
              ? error.responseBody.substring(0, 300)
              : JSON.stringify(error.responseBody).substring(0, 300);
            console.log(`   Response: ${bodyStr}`);
          }
        });
      } else {
        console.log("\n✅ No 500 errors during clock-in");
      }
    }

    // Step 4: Test Clock-Out
    console.log("\n" + "-".repeat(80));
    console.log("Step 4: Testing Clock-Out...");
    networkErrors.length = 0; // Reset
    allRequests.length = 0;

    const buttonTextAfter = await clockButton.textContent();
    if (buttonTextAfter?.includes("Out")) {
      await clockButton.click();
      console.log("   Clicked Clock Out button");
      await page.waitForTimeout(5000);

      console.log("\n📋 CLOCK-OUT - Network Requests:");
      allRequests.forEach((req) => {
        const icon = req.status >= 500 ? "🔴" : req.status >= 400 ? "🟡" : "🟢";
        console.log(`   ${icon} ${req.method} ${req.url} → ${req.status}`);
      });

      const clockOut500s = networkErrors.filter((e) => e.status >= 500);
      if (clockOut500s.length > 0) {
        console.log("\n🔴 500 ERRORS DURING CLOCK-OUT:");
        clockOut500s.forEach((error) => {
          console.log(`\n   ${error.method} ${error.url} → ${error.status}`);
          if (error.responseBody) {
            const bodyStr = typeof error.responseBody === "string"
              ? error.responseBody.substring(0, 300)
              : JSON.stringify(error.responseBody).substring(0, 300);
            console.log(`   Response: ${bodyStr}`);
          }
        });
      } else {
        console.log("\n✅ No 500 errors during clock-out");
      }
    }

    // Screenshot
    await page.screenshot({
      path: "/tmp/employee-portal-500-errors.png",
      fullPage: true,
    });

    // Final Summary
    console.log("\n" + "=".repeat(80));
    console.log("SUMMARY");
    console.log("=".repeat(80));

    const total500s = pageLoad500s.length;
    console.log(`Total 500 errors found: ${total500s}`);
    console.log(`Console errors: ${relevantConsoleErrors.length}`);

    if (total500s === 0 && relevantConsoleErrors.length === 0) {
      console.log("\n✅ SUCCESS: No 500 errors detected!");
    } else {
      console.log("\n❌ FAILURE: 500 errors still present");
    }

    console.log("=".repeat(80) + "\n");

    // Screenshot saved
    console.log("📸 Screenshot: /tmp/employee-portal-500-errors.png\n");
  });
});
