import { test, expect } from "@playwright/test";

/**
 * Debug API responses for timesheets
 */

const BASE_URL = "https://react.ecbtx.com";

test.describe("Timesheets API Debug", () => {
  test("check both all entries and pending entries API responses", async ({ page }) => {
    // Login
    console.log("🔐 Logging in...");
    await page.goto(`${BASE_URL}/login`, { timeout: 15000 });
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.click('button:has-text("Sign In")');
    await page.waitForFunction(() => !window.location.href.includes("/login"), { timeout: 15000 });
    console.log("✅ Logged in\n");

    // Make API calls from browser context to use cookies
    const allEntriesData = await page.evaluate(async () => {
      const response = await fetch(
        "https://react-crm-api-production.up.railway.app/api/v2/payroll/time-entries?page=1&page_size=5",
        { credentials: "include" }
      );
      return await response.json();
    });

    const pendingEntriesData = await page.evaluate(async () => {
      const response = await fetch(
        "https://react-crm-api-production.up.railway.app/api/v2/payroll/time-entries?page=1&page_size=5&status=pending",
        { credentials: "include" }
      );
      return await response.json();
    });

    const statsData = await page.evaluate(async () => {
      const response = await fetch(
        "https://react-crm-api-production.up.railway.app/api/v2/payroll/stats",
        { credentials: "include" }
      );
      return await response.json();
    });

    console.log("\n" + "=".repeat(80));
    console.log("STATS API RESPONSE");
    console.log("=".repeat(80));
    console.log(JSON.stringify(statsData, null, 2));

    console.log("\n" + "=".repeat(80));
    console.log("ALL ENTRIES API RESPONSE (first 5)");
    console.log("=".repeat(80));
    console.log(`Total: ${allEntriesData.total}`);
    console.log(`Entries returned: ${allEntriesData.entries?.length || 0}`);
    if (allEntriesData.entries && allEntriesData.entries.length > 0) {
      allEntriesData.entries.forEach((entry: any, i: number) => {
        console.log(`  ${i + 1}. ID: ${entry.id}, Status: "${entry.status}", Tech: ${entry.technician_name}`);
      });
    }

    console.log("\n" + "=".repeat(80));
    console.log("PENDING ENTRIES API RESPONSE (status=pending filter)");
    console.log("=".repeat(80));
    console.log(`Total: ${pendingEntriesData.total}`);
    console.log(`Entries returned: ${pendingEntriesData.entries?.length || 0}`);
    if (pendingEntriesData.entries && pendingEntriesData.entries.length > 0) {
      pendingEntriesData.entries.forEach((entry: any, i: number) => {
        console.log(`  ${i + 1}. ID: ${entry.id}, Status: "${entry.status}", Tech: ${entry.technician_name}`);
      });
    } else {
      console.log("  (No entries returned)");
    }

    console.log("\n" + "=".repeat(80));
    console.log("ANALYSIS");
    console.log("=".repeat(80));
    console.log(`Stats shows ${statsData.pending_approvals} pending`);
    console.log(`All entries query returns ${allEntriesData.total} total`);
    console.log(`Pending filter query returns ${pendingEntriesData.total} total`);

    if (statsData.pending_approvals > 0 && pendingEntriesData.total === 0) {
      console.log("\n❌ MISMATCH DETECTED:");
      console.log("   Stats shows pending entries exist, but filtered query returns none");
      console.log("   Possible causes:");
      console.log("   1. Status field values don't match 'pending' exactly (case sensitivity, whitespace)");
      console.log("   2. Different WHERE clauses between stats and list queries");
      console.log("   3. Permission filtering in list query but not stats query");
    } else if (pendingEntriesData.total > 0) {
      console.log("\n✅ PENDING ENTRIES FOUND - Frontend display issue");
    }

    console.log("=".repeat(80) + "\n");

    // No assertions - just debugging
  });
});
