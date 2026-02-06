import { test, expect } from "@playwright/test";

/**
 * Clock-Out Diagnostic Test
 * Tests the complete clock-out flow with detailed logging
 */

test.describe("Clock-Out Diagnostic", () => {
  test("Full Clock Cycle: Out → In → Out", async ({ page }) => {
    console.log("\n" + "=".repeat(80));
    console.log("CLOCK-OUT DIAGNOSTIC TEST - FULL CYCLE");
    console.log("=".repeat(80) + "\n");

    // Setup GPS
    await page.context().grantPermissions(["geolocation"]);
    await page.context().setGeolocation({
      latitude: 29.864755,
      longitude: -97.946829,
    });

    // Track all API calls
    const apiCalls: Array<{
      method: string;
      url: string;
      status: number;
      requestBody?: any;
      responseBody?: any;
    }> = [];

    page.on("request", (request) => {
      if (request.url().includes("/api/v2/employee/timeclock/")) {
        apiCalls.push({
          method: request.method(),
          url: request.url().split("/api/v2")[1],
          status: 0,
          requestBody: request.postDataJSON(),
        });
      }
    });

    page.on("response", async (response) => {
      if (response.url().includes("/api/v2/employee/timeclock/")) {
        const call = apiCalls.find(
          (c) => c.url === response.url().split("/api/v2")[1] && c.status === 0,
        );
        if (call) {
          call.status = response.status();
          try {
            call.responseBody = await response.json();
          } catch {}
        }
      }
    });

    // Step 1: Login
    console.log("Step 1: Logging in...");
    await page.goto("https://react.ecbtx.com/login");
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => !window.location.href.includes("/login"));
    console.log("✓ Logged in\n");

    // Step 2: Navigate to Employee Portal
    console.log("Step 2: Loading Employee Portal...");
    await page.goto("https://react.ecbtx.com/employee");
    await page.waitForTimeout(3000);
    console.log("✓ Page loaded\n");

    // Step 3: Get initial state
    console.log("Step 3: Checking initial clock state...");
    const clockButton = page.getByRole("button", { name: /Clock (In|Out)/i }).first();
    const initialButtonText = await clockButton.textContent();
    const statusElement = page.locator("text=/Currently clocked in|Not clocked in/i");
    const initialStatus = await statusElement.textContent();

    console.log(`   Button: "${initialButtonText}"`);
    console.log(`   Status: "${initialStatus}"\n`);

    // Step 4: If clocked in, test clock-out
    if (initialButtonText?.includes("Out")) {
      console.log("Step 4: User is clocked in, testing CLOCK-OUT...");
      apiCalls.length = 0; // Reset log

      console.log("   Clicking 'Clock Out' button...");
      await clockButton.click();
      console.log("   Waiting 6 seconds for API + UI update...");
      await page.waitForTimeout(6000);

      // Check API calls
      const clockOutCall = apiCalls.find((c) => c.url.includes("clock-out"));
      console.log("\n   📡 Clock-Out API Call:");
      if (clockOutCall) {
        console.log(`      ${clockOutCall.method} ${clockOutCall.url} → ${clockOutCall.status}`);
        console.log(`      Request: ${JSON.stringify(clockOutCall.requestBody || {})}`);
        console.log(`      Response: ${JSON.stringify(clockOutCall.responseBody || {}).substring(0, 200)}`);
      } else {
        console.log("      ❌ NO CLOCK-OUT API CALL DETECTED!");
      }

      // Check status endpoint refetch
      const statusCall = apiCalls.find((c) => c.url.includes("status"));
      console.log("\n   📡 Status Refetch:");
      if (statusCall) {
        console.log(`      ${statusCall.method} ${statusCall.url} → ${statusCall.status}`);
        console.log(`      Response: ${JSON.stringify(statusCall.responseBody || {}).substring(0, 200)}`);
      } else {
        console.log("      ⚠️ No status endpoint called after clock-out");
      }

      // Check UI state after clock-out
      console.log("\n   🖥️ UI State After Clock-Out:");
      const afterClockOutButton = await clockButton.textContent();
      const afterClockOutStatus = await statusElement.textContent();
      const badge = page.locator("text=/Working|Off/i");
      const afterBadge = await badge.textContent();

      console.log(`      Button: "${afterClockOutButton}"`);
      console.log(`      Status: "${afterClockOutStatus}"`);
      console.log(`      Badge: "${afterBadge}"`);

      // Verify clock-out worked
      if (clockOutCall?.status === 200) {
        console.log("\n   ✅ Clock-out API succeeded (200)");
      } else {
        console.log(`\n   ❌ Clock-out API failed (${clockOutCall?.status || "no call"})`);
      }

      if (afterClockOutButton?.includes("In")) {
        console.log("   ✅ UI updated: Button changed to 'Clock In'");
      } else {
        console.log(`   ❌ UI DID NOT UPDATE: Button still shows "${afterClockOutButton}"`);
      }

      // Step 5: Clock back in
      console.log("\nStep 5: Testing CLOCK-IN after clock-out...");
      apiCalls.length = 0;

      const clockInButton = page.getByRole("button", { name: /Clock In/i }).first();
      const clockInExists = await clockInButton.count();

      if (clockInExists > 0) {
        await clockInButton.click();
        await page.waitForTimeout(6000);

        const clockInCall = apiCalls.find((c) => c.url.includes("clock-in"));
        console.log("\n   📡 Clock-In API Call:");
        if (clockInCall) {
          console.log(`      ${clockInCall.method} ${clockInCall.url} → ${clockInCall.status}`);
        }

        const afterClockInButton = await page
          .getByRole("button", { name: /Clock (In|Out)/i })
          .first()
          .textContent();
        console.log(`   Button after clock-in: "${afterClockInButton}"`);

        if (afterClockInButton?.includes("Out")) {
          console.log("   ✅ Clock-in worked, button shows 'Clock Out'");
        }
      } else {
        console.log("   ⚠️ Clock In button not found, cannot test clock-in");
      }

      // Step 6: Clock out again
      console.log("\nStep 6: Testing SECOND CLOCK-OUT...");
      apiCalls.length = 0;

      const clockOutButton2 = page.getByRole("button", { name: /Clock Out/i }).first();
      const clockOutExists2 = await clockOutButton2.count();

      if (clockOutExists2 > 0) {
        await clockOutButton2.click();
        await page.waitForTimeout(6000);

        const clockOutCall2 = apiCalls.find((c) => c.url.includes("clock-out"));
        console.log("\n   📡 Second Clock-Out API Call:");
        if (clockOutCall2) {
          console.log(`      ${clockOutCall2.method} ${clockOutCall2.url} → ${clockOutCall2.status}`);
        }

        const finalButton = await page
          .getByRole("button", { name: /Clock (In|Out)/i })
          .first()
          .textContent();
        console.log(`   Final button state: "${finalButton}"`);

        if (finalButton?.includes("In")) {
          console.log("   ✅ Second clock-out worked!");
        }
      }
    } else {
      // User is clocked out, start with clock-in
      console.log("Step 4: User is clocked out, testing CLOCK-IN first...");
      apiCalls.length = 0;

      await clockButton.click();
      await page.waitForTimeout(6000);

      const afterFirstClick = await clockButton.textContent();
      console.log(`   After clock-in: "${afterFirstClick}"`);

      if (afterFirstClick?.includes("Out")) {
        console.log("   ✅ Clock-in worked");
        console.log("\nStep 5: Now testing CLOCK-OUT...");
        apiCalls.length = 0;

        await clockButton.click();
        await page.waitForTimeout(6000);

        const clockOutCall = apiCalls.find((c) => c.url.includes("clock-out"));
        const afterClockOut = await clockButton.textContent();

        console.log(`   Clock-out API: ${clockOutCall?.status || "no call"}`);
        console.log(`   Button after clock-out: "${afterClockOut}"`);

        if (afterClockOut?.includes("In")) {
          console.log("   ✅ Clock-out worked!");
        } else {
          console.log("   ❌ Clock-out failed - button didn't update");
        }
      }
    }

    // Screenshot
    await page.screenshot({
      path: "/tmp/clock-out-diagnostic.png",
      fullPage: true,
    });
    console.log("\n📸 Screenshot: /tmp/clock-out-diagnostic.png");

    console.log("\n" + "=".repeat(80));
    console.log("DIAGNOSTIC TEST COMPLETE");
    console.log("=".repeat(80) + "\n");
  });
});
