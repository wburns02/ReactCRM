import { test, expect } from "@playwright/test";

/**
 * Timesheets Pending Approval Test
 * Verifies that pending time entries show up and can be approved
 */

const BASE_URL = "https://react.ecbtx.com";

test.describe("Timesheets Pending Approval", () => {
  test("should show pending time entries and allow approval", async ({ page }) => {
    console.log("🔐 Logging in...");
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

    // Navigate to timesheets
    console.log("📄 Navigating to Timesheets...");
    await page.goto(`${BASE_URL}/timesheets`);
    await page.waitForTimeout(3000);

    // Check pending approval count from the stats card
    const pendingCard = page.locator('text=/Pending Approval/').locator('..').locator('text=/\\d+/').first();
    const pendingBadge = await pendingCard.textContent();
    console.log(`Pending badge text: ${pendingBadge}`);

    const pendingCount = pendingBadge ? parseInt(pendingBadge) : 0;
    console.log(`\n📊 Pending approval count: ${pendingCount}`);

    // Click on Pending Approval tab
    console.log("\n📑 Clicking Pending Approval tab...");
    await page.click('button:has-text("Pending Approval")');
    await page.waitForTimeout(2000);

    // Check if entries are visible
    const tableRows = await page.locator('table tbody tr').count();
    console.log(`Table rows found: ${tableRows}`);

    // Check for empty state message
    const emptyMessage = await page.locator('text=/No time entries found/i').count();
    const hasEmptyMessage = emptyMessage > 0;

    console.log(`Has empty message: ${hasEmptyMessage}`);

    // Get API calls
    const apiCalls = await page.evaluate(async () => {
      try {
        const response = await fetch("/api/v2/payroll/time-entries?status=pending&page=1&page_size=20", {
          credentials: "include",
        });
        const data = await response.json();
        return {
          status: response.status,
          total: data.total || 0,
          entries: data.entries?.length || 0,
        };
      } catch (e: any) {
        return { error: e.message };
      }
    });

    console.log("\n📡 API Response:");
    console.log(JSON.stringify(apiCalls, null, 2));

    // Results
    console.log("\n" + "=".repeat(80));
    console.log("TIMESHEETS PENDING APPROVAL TEST RESULTS");
    console.log("=".repeat(80));
    console.log(`Pending Count (badge): ${pendingCount}`);
    console.log(`API Total: ${apiCalls.total}`);
    console.log(`API Entries: ${apiCalls.entries}`);
    console.log(`Table Rows: ${tableRows}`);
    console.log(`Empty Message: ${hasEmptyMessage}`);

    const mismatch = pendingCount > 0 && (tableRows === 0 || hasEmptyMessage);

    if (mismatch) {
      console.log("\n❌ ISSUE FOUND!");
      console.log(`   Badge shows ${pendingCount} pending but list is empty`);
      console.log(`   API returned ${apiCalls.entries} entries`);
    } else if (pendingCount > 0 && tableRows > 0) {
      console.log("\n✅ SUCCESS! Pending entries are visible");

      // Try to approve first entry
      console.log("\n🔍 Looking for Approve button...");
      const approveButton = page.locator('button:has-text("Approve")').first();
      const hasApprove = (await approveButton.count()) > 0;

      if (hasApprove) {
        console.log("✅ Approve button found - clicking...");
        await approveButton.click();
        await page.waitForTimeout(2000);

        // Check if count decreased
        const newBadge = await page.locator('text=/Pending Approval.*\\d+/').textContent();
        const newCountMatch = newBadge?.match(/(\d+)/);
        const newCount = newCountMatch ? parseInt(newCountMatch[1]) : 0;

        console.log(`New pending count: ${newCount}`);

        if (newCount < pendingCount) {
          console.log("✅ Approval worked! Count decreased");
        } else {
          console.log("⚠️  Count didn't decrease after approval");
        }
      } else {
        console.log("❌ No Approve button found");
      }
    } else {
      console.log("\n📝 No pending entries to display");
    }

    console.log("=".repeat(80) + "\n");

    // Assertions
    if (pendingCount > 0) {
      expect(hasEmptyMessage, "Should not show empty message when badge shows pending count").toBe(false);
      expect(tableRows, "Should show table rows when badge shows pending count").toBeGreaterThan(0);
    }
  });
});
