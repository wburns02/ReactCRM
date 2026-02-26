import { test, expect } from "@playwright/test";

const API = "https://react-crm-api-production.up.railway.app/api/v2";
const APP = "https://react.ecbtx.com";

async function apiLogin(page: import("@playwright/test").Page) {
  await page.goto(`${APP}/login`, { waitUntil: "domcontentloaded" });
  const result = await page.evaluate(
    async (api) => {
      const res = await fetch(`${api}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: "will@macseptic.com", password: "#Espn2025" }),
      });
      return res.status;
    },
    API,
  );
  expect(result).toBe(200);
}

test("API: all 4 predictive-service endpoints return valid data", async ({ page }) => {
  await apiLogin(page);

  // 1. dashboard-stats
  const stats = await page.evaluate(async (api) => {
    const res = await fetch(`${api}/predictive-service/dashboard-stats`, { credentials: "include" });
    return { status: res.status, body: await res.json() };
  }, API);
  expect(stats.status).toBe(200);
  expect(typeof stats.body.total_active_customers).toBe("number");
  expect(typeof stats.body.overdue_schedules).toBe("number");
  expect(typeof stats.body.no_recent_service).toBe("number");
  expect(typeof stats.body.estimated_pipeline_revenue).toBe("number");

  // 2. scores
  const scores = await page.evaluate(async (api) => {
    const res = await fetch(`${api}/predictive-service/scores?limit=5`, { credentials: "include" });
    return { status: res.status, body: await res.json() };
  }, API);
  expect(scores.status).toBe(200);
  expect(Array.isArray(scores.body.scores)).toBe(true);
  expect(scores.body.summary).toBeDefined();
  expect(typeof scores.body.summary.total_scored).toBe("number");
  expect(typeof scores.body.summary.revenue_opportunity).toBe("number");
  if (scores.body.scores.length > 0) {
    const s = scores.body.scores[0];
    expect(s).toHaveProperty("customer_id");
    expect(s).toHaveProperty("risk_score");
    expect(s).toHaveProperty("risk_level");
    expect(s).toHaveProperty("factors");
    expect(s).toHaveProperty("recommended_action");
  }

  // 3. scores/{customer_id} (use first from list if available)
  if (scores.body.scores.length > 0) {
    const cid = scores.body.scores[0].customer_id;
    const detail = await page.evaluate(async ([api, id]) => {
      const res = await fetch(`${api}/predictive-service/scores/${id}`, { credentials: "include" });
      return { status: res.status, body: await res.json() };
    }, [API, cid] as const);
    expect(detail.status).toBe(200);
    expect(detail.body.customer_id).toBe(cid);
    expect(typeof detail.body.risk_score).toBe("number");
  }

  // 4. campaign-preview
  const campaign = await page.evaluate(async (api) => {
    const res = await fetch(`${api}/predictive-service/campaign-preview?min_score=0`, { credentials: "include" });
    return { status: res.status, body: await res.json() };
  }, API);
  expect(campaign.status).toBe(200);
  expect(typeof campaign.body.target_count).toBe("number");
  expect(typeof campaign.body.estimated_revenue).toBe("number");
  expect(campaign.body.message_template).toBeDefined();
});

test("UI: /predictive-service page loads with data", async ({ page }) => {
  // Login via form
  await page.goto(`${APP}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', "will@macseptic.com");
  await page.fill('input[name="password"]', "#Espn2025");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await page.waitForFunction(() => !location.href.includes("/login"), null, { timeout: 15000 });
  await page.waitForTimeout(2000);

  await page.goto(`${APP}/predictive-service`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  // Verify heading
  await expect(page.getByText("Predictive Service Engine")).toBeVisible({ timeout: 10000 });

  // Verify KPI cards rendered
  await expect(page.getByText("Active Customers")).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("Pipeline Revenue")).toBeVisible({ timeout: 5000 });

  // Verify filter tabs exist
  await expect(page.getByRole("button", { name: /Critical/ })).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole("button", { name: /High/ })).toBeVisible({ timeout: 5000 });

  // Verify risk distribution or customer rows rendered
  await expect(page.getByText("Risk Distribution").or(page.getByText("No customers"))).toBeVisible({ timeout: 5000 });
});
