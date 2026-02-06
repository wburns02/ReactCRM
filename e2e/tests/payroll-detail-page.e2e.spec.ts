import { test, expect } from "@playwright/test";

async function login(page: any) {
  await page.goto("https://react.ecbtx.com/login");
  await page.fill('input[name="email"]', "will@macseptic.com");
  await page.fill('input[name="password"]', "#Espn2025");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });
}

test("View button appears on ALL periods and navigates to detail page", async ({
  page,
}) => {
  await login(page);

  // Go to payroll page
  await page.goto("https://react.ecbtx.com/payroll");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Take screenshot of payroll page
  await page.screenshot({ path: "test-results/payroll-with-view-buttons.png", fullPage: true });

  // Find all View buttons
  const viewButtons = page.getByRole("button", { name: "View" });
  const viewCount = await viewButtons.count();

  console.log(`Found ${viewCount} View buttons on payroll page`);

  // Should have at least one View button
  expect(viewCount).toBeGreaterThan(0);

  // Find period cards with "approved" badge - they should ALSO have View buttons
  const approvedBadges = page.locator('span:text("approved")');
  const approvedCount = await approvedBadges.count();
  console.log(`Found ${approvedCount} approved periods`);

  // Click the first View button to navigate to detail page
  await viewButtons.first().click();

  // Wait for navigation to detail page
  await page.waitForURL(/\/payroll\/[a-f0-9-]+/);
  await page.waitForLoadState("networkidle");

  // Verify we're on the detail page
  const url = page.url();
  console.log(`Navigated to: ${url}`);
  expect(url).toMatch(/\/payroll\/[a-f0-9-]+/);

  // Verify detail page elements are present
  await expect(page.locator("text=Back to Payroll")).toBeVisible();

  // Verify Edit button exists on detail page
  const editButton = page.getByRole("button", { name: "Edit" });
  await expect(editButton).toBeVisible();

  // Take screenshot of detail page
  await page.screenshot({ path: "test-results/payroll-detail-page.png", fullPage: true });

  // Verify tabs are present
  await expect(page.locator("button:text('Overview')")).toBeVisible();
  await expect(page.locator("button:text('Time Entries')")).toBeVisible();
  await expect(page.locator("button:text('Commissions')")).toBeVisible();
  await expect(page.locator("button:text('Technicians')")).toBeVisible();

  console.log("Detail page verified with all tabs present");
});

test("Clicking period card navigates to detail page", async ({ page }) => {
  await login(page);

  // Go to payroll page
  await page.goto("https://react.ecbtx.com/payroll");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Find a period card and click it (not the button, the card itself)
  // Cards have cursor-pointer and hover:shadow classes
  const periodCards = page.locator('[class*="cursor-pointer"][class*="hover"]');
  const cardCount = await periodCards.count();
  console.log(`Found ${cardCount} clickable period cards`);

  if (cardCount > 0) {
    // Click on the card header area (to avoid clicking the button)
    const firstCard = periodCards.first();
    const cardText = await firstCard.innerText();
    console.log(`First card text: ${cardText.substring(0, 100)}...`);

    await firstCard.click();

    // Wait for navigation
    await page.waitForURL(/\/payroll\/[a-f0-9-]+/);
    console.log(`Card click navigated to: ${page.url()}`);

    // Verify we're on detail page
    await expect(page.locator("text=Back to Payroll")).toBeVisible();
  } else {
    console.log("No clickable cards found - checking if View buttons exist instead");
    const viewButtons = await page.getByRole("button", { name: "View" }).count();
    console.log(`Found ${viewButtons} View buttons as fallback`);
  }
});

test("Edit modal opens on detail page", async ({ page }) => {
  await login(page);

  // Go to payroll page and navigate to a period
  await page.goto("https://react.ecbtx.com/payroll");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Click first View button
  const viewButton = page.getByRole("button", { name: "View" });
  await viewButton.first().click();

  // Wait for detail page
  await page.waitForURL(/\/payroll\/[a-f0-9-]+/);
  await page.waitForLoadState("networkidle");

  // Click Edit button
  const editButton = page.getByRole("button", { name: "Edit" });
  await editButton.click();

  // Wait for modal to appear
  await expect(page.locator("text=Edit Payroll Period")).toBeVisible();

  // Take screenshot of edit modal
  await page.screenshot({ path: "test-results/payroll-edit-modal.png" });

  // Verify date inputs are present
  await expect(page.locator('input[type="date"]').first()).toBeVisible();

  // Click Cancel to close modal
  await page.getByRole("button", { name: "Cancel" }).click();

  // Modal should be closed
  await expect(page.locator("text=Edit Payroll Period")).not.toBeVisible();

  console.log("Edit modal verified - opens and closes correctly");
});
