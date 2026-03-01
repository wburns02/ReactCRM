import { test, expect } from "@playwright/test";

/**
 * Test that geographical zone campaigns auto-seed from built-in Sherrie Sheet data
 * when localStorage is empty. Tests against production.
 */
test.describe("Campaign Auto-Seeding", () => {
  test("geographical zone campaigns auto-seed when store is empty", async ({ page }) => {
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

    // Navigate to outbound campaigns - this triggers auto-seeding
    await page.goto("/outbound-campaigns", { waitUntil: "domcontentloaded" });

    // Wait for seed data to load (lazy import + processing ~8k contacts)
    await page.waitForTimeout(10000);

    // Verify page loaded
    await expect(page.locator("h1", { hasText: "Outbound Campaigns" })).toBeVisible({ timeout: 10000 });

    // Verify "No campaigns yet" is NOT showing
    const emptyState = page.locator("text=No campaigns yet");
    await expect(emptyState).not.toBeVisible({ timeout: 3000 });

    // Verify geographical zone campaigns are present
    const zoneNames = [
      "Zone 1 - Home Base",
      "Zone 2 - Local",
      "Zone 3 - Regional",
      "Zone 4 - Extended",
      "Zone 5 - Outer",
    ];

    let foundZones = 0;
    for (const name of zoneNames) {
      const heading = page.getByRole("heading", { name, exact: true });
      const count = await heading.count();
      if (count > 0) foundZones++;
    }

    // All 5 zones should be present
    expect(foundZones).toBe(5);
  });
});
