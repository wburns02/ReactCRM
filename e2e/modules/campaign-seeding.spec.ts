import { test, expect } from "@playwright/test";

/**
 * Test that campaigns auto-seed from built-in Sherrie Sheet data
 * when localStorage is empty. Tests against production.
 */
test.describe("Campaign Auto-Seeding", () => {
  test("campaigns auto-seed when store is empty", async ({ page }) => {
    // Login
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    await page.fill('input[name="email"], input[type="email"]', process.env.TEST_EMAIL || "test@macseptic.com");
    await page.fill('input[name="password"], input[type="password"]', process.env.TEST_PASSWORD || "TestPassword123");
    await page.getByRole("button", { name: "Sign In", exact: true }).click();

    await page.waitForFunction(() => !location.href.includes("/login"), { timeout: 15000 });
    await page.waitForTimeout(2000);

    // Clear any existing campaign data to force re-seed
    await page.evaluate(() => {
      localStorage.setItem("crm_onboarding_completed", "true");
      localStorage.removeItem("outbound-campaigns-store");
    });

    // Navigate to outbound campaigns - this should trigger auto-seeding
    await page.goto("/outbound-campaigns", { waitUntil: "domcontentloaded" });

    // Wait for seed data to load (lazy import + processing ~8k contacts)
    await page.waitForTimeout(8000);

    // Verify the page title
    await expect(page.locator("h1", { hasText: "Outbound Campaigns" })).toBeVisible({ timeout: 10000 });

    // Verify at least one campaign from the Sherrie Sheet is present
    // The seed data includes: Hot Leads, Expired Under 1yr, Expiring Soon, Win-Back, Active DNC
    const campaignNames = [
      "Hot Leads - Recently Expired",
      "Expired Under 1yr",
      "Expiring Soon - Call to Renew",
      "Win-Back (Expired 1yr+)",
      "Active - DO NOT CALL",
    ];

    let foundCampaigns = 0;
    for (const name of campaignNames) {
      const el = page.getByRole("heading", { name, exact: true });
      const count = await el.count();
      if (count > 0) foundCampaigns++;
    }

    // At minimum, we should see campaigns listed on the page
    expect(foundCampaigns).toBeGreaterThanOrEqual(1);

    // Verify the "No campaigns yet" empty state is NOT showing
    const emptyState = page.locator("text=No campaigns yet");
    await expect(emptyState).not.toBeVisible({ timeout: 3000 });
  });
});
