import { test, expect } from "@playwright/test";

test("Debug payroll page content", async ({ page }) => {
  // Login
  await page.goto("https://react.ecbtx.com/login");
  await page.fill('input[name="email"]', "will@macseptic.com");
  await page.fill('input[name="password"]', "#Espn2025");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });

  // Navigate to payroll
  await page.goto("https://react.ecbtx.com/payroll");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(5000);

  // Take screenshot
  await page.screenshot({ path: "test-results/payroll-debug.png", fullPage: true });

  // Check for Pay Periods tab
  const payPeriodsTab = page.locator('button:has-text("Pay Periods")');
  const isPayPeriodsVisible = await payPeriodsTab.isVisible();
  console.log(`Pay Periods tab visible: ${isPayPeriodsVisible}`);

  // Click Pay Periods tab if not already active
  if (isPayPeriodsVisible) {
    await payPeriodsTab.click();
    await page.waitForTimeout(2000);
  }

  // Check for period cards
  const approvedBadges = await page.locator('text=approved').count();
  console.log(`Approved badges found: ${approvedBadges}`);

  // Check for any cards with date patterns
  const datePatterns = await page.locator('text=/\\w+ \\d+, \\d{4}/').count();
  console.log(`Date patterns found: ${datePatterns}`);

  // Look for View buttons specifically
  const viewButtons = await page.locator('button:has-text("View")').count();
  console.log(`View buttons (via :has-text): ${viewButtons}`);

  // Check all text content
  const bodyText = await page.locator('body').innerText();
  console.log(`Page contains "View": ${bodyText.includes("View")}`);

  // Look for any buttons with exact text
  const allButtonTexts = await page.locator('button').allInnerTexts();
  console.log(`All button texts: ${JSON.stringify(allButtonTexts.filter(t => t.length < 50))}`);

  // Look for cards
  const cards = await page.locator('[class*="rounded"]').count();
  console.log(`Cards/rounded elements: ${cards}`);
});
