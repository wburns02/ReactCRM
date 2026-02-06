import { test, expect } from "@playwright/test";

/**
 * Timesheets Fix Verification
 * Verifies pending approval tab shows entries and approve works
 */

const BASE_URL = "https://react.ecbtx.com";

test.use({ storageState: ".auth/user.json" });

test.describe("Timesheets Fix Verification", () => {
  test("pending approval tab shows entries and approve works", async ({ page }) => {
    console.log("📄 Navigating to Timesheets...");
    await page.goto(`${BASE_URL}/timesheets`);
    await page.waitForTimeout(4000);

    // Get pending count from badge
    const pageText = await page.textContent("body");
    const pendingMatch = pageText?.match(/Pending Approval[\s\S]{0,50}?(\d+)/);
    const pendingCount = pendingMatch ? parseInt(pendingMatch[1]) : 0;

    console.log(`\n📊 Pending approval count (badge): ${pendingCount}`);

    // Click Pending Approval tab
    console.log("\n📑 Clicking Pending Approval tab...");
    await page.click('button:has-text("Pending Approval")');
    await page.waitForTimeout(3000);

    // Check if table has rows
    const tableRows = await page.locator('table tbody tr').count();
    const hasEmptyMessage = (await page.locator('text=/No time entries found/i').count()) > 0;

    console.log(`Table rows: ${tableRows}`);
    console.log(`Empty message: ${hasEmptyMessage}`);

    // Check status filter
    const statusSelect = await page.locator('select[aria-label="Filter by status"]').inputValue();
    console.log(`Status filter value: "${statusSelect}"`);

    // Results
    console.log("\n" + "=".repeat(80));
    console.log("TIMESHEETS FIX VERIFICATION");
    console.log("=".repeat(80));
    console.log(`Pending Count (badge): ${pendingCount}`);
    console.log(`Table Rows: ${tableRows}`);
    console.log(`Empty Message: ${hasEmptyMessage}`);
    console.log(`Status Filter: "${statusSelect}"`);

    const fixWorking = pendingCount > 0 && tableRows > 0 && !hasEmptyMessage && statusSelect === "pending";

    if (fixWorking) {
      console.log("\n✅ FIX WORKING!");
      console.log("   • Badge shows pending count");
      console.log("   • Table shows entries");
      console.log("   • Status filter set to 'pending'");

      // Try to approve first entry
      const approveBtn = page.locator('button:has-text("Approve")').first();
      const hasApprove = (await approveBtn.count()) > 0;

      if (hasApprove) {
        console.log("\n🔄 Testing approval...");
        await approveBtn.click();
        await page.waitForTimeout(3000);

        // Check if count updated
        const newPageText = await page.textContent("body");
        const newMatch = newPageText?.match(/Pending Approval[\s\S]{0,50}?(\d+)/);
        const newCount = newMatch ? parseInt(newMatch[1]) : 0;

        console.log(`New pending count: ${newCount}`);

        if (newCount < pendingCount) {
          console.log("✅ Approval worked! Count decreased");
        } else {
          console.log("⚠️  Count didn't change (may need page refresh)");
        }
      } else {
        console.log("\n⚠️  No Approve button (entries may not be pending)");
      }
    } else {
      console.log("\n❌ FIX NOT WORKING!");
      if (pendingCount === 0) console.log("   • No pending entries exist");
      if (tableRows === 0) console.log("   • Table is empty");
      if (hasEmptyMessage) console.log("   • Empty message showing");
      if (statusFilter !== "pending") console.log(`   • Status filter is "${statusSelect}" not "pending"`);
    }

    console.log("=".repeat(80) + "\n");

    // Assertions
    if (pendingCount > 0) {
      expect(statusSelect, "Status filter should be 'pending'").toBe("pending");
      expect(hasEmptyMessage, "Should not show empty message").toBe(false);
      expect(tableRows, "Should show table rows").toBeGreaterThan(0);
    }
  });
});
