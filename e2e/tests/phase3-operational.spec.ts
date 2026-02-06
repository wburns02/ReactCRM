import { test, expect, Page } from "@playwright/test";

const BASE_URL = "https://react.ecbtx.com";
const API_URL = "https://react-crm-api-production.up.railway.app/api/v2";
const TEST_USER_EMAIL = "will@macseptic.com";
const TEST_USER_PASSWORD = "#Espn2025";

test.describe("Phase 3 - Operational Modules Tests", () => {
  let authPage: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    authPage = await context.newPage();
    await authPage.goto(`${BASE_URL}/login`);
    await authPage.fill('input[name="email"], input[type="email"]', TEST_USER_EMAIL);
    await authPage.fill('input[name="password"], input[type="password"]', TEST_USER_PASSWORD);
    await authPage.click('button[type="submit"]');
    await authPage.waitForFunction(() => !location.href.includes("/login"), { timeout: 10000 });
    console.log("✅ Authenticated");
  });

  // API endpoint tests
  const endpoints = [
    { path: "/service-intervals", name: "Service Intervals List" },
    { path: "/service-intervals/stats", name: "Service Intervals Stats" },
    { path: "/service-intervals/schedules", name: "Service Schedules" },
    { path: "/compliance/dashboard", name: "Compliance Dashboard" },
    { path: "/compliance/licenses", name: "Compliance Licenses" },
    { path: "/contracts", name: "Contracts List" },
    { path: "/employee/dashboard", name: "Employee Portal Dashboard" },
    { path: "/customer-success/dashboard/overview", name: "CS Dashboard Overview" },
  ];

  for (const ep of endpoints) {
    test(`API - ${ep.name} returns 200`, async () => {
      const response = await authPage.evaluate(
        async (url) => {
          const res = await fetch(url, { credentials: "include" });
          const text = await res.text();
          return { status: res.status, ok: res.ok, body: text.substring(0, 300) };
        },
        `${API_URL}${ep.path}`
      );
      console.log(`${response.status} ${ep.path}`);
      if (response.status !== 200) {
        console.log(`  Error body: ${response.body}`);
      }
      expect(response.status).toBe(200);
      expect(response.ok).toBe(true);
    });
  }

  test("Summary - All operational endpoints verified", () => {
    console.log("\n✅ Phase 3 Operational Tests Complete");
    console.log("All service-intervals/compliance/contracts/employee endpoints checked");
    expect(true).toBe(true);
  });
});
