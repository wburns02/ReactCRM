import { test, expect } from "@playwright/test";

/**
 * Backend Health E2E Tests
 *
 * Verifies the Railway backend API is deployed and healthy.
 */
test.describe("Backend Health Verification", () => {
  const API_URL = "https://react-crm-api-production.up.railway.app";

  test("health endpoint returns 200 with current version", async ({ request }) => {
    const response = await request.get(`${API_URL}/health`);

    console.log("Health Status:", response.status());
    expect(response.status()).toBe(200);

    const data = await response.json();
    console.log("Health Response:", JSON.stringify(data, null, 2));

    expect(data.status).toBe("healthy");
    // Version should be 2.5.x or higher
    expect(data.version).toMatch(/^2\.5\.\d+$/);
    expect(data.environment).toBe("production");
  });

  test("root endpoint returns API info", async ({ request }) => {
    const response = await request.get(`${API_URL}/`);

    console.log("Root Status:", response.status());
    expect(response.status()).toBe(200);

    const data = await response.json();
    console.log("Root Response:", JSON.stringify(data, null, 2));

    expect(data.name).toBe("React CRM API");
  });

  test("frontend loads and can reach backend", async ({ page }) => {
    // Navigate to frontend
    await page.goto("https://react.ecbtx.com/login");
    await page.waitForLoadState("domcontentloaded");

    // Check page title
    const title = await page.title();
    console.log("Page title:", title);
    expect(title).toBeTruthy();

    // Login
    await page.fill('input[type="email"], input[name="email"]', "will@macseptic.com");
    await page.fill('input[type="password"], input[name="password"]', "#Espn2025");
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL(/\/(dashboard|permits|customers)?$/, { timeout: 15000 });
    console.log("Logged in, URL:", page.url());

    // Check for any 5xx errors during navigation
    const errors: string[] = [];
    page.on("response", (response) => {
      if (response.status() >= 500) {
        errors.push(`${response.status()} ${response.url()}`);
      }
    });

    // Navigate to permits page
    await page.goto("https://react.ecbtx.com/permits");
    await page.waitForLoadState("networkidle", { timeout: 30000 });

    console.log("Navigation errors:", errors);
    expect(errors).toHaveLength(0);
  });

  test("permits API returns has_property field when authenticated", async ({ page, request }) => {
    // Login via frontend to get cookie auth
    await page.goto("https://react.ecbtx.com/login");
    await page.fill('input[type="email"], input[name="email"]', "will@macseptic.com");
    await page.fill('input[type="password"], input[name="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|permits|customers)?$/, { timeout: 15000 });

    // Navigate to permits to trigger API call
    await page.goto("https://react.ecbtx.com/permits");

    // Intercept API response
    let hasPropertyFound = false;
    let apiResponse: any = null;

    page.on("response", async (response) => {
      if (response.url().includes("/permits/search") && response.status() === 200) {
        try {
          const data = await response.json();
          apiResponse = data;
          if (data.results && data.results.length > 0) {
            hasPropertyFound = "has_property" in data.results[0].permit;
            console.log("First permit has_property:", data.results[0].permit.has_property);
          }
        } catch (e) {
          console.log("Failed to parse response");
        }
      }
    });

    // Wait for data to load
    await page.waitForLoadState("networkidle", { timeout: 30000 });

    // Give extra time for API response processing
    await page.waitForTimeout(2000);

    console.log("has_property field found:", hasPropertyFound);
    if (apiResponse?.results?.length > 0) {
      console.log("Sample permit:", JSON.stringify(apiResponse.results[0].permit, null, 2));
    }

    // This test will pass once backend is deployed with has_property
    expect(hasPropertyFound).toBe(true);
  });
});
