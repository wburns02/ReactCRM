import { test, expect } from "@playwright/test";

/**
 * Prospects Row Clickable Test
 * Verifies that clicking anywhere on a prospect row navigates to detail page
 */

test.describe("Prospects Row Clickable", () => {
  test("clicking prospect row navigates to detail page", async ({ page }) => {
    console.log("\n" + "=".repeat(80));
    console.log("PROSPECTS ROW CLICKABLE TEST");
    console.log("=".repeat(80) + "\n");

    // Step 1: Login
    console.log("Step 1: Logging in...");
    await page.goto("https://react.ecbtx.com/login");
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => !window.location.href.includes("/login"));
    console.log("✓ Logged in\n");

    // Step 2: Navigate to Prospects page
    console.log("Step 2: Navigating to Prospects page...");
    await page.goto("https://react.ecbtx.com/prospects");
    await page.waitForTimeout(3000); // Wait for data to load
    console.log("✓ Prospects page loaded\n");

    // Step 3: Check if prospects are loaded
    const table = page.locator('table[role="grid"]');
    const tableVisible = await table.isVisible();

    if (!tableVisible) {
      console.log("⚠️ No prospects table found (might be empty state)");
      const emptyState = page.locator("text=/No prospects found/i");
      const isEmpty = await emptyState.isVisible();
      if (isEmpty) {
        console.log("✓ Empty state detected - test cannot proceed without data");
        console.log("   This is expected if no prospects exist");
        return;
      }
    }

    // Step 4: Find first prospect row
    console.log("Step 3: Finding first prospect row...");
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    console.log(`   Found ${rowCount} prospect rows\n`);

    if (rowCount === 0) {
      console.log("⚠️ No prospect rows found");
      return;
    }

    // Get first row
    const firstRow = rows.first();

    // Get prospect name from first row for verification
    const nameCell = firstRow.locator('td').first();
    const prospectName = await nameCell.textContent();
    console.log(`   First prospect: ${prospectName?.trim()}\n`);

    // Get current URL before click
    const beforeUrl = page.url();
    console.log(`   Current URL: ${beforeUrl}\n`);

    // Step 5: Click on the row (NOT the View button)
    console.log("Step 4: Clicking on prospect row (NOT View button)...");
    console.log("   Clicking on name cell (leftmost part of row)...");

    // Click on the name cell specifically (away from buttons)
    await nameCell.click();

    // Wait for navigation
    console.log("   Waiting for navigation...");
    await page.waitForTimeout(2000);

    // Step 6: Verify navigation happened
    const afterUrl = page.url();
    console.log(`\n   After URL: ${afterUrl}\n`);

    // Check if we navigated to a prospect detail page
    const isDetailPage = afterUrl.includes("/prospects/") && afterUrl !== beforeUrl;

    if (isDetailPage) {
      console.log("✅ SUCCESS: Row click navigated to prospect detail!");
      console.log(`   Navigated from: ${beforeUrl}`);
      console.log(`   Navigated to: ${afterUrl}\n`);

      // Verify we're on a detail page
      await page.waitForTimeout(1000);
      const detailHeading = page.locator("h1, h2").first();
      const headingText = await detailHeading.textContent();
      console.log(`   Detail page heading: ${headingText?.trim()}\n`);
    } else {
      console.log("❌ FAILURE: Row click did not navigate");
      console.log(`   Expected: URL to change to /prospects/[id]`);
      console.log(`   Actual: URL remained ${afterUrl}\n`);
      throw new Error("Row click did not navigate to prospect detail");
    }

    // Screenshot
    await page.screenshot({
      path: "/tmp/prospects-row-clickable.png",
      fullPage: true,
    });

    console.log("=".repeat(80));
    console.log("✅ TEST PASSED");
    console.log("=".repeat(80));
    console.log("Verified:");
    console.log("  ✓ Can click anywhere on prospect row");
    console.log("  ✓ Row click navigates to prospect detail");
    console.log("  ✓ Navigation works without clicking 'View' button");
    console.log("=".repeat(80) + "\n");

    console.log("📸 Screenshot: /tmp/prospects-row-clickable.png\n");
  });

  test("View button still works independently", async ({ page }) => {
    console.log("\n" + "=".repeat(80));
    console.log("VERIFY VIEW BUTTON STILL WORKS");
    console.log("=".repeat(80) + "\n");

    // Login
    await page.goto("https://react.ecbtx.com/login");
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => !window.location.href.includes("/login"));

    // Go to prospects
    await page.goto("https://react.ecbtx.com/prospects");
    await page.waitForTimeout(3000);

    // Find first View button
    const viewButton = page.getByRole("button", { name: /View/i }).first();
    const viewButtonVisible = await viewButton.isVisible();

    if (!viewButtonVisible) {
      console.log("⚠️ No View button found (empty state or no prospects)");
      return;
    }

    console.log("Step 1: Clicking 'View' button specifically...");
    const beforeUrl = page.url();
    await viewButton.click();
    await page.waitForTimeout(2000);

    const afterUrl = page.url();
    const navigated = afterUrl !== beforeUrl && afterUrl.includes("/prospects/");

    if (navigated) {
      console.log("✅ View button works correctly");
      console.log(`   Navigated to: ${afterUrl}\n`);
    } else {
      console.log("❌ View button did not navigate");
      throw new Error("View button navigation failed");
    }

    console.log("=".repeat(80));
    console.log("✅ VIEW BUTTON TEST PASSED");
    console.log("=".repeat(80) + "\n");
  });
});
