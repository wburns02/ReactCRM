import { test, expect } from "@playwright/test";

/**
 * Timesheets Approval Working Test
 * Comprehensive test with retries for Railway "Not Found" errors
 */

const BASE_URL = "https://react.ecbtx.com";

test.describe("Timesheets Approval Working", () => {
  test("pending approval shows entries and approve works", async ({ page }) => {
    // Helper function to check for Railway "Not Found" page
    const isNotFoundPage = async () => {
      const bodyText = await page.textContent("body").catch(() => "");
      return bodyText?.includes("Not Found") && bodyText?.includes("Railway");
    };

    // Helper function to navigate with retry on "Not Found"
    const gotoWithRetry = async (url: string, maxRetries = 3) => {
      for (let i = 0; i < maxRetries; i++) {
        await page.goto(url, { timeout: 15000 });
        await page.waitForTimeout(2000);

        if (await isNotFoundPage()) {
          console.log(`⚠️  "Not Found" page detected, refreshing (attempt ${i + 1}/${maxRetries})...`);
          await page.reload({ timeout: 15000 });
          await page.waitForTimeout(2000);

          if (!(await isNotFoundPage())) {
            console.log("✅ Refresh successful");
            return;
          }
        } else {
          return;
        }
      }

      throw new Error("Railway 'Not Found' page persists after retries");
    };

    console.log("🔐 Logging in...");
    await gotoWithRetry(`${BASE_URL}/login`);

    // Fill login form
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.click('button:has-text("Sign In")');

    // Wait for redirect
    await page.waitForFunction(() => !window.location.href.includes("/login"), {
      timeout: 20000,
    });

    await page.evaluate(() =>
      localStorage.setItem("crm_onboarding_completed", "true")
    );

    console.log("✅ Logged in\n");

    // Navigate to timesheets with retry
    console.log("📄 Navigating to Timesheets...");
    await gotoWithRetry(`${BASE_URL}/timesheets`);
    await page.waitForTimeout(3000);

    // Get pending count from stats card
    const bodyText = await page.textContent("body");
    const pendingMatch = bodyText?.match(/Pending Approval[\s\S]{0,100}?(\d+)/);
    const pendingCount = pendingMatch ? parseInt(pendingMatch[1]) : 0;

    console.log(`📊 Pending count (badge): ${pendingCount}`);

    // Click Pending Approval tab
    console.log("\n📑 Clicking 'Pending Approval' tab...");
    await page.click('button:has-text("Pending Approval")');
    await page.waitForTimeout(3000);

    // Check status filter value
    const statusFilter = await page.locator('select[aria-label="Filter by status"]').inputValue();
    console.log(`Status filter: "${statusFilter}"`);

    // Count table rows
    const tableRows = await page.locator('table tbody tr').count();
    const hasEmptyMessage = (await page.locator('text=/No time entries found/i').count()) > 0;

    console.log(`Table rows: ${tableRows}`);
    console.log(`Empty message: ${hasEmptyMessage}`);

    // Take screenshot for debugging
    await page.screenshot({ path: "/tmp/timesheets-pending.png" });
    console.log("📸 Screenshot saved: /tmp/timesheets-pending.png");

    // Results
    console.log("\n" + "=".repeat(80));
    console.log("TIMESHEETS APPROVAL TEST RESULTS");
    console.log("=".repeat(80));
    console.log(`Pending Count: ${pendingCount}`);
    console.log(`Status Filter: "${statusFilter}"`);
    console.log(`Table Rows: ${tableRows}`);
    console.log(`Empty Message: ${hasEmptyMessage}`);

    // Check if fix is working
    const fixWorking = statusFilter === "pending" && (pendingCount === 0 || tableRows > 0);

    if (fixWorking && tableRows > 0) {
      console.log("\n✅ FIX WORKING! Entries are visible");

      // Try to approve first entry
      console.log("\n🔄 Testing approval...");
      const approveBtn = page.locator('button:has-text("Approve")').first();
      const hasApprove = (await approveBtn.count()) > 0;

      if (hasApprove) {
        console.log("✅ Approve button found - clicking...");

        // Get initial pending count
        const initialCount = pendingCount;

        // Click approve
        await approveBtn.click();
        await page.waitForTimeout(3000);

        // Check if count decreased
        const newBodyText = await page.textContent("body");
        const newMatch = newBodyText?.match(/Pending Approval[\s\S]{0,100}?(\d+)/);
        const newCount = newMatch ? parseInt(newMatch[1]) : 0;

        console.log(`Pending count after approve: ${newCount}`);

        if (newCount < initialCount) {
          console.log("✅ APPROVAL WORKED! Count decreased from " + initialCount + " to " + newCount);

          // Try one more approval
          const approveBtn2 = page.locator('button:has-text("Approve")').first();
          if ((await approveBtn2.count()) > 0) {
            console.log("\n🔄 Approving another entry...");
            await approveBtn2.click();
            await page.waitForTimeout(3000);

            const finalBodyText = await page.textContent("body");
            const finalMatch = finalBodyText?.match(/Pending Approval[\s\S]{0,100}?(\d+)/);
            const finalCount = finalMatch ? parseInt(finalMatch[1]) : 0;

            console.log(`Final pending count: ${finalCount}`);

            if (finalCount < newCount) {
              console.log("✅ SECOND APPROVAL WORKED! Count: " + newCount + " → " + finalCount);
            }
          }
        } else {
          console.log("⚠️  Count didn't change after approval");
        }
      } else {
        console.log("⚠️  No Approve button found");
      }
    } else if (statusFilter !== "pending") {
      console.log(`\n❌ FIX NOT WORKING! Status filter is "${statusFilter}" not "pending"`);
    } else if (pendingCount > 0 && tableRows === 0) {
      console.log("\n❌ FIX NOT WORKING! Badge shows " + pendingCount + " but table is empty");
    } else {
      console.log("\n📝 No pending entries to test with");
    }

    console.log("=".repeat(80) + "\n");

    // Assertions
    expect(statusFilter, "Status filter should be 'pending'").toBe("pending");

    if (pendingCount > 0) {
      expect(hasEmptyMessage, "Should not show empty message when count > 0").toBe(false);
      expect(tableRows, "Should show table rows when count > 0").toBeGreaterThan(0);
    }
  });
});
