import { test, expect } from "@playwright/test";

/**
 * Verify API returns has_property field after backend deployment
 */
test.describe("Permits API Verification", () => {
  test("verify has_property field in API response", async ({ page, request }) => {
    // Login to get auth token
    await page.goto("/login");
    await page.fill('input[type="email"], input[name="email"]', "will@macseptic.com");
    await page.fill('input[type="password"], input[name="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|permits|customers)?$/, { timeout: 15000 });

    // Get the auth token from localStorage
    const token = await page.evaluate(() => localStorage.getItem("auth_token") || localStorage.getItem("token"));
    console.log("Auth token found:", token ? "YES" : "NO");

    // Make direct API call with token
    const apiUrl = "https://react-crm-api-production.up.railway.app/api/v2/permits/search";
    const response = await request.get(apiUrl, {
      params: { page: 1, page_size: 5 },
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log("API Status:", response.status());
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const firstPermit = data.results[0].permit;
      console.log("\n=== FIRST PERMIT FULL OBJECT ===");
      console.log(JSON.stringify(firstPermit, null, 2));

      console.log("\n=== has_property value ===");
      console.log("has_property:", firstPermit.has_property);
      console.log("has_property type:", typeof firstPermit.has_property);

      // Count how many have has_property = true
      let linkedCount = 0;
      for (const r of data.results) {
        if (r.permit.has_property === true) linkedCount++;
      }
      console.log(`\nLinked permits: ${linkedCount}/${data.results.length}`);
    }
  });
});
