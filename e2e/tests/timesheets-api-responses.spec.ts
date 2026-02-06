import { test, expect } from "@playwright/test";

/**
 * Debug API responses for timesheets using auth storage
 */

test.use({ storageState: "/home/will/ReactCRM/.auth/user.json" });

test.describe("Timesheets API Responses Debug", () => {
  test("check API responses for pending entries", async ({ page }) => {
    await page.goto("https://react.ecbtx.com/timesheets");
    await page.waitForTimeout(2000);

    // Make API calls from browser context
    const [allEntriesData, pendingEntriesData, statsData] = await page.evaluate(async () => {
      const [allRes, pendingRes, statsRes] = await Promise.all([
        fetch("https://react-crm-api-production.up.railway.app/api/v2/payroll/time-entries?page=1&page_size=5",
          { credentials: "include" }),
        fetch("https://react-crm-api-production.up.railway.app/api/v2/payroll/time-entries?page=1&page_size=5&status=pending",
          { credentials: "include" }),
        fetch("https://react-crm-api-production.up.railway.app/api/v2/payroll/stats",
          { credentials: "include" }),
      ]);

      return await Promise.all([allRes.json(), pendingRes.json(), statsRes.json()]);
    });

    console.log("\n" + "=".repeat(80));
    console.log("STATS API (/payroll/stats)");
    console.log("=".repeat(80));
    console.log(`pending_approvals: ${statsData.pending_approvals}`);

    console.log("\n" + "=".repeat(80));
    console.log("ALL ENTRIES API (no filter)");
    console.log("=".repeat(80));
    console.log(`Total: ${allEntriesData.total}`);
    console.log(`Returned: ${allEntriesData.entries?.length || 0} entries`);
    if (allEntriesData.entries && allEntriesData.entries.length > 0) {
      console.log("\nFirst 5 entries:");
      allEntriesData.entries.forEach((entry: any, i: number) => {
        console.log(`  ${i + 1}. Status: "${entry.status}" | Tech: ${entry.technician_name} | Date: ${entry.entry_date}`);
      });
    }

    console.log("\n" + "=".repeat(80));
    console.log("PENDING FILTER API (status=pending)");
    console.log("=".repeat(80));
    console.log(`Total: ${pendingEntriesData.total}`);
    console.log(`Returned: ${pendingEntriesData.entries?.length || 0} entries`);
    if (pendingEntriesData.entries && pendingEntriesData.entries.length > 0) {
      console.log("\nPending entries:");
      pendingEntriesData.entries.forEach((entry: any, i: number) => {
        console.log(`  ${i + 1}. Status: "${entry.status}" | Tech: ${entry.technician_name} | Date: ${entry.entry_date}`);
      });
    }

    console.log("\n" + "=".repeat(80));
    console.log("ROOT CAUSE ANALYSIS");
    console.log("=".repeat(80));

    const pendingInAll = allEntriesData.entries?.filter((e: any) => e.status === "pending").length || 0;
    console.log(`Entries with status="pending" in all entries: ${pendingInAll}`);
    console.log(`Stats reports pending_approvals: ${statsData.pending_approvals}`);
    console.log(`Pending filter query returns: ${pendingEntriesData.total}`);

    if (statsData.pending_approvals > 0 && pendingEntriesData.total === 0 && pendingInAll > 0) {
      console.log("\n❌ BUG CONFIRMED:");
      console.log("   - Stats shows entries with status='pending'");
      console.log("   - Unfiltered query returns entries with status='pending'");
      console.log("   - BUT filtered query (status=pending) returns 0");
      console.log("   → Backend WHERE clause issue or parameter mismatch");
    } else if (pendingInAll === 0) {
      console.log("\n⚠️  NO PENDING ENTRIES IN DATABASE");
      console.log("   - Stats query may be using different criteria");
    }

    console.log("=".repeat(80) + "\n");
  });
});
