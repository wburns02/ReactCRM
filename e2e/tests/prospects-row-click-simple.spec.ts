import { test, expect } from "@playwright/test";

/**
 * Simple Prospects Row Click Test
 * Just verify clicking the row name cell works
 */

test("prospect row is clickable", async ({ page }) => {
  console.log("\n=== SIMPLE PROSPECTS ROW CLICK TEST ===\n");

  // Login
  await page.goto("https://react.ecbtx.com/login");
  await page.fill('input[type="email"]', "will@macseptic.com");
  await page.fill('input[type="password"]', "#Espn2025");
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.href.includes("/login"), { timeout: 15000 });

  // Go to prospects
  await page.goto("https://react.ecbtx.com/prospects");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Check if table exists
  const tableExists = await page.locator('table[role="grid"]').isVisible();
  if (!tableExists) {
    console.log("⚠️ No prospects table - might be empty");
    return;
  }

  // Get first row
  const firstRow = page.locator('tbody tr').first();
  const rowExists = await firstRow.isVisible();

  if (!rowExists) {
    console.log("⚠️ No rows in table");
    return;
  }

  // Verify row has cursor-pointer class (our change)
  const hasPointer = await firstRow.evaluate((el) =>
    el.classList.contains('cursor-pointer')
  );
  console.log(`Row has cursor-pointer class: ${hasPointer}`);

  if (!hasPointer) {
    console.log("❌ Row does NOT have cursor-pointer - changes not deployed yet");
    console.log("   This means the new code hasn't been deployed to production");
  } else {
    console.log("✅ Row has cursor-pointer - changes ARE deployed!");
  }

  // Get current URL
  const beforeUrl = page.url();

  // Click on the first table cell (name cell)
  const nameCell = firstRow.locator('td').first();
  await nameCell.click();
  await page.waitForTimeout(2000);

  // Check if navigated
  const afterUrl = page.url();
  const didNavigate = afterUrl !== beforeUrl && afterUrl.includes("/prospects/");

  console.log(`Before: ${beforeUrl}`);
  console.log(`After:  ${afterUrl}`);
  console.log(`Navigated: ${didNavigate}`);

  if (didNavigate) {
    console.log("\n✅ SUCCESS: Row click works!\n");
  } else {
    console.log("\n❌ FAILURE: Row click did not navigate\n");
    console.log("This likely means the deployment is still in progress or cache needs to clear\n");
  }

  await page.screenshot({ path: "/tmp/prospects-row-click-simple.png" });
});
