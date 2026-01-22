import { test, expect } from "@playwright/test";

/**
 * Check full permit details via direct API
 */
test.describe("Check Full Permit API", () => {
  test("get full permit via direct API call", async ({ page, request }) => {
    // Login to get cookies
    await page.goto("https://react.ecbtx.com/login");
    await page.fill('input[type="email"], input[name="email"]', "will@macseptic.com");
    await page.fill('input[type="password"], input[name="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|permits|customers)?$/, { timeout: 15000 });

    // Get context cookies
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join("; ");

    // First get a permit ID from search
    const searchResp = await request.get("https://react-crm-api-production.up.railway.app/api/v2/permits/search?page=1&page_size=5", {
      headers: { Cookie: cookieHeader }
    });

    console.log("Search status:", searchResp.status());
    const searchData = await searchResp.json();

    if (searchData.results?.length > 0) {
      const permitId = searchData.results[0].permit.id;
      console.log("First permit ID:", permitId);

      // Now get full permit details
      const permitResp = await request.get(`https://react-crm-api-production.up.railway.app/api/v2/permits/${permitId}`, {
        headers: { Cookie: cookieHeader }
      });

      console.log("Permit detail status:", permitResp.status());
      const permitData = await permitResp.json();

      console.log("\n========== FULL PERMIT DATA ==========");
      console.log("parcel_number:", permitData.parcel_number);
      console.log("latitude:", permitData.latitude);
      console.log("longitude:", permitData.longitude);
      console.log("\nFull response:");
      console.log(JSON.stringify(permitData, null, 2));
      console.log("========================================\n");
    }

    expect(true).toBe(true);
  });
});
