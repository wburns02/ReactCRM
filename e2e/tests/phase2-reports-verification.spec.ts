import { test, expect, Page } from "@playwright/test";

const BASE_URL = "https://react.ecbtx.com";
const API_URL = "https://react-crm-api-production.up.railway.app/api/v2";
const TEST_USER_EMAIL = "will@macseptic.com";
const TEST_USER_PASSWORD = "#Espn2025";

test.describe("Phase 2 - Reports & Analytics 500s Fix", () => {
  let authPage: Page;
  let cookie: string;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    authPage = await context.newPage();
    await authPage.goto(`${BASE_URL}/login`);
    await authPage.fill('input[name="email"], input[type="email"]', TEST_USER_EMAIL);
    await authPage.fill('input[name="password"], input[type="password"]', TEST_USER_PASSWORD);
    await authPage.click('button[type="submit"]');
    await authPage.waitForFunction(() => !location.href.includes("/login"), { timeout: 10000 });

    // Extract session cookie
    const cookies = await context.cookies();
    const session = cookies.find((c) => c.name === "session");
    cookie = session?.value || "";
    console.log(`✅ Authenticated, cookie: ${cookie.substring(0, 20)}...`);
  });

  const reportEndpoints = [
    { path: "/reports/revenue", name: "Revenue Report" },
    { path: "/reports/technician", name: "Technician Report" },
    { path: "/reports/customer-lifetime-value", name: "Customer Lifetime Value" },
    { path: "/reports/revenue-by-service", name: "Revenue by Service" },
    { path: "/reports/revenue-by-location", name: "Revenue by Location" },
    { path: "/reports/customers", name: "Customer Report" },
    { path: "/reports/pipeline", name: "Pipeline Metrics" },
    { path: "/reports/technician-performance", name: "Technician Performance" },
  ];

  for (const ep of reportEndpoints) {
    test(`API - ${ep.name} returns 200`, async () => {
      const response = await authPage.evaluate(
        async ({ url, cookie }) => {
          const res = await fetch(url, { headers: { Cookie: `session=${cookie}` } });
          return { status: res.status, body: (await res.text()).substring(0, 200) };
        },
        { url: `${API_URL}${ep.path}`, cookie }
      );
      console.log(`${response.status} ${ep.path}`);
      expect(response.status).toBe(200);
    });
  }

  const analyticsEndpoints = [
    { path: "/analytics/ftfr", name: "FTFR" },
    { path: "/analytics/financial/snapshot", name: "Financial Snapshot" },
  ];

  for (const ep of analyticsEndpoints) {
    test(`API - ${ep.name} returns 200`, async () => {
      const response = await authPage.evaluate(
        async ({ url, cookie }) => {
          const res = await fetch(url, { headers: { Cookie: `session=${cookie}` } });
          return { status: res.status, body: (await res.text()).substring(0, 200) };
        },
        { url: `${API_URL}${ep.path}`, cookie }
      );
      console.log(`${response.status} ${ep.path}`);
      expect(response.status).toBe(200);
    });
  }

  // Page-level tests for report/analytics pages
  const pages = [
    { url: "/analytics/ftfr", name: "Analytics FTFR" },
    { url: "/analytics/revenue", name: "Analytics Revenue" },
    { url: "/reports", name: "Reports" },
  ];

  for (const p of pages) {
    test(`Page - ${p.name} loads without 500s`, async () => {
      const page = await authPage.context().newPage();
      const errors500: string[] = [];
      page.on("response", (r) => {
        if (r.status() >= 500) errors500.push(`${r.status()} ${r.url()}`);
      });
      await page.goto(`${BASE_URL}${p.url}`, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(2000);
      console.log(`${p.name}: ${errors500.length} 500 errors`);
      if (errors500.length > 0) console.log("500s:", errors500);
      await page.close();
      expect(errors500.length).toBe(0);
    });
  }
});
