import { test, expect } from "@playwright/test";

test("Visual check - Draft period with Edit and Approve buttons", async ({ page }) => {
  // Login
  await page.goto("https://react.ecbtx.com/login");
  await page.fill('input[name="email"]', "will@macseptic.com");
  await page.fill('input[name="password"]', "#Espn2025");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });

  // Go to payroll
  await page.goto("https://react.ecbtx.com/payroll");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  // Take full page screenshot
  await page.screenshot({ path: "test-results/payroll-full.png", fullPage: true });

  // Find draft badge
  const draftBadge = page.locator('text=draft').first();
  if (await draftBadge.isVisible().catch(() => false)) {
    // Scroll to it
    await draftBadge.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({ path: "test-results/payroll-draft-visible.png" });

    // Check for Edit and Approve buttons near draft
    const editButtons = await page.getByRole("button", { name: "Edit" }).all();
    const approveButtons = await page.getByRole("button", { name: "Approve" }).all();

    console.log(`Found ${editButtons.length} Edit buttons`);
    console.log(`Found ${approveButtons.length} Approve buttons`);

    // If no buttons, check the HTML of draft card
    const draftCard = page.locator('div').filter({ has: page.locator('text=draft') }).first();
    const cardHTML = await draftCard.innerHTML().catch(() => "N/A");
    console.log("Draft card contains Edit?", cardHTML.includes("Edit"));
    console.log("Draft card contains Approve?", cardHTML.includes("Approve"));
  } else {
    console.log("No draft period found - creating one");

    // Create a new period
    await page.getByRole("button", { name: /new period/i }).click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    const startDate = "2026-08-01";
    const endDate = "2026-08-14";

    await page.locator('[role="dialog"]').locator('#start-date').fill(startDate);
    await page.locator('[role="dialog"]').locator('#end-date').fill(endDate);
    await page.locator('[role="dialog"]').getByRole("button", { name: /create/i }).click();

    await page.waitForTimeout(3000);
    await page.screenshot({ path: "test-results/payroll-after-create.png", fullPage: true });

    // Now check for buttons
    const editBtn = page.getByRole("button", { name: "Edit" }).first();
    const approveBtn = page.getByRole("button", { name: "Approve" }).first();

    console.log(`Edit visible: ${await editBtn.isVisible().catch(() => false)}`);
    console.log(`Approve visible: ${await approveBtn.isVisible().catch(() => false)}`);
  }
});
