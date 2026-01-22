import { test, expect } from "@playwright/test";

/**
 * Check full permit details to see if parcel_number/coordinates exist
 */
test.describe("Check Single Permit Details", () => {
  test("get full permit details", async ({ page }) => {
    // Login
    await page.goto("https://react.ecbtx.com/login");
    await page.fill('input[type="email"], input[name="email"]', "will@macseptic.com");
    await page.fill('input[type="password"], input[name="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|permits|customers)?$/, { timeout: 15000 });

    // Get first permit ID from search
    let permitId: string | null = null;

    page.on("response", async (response) => {
      if (response.url().includes("/permits/search") && response.status() === 200) {
        try {
          const data = await response.json();
          if (data.results?.[0]?.permit?.id) {
            permitId = data.results[0].permit.id;
          }
        } catch (e) {}
      }
    });

    await page.goto("https://react.ecbtx.com/permits");
    await page.waitForLoadState("networkidle", { timeout: 30000 });
    await page.waitForTimeout(1000);

    console.log("First permit ID:", permitId);

    if (permitId) {
      // Navigate to permit detail page
      let fullPermitData: any = null;

      page.on("response", async (response) => {
        if (response.url().includes(`/permits/${permitId}`) && response.status() === 200) {
          try {
            fullPermitData = await response.json();
          } catch (e) {}
        }
      });

      await page.goto(`https://react.ecbtx.com/permits/${permitId}`);
      await page.waitForLoadState("networkidle", { timeout: 30000 });
      await page.waitForTimeout(2000);

      console.log("\n========== FULL PERMIT DATA ==========");
      console.log(JSON.stringify(fullPermitData, null, 2));
      console.log("========================================\n");
    }

    expect(true).toBe(true);
  });
});
