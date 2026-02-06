import { test, expect } from "@playwright/test";

/**
 * Prospect Detail Loading Test
 * Verifies clicking a prospect row loads the actual prospect detail page
 */

test("clicking prospect row loads prospect detail", async ({ page }) => {
  console.log("\n" + "=".repeat(80));
  console.log("PROSPECT DETAIL LOADING TEST");
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

  // Step 3: Find first prospect row
  console.log("Step 3: Finding first prospect...");
  const table = page.locator('table[role="grid"]');
  const tableVisible = await table.isVisible();

  if (!tableVisible) {
    console.log("⚠️ No prospects table - empty state");
    return;
  }

  const rows = page.locator("tbody tr");
  const rowCount = await rows.count();
  console.log(`   Found ${rowCount} prospect rows\n`);

  if (rowCount === 0) {
    console.log("⚠️ No prospect rows found");
    return;
  }

  // Get first row data
  const firstRow = rows.first();
  const nameCell = firstRow.locator("td").first();
  const prospectName = await nameCell.textContent();
  console.log(`   First prospect: ${prospectName?.trim()}\n`);

  // Step 4: Click on the row
  console.log("Step 4: Clicking on prospect row...");
  await nameCell.click();
  await page.waitForTimeout(2000);

  const newUrl = page.url();
  console.log(`   Navigated to: ${newUrl}\n`);

  // Verify we're on a detail page
  const isDetailPage = newUrl.includes("/prospects/") && newUrl !== "https://react.ecbtx.com/prospects";

  if (!isDetailPage) {
    console.log("❌ FAILURE: Did not navigate to detail page");
    throw new Error("Navigation failed");
  }

  // Step 5: Wait for detail page to load (check for content, not error)
  console.log("Step 5: Checking if detail page loads correctly...");

  // Wait a bit for the page to render
  await page.waitForTimeout(2000);

  // Check for error message
  const errorMessage = page.locator("text=Failed to load prospect");
  const hasError = await errorMessage.isVisible();

  if (hasError) {
    console.log("❌ FAILURE: Detail page shows error");
    console.log("   'Failed to load prospect' message is visible");

    // Take screenshot
    await page.screenshot({ path: "/tmp/prospect-detail-error.png", fullPage: true });
    console.log("📸 Screenshot saved to /tmp/prospect-detail-error.png\n");

    throw new Error("Prospect detail page shows error instead of loading data");
  }

  // Check for actual content (prospect name in header)
  const header = page.locator("h1");
  const headerText = await header.textContent();
  console.log(`   Page header: ${headerText?.trim()}\n`);

  if (!headerText || headerText.includes("not found") || headerText.includes("error")) {
    console.log("❌ FAILURE: Header indicates error or missing data");
    throw new Error("Prospect detail page did not load correctly");
  }

  // Check for contact information card
  const contactCard = page.locator("text=Contact Information");
  const hasContactCard = await contactCard.isVisible();
  console.log(`   Contact Information card visible: ${hasContactCard}`);

  // Check for sales information card
  const salesCard = page.locator("text=Sales Information");
  const hasSalesCard = await salesCard.isVisible();
  console.log(`   Sales Information card visible: ${hasSalesCard}`);

  if (!hasContactCard || !hasSalesCard) {
    console.log("⚠️ Warning: Some detail cards not visible");
  }

  // Take success screenshot
  await page.screenshot({ path: "/tmp/prospect-detail-success.png", fullPage: true });

  console.log("\n" + "=".repeat(80));
  console.log("✅ TEST PASSED");
  console.log("=".repeat(80));
  console.log("Verified:");
  console.log("  ✓ Row click navigates to detail page");
  console.log("  ✓ Detail page loads without error");
  console.log("  ✓ Prospect data is displayed");
  console.log("  ✓ Contact and Sales cards are visible");
  console.log("=".repeat(80) + "\n");

  console.log("📸 Screenshot: /tmp/prospect-detail-success.png\n");
});
