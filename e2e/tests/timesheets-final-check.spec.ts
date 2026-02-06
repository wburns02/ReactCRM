import { test, expect } from "@playwright/test";

/**
 * Timesheets Final Check - Ignores SSL Errors
 * Final verification that pending approval tab works
 */

const BASE_URL = "https://react.ecbtx.com";

test.describe("Timesheets Final Check", () => {
  test("verify pending approval tab shows entries with status filter", async ({ browser }) => {
    // Create context that ignores SSL errors
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
    });

    const page = await context.newPage();

    const apiCalls: { url: string; hasStatus: boolean }[] = [];

    // Capture API calls
    page.on("request", (req) => {
      const url = req.url();
      if (url.includes("/payroll/time-entries")) {
        apiCalls.push({
          url: url,
          hasStatus: url.includes("status=pending"),
        });
        console.log(`📡 ${url.includes("status=pending") ? "✅" : "❌"} ${url}`);
      }
    });

    try {
      console.log("🔐 Logging in...");
      await page.goto(`${BASE_URL}/login`, { timeout: 15000 });
      await page.fill('input[type="email"]', "will@macseptic.com");
      await page.fill('input[type="password"]', "#Espn2025");
      await page.click('button:has-text("Sign In")');

      // Wait for redirect with timeout
      await page.waitForFunction(
        () => !window.location.href.includes("/login"),
        { timeout: 15000 }
      );

      await page.evaluate(() =>
        localStorage.setItem("crm_onboarding_completed", "true")
      );

      console.log("✅ Logged in\n");

      // Navigate to timesheets
      console.log("📄 Going to Timesheets...");
      await page.goto(`${BASE_URL}/timesheets`, { timeout: 15000 });
      await page.waitForTimeout(3000);

      // Get pending count
      const bodyText = await page.textContent("body");
      const match = bodyText?.match(/Pending Approval[\s\S]{0,100}?(\d+)/);
      const pendingCount = match ? parseInt(match[1]) : 0;
      console.log(`📊 Pending count: ${pendingCount}`);

      // Click Pending Approval tab
      console.log("\n📑 Clicking Pending Approval...");
      await page.click('button:has-text("Pending Approval")');
      await page.waitForTimeout(4000);

      // Check status filter value
      const statusValue = await page.locator('select[aria-label="Filter by status"]').inputValue();
      console.log(`Status filter: "${statusValue}"`);

      // Check for table rows
      const tableRows = await page.locator('table tbody tr').count();
      const hasEmpty = (await page.locator('text=/No time entries found/i').count()) > 0;

      console.log(`Table rows: ${tableRows}`);
      console.log(`Empty message: ${hasEmpty}`);

      // Results
      console.log("\n" + "=".repeat(80));
      console.log("TIMESHEETS FINAL CHECK RESULTS");
      console.log("=".repeat(80));
      console.log(`Pending Count: ${pendingCount}`);
      console.log(`Status Filter: "${statusValue}"`);
      console.log(`Table Rows: ${tableRows}`);
      console.log(`Empty Message: ${hasEmpty}`);
      console.log(`\nAPI Calls: ${apiCalls.length}`);

      const callsWithStatus = apiCalls.filter((c) => c.hasStatus);
      console.log(`Calls with status=pending: ${callsWithStatus.length}`);

      const success =
        statusValue === "pending" &&
        !hasEmpty &&
        callsWithStatus.length > 0 &&
        (pendingCount === 0 || tableRows > 0);

      if (success) {
        console.log("\n✅✅✅ SUCCESS! FIX IS WORKING! ✅✅✅");
        console.log("   • Status filter set to 'pending' automatically");
        console.log("   • API calls include status=pending parameter");
        console.log("   • Entries are visible (or no entries exist)");
      } else {
        console.log("\n❌ ISSUE DETECTED:");
        if (statusValue !== "pending")
          console.log(`   • Status filter is "${statusValue}" not "pending"`);
        if (hasEmpty && pendingCount > 0)
          console.log("   • Empty message shown despite pending count");
        if (callsWithStatus.length === 0)
          console.log("   • No API calls with status=pending");
      }

      console.log("=".repeat(80) + "\n");

      // Assertions
      expect(statusValue, "Status filter should default to 'pending'").toBe("pending");
      expect(callsWithStatus.length, "Should make API call with status=pending").toBeGreaterThan(0);

      if (pendingCount > 0) {
        expect(hasEmpty, "Should not show empty message when count > 0").toBe(false);
      }

    } catch (error: any) {
      console.log(`\n⚠️  Test error: ${error.message}`);

      if (apiCalls.length > 0) {
        console.log("\n📡 API calls captured before error:");
        apiCalls.forEach((call) => {
          console.log(`   ${call.hasStatus ? "✅" : "❌"} ${call.url}`);
        });

        const hasStatusCalls = apiCalls.filter((c) => c.hasStatus).length > 0;
        if (hasStatusCalls) {
          console.log("\n✅ FIX IS WORKING (API includes status=pending)");
        }
      }

      throw error;
    } finally {
      await context.close();
    }
  });
});
