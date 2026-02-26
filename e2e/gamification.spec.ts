import { test, expect } from "@playwright/test";

const API = "https://react-crm-api-production.up.railway.app/api/v2";
const APP = "https://react.ecbtx.com";

test("API: all 4 gamification endpoints return valid data", async ({ page }) => {
  // Single login for all API checks
  await page.goto(`${APP}/login`, { waitUntil: "domcontentloaded" });
  const loginStatus = await page.evaluate(
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
  expect(loginStatus).toBe(200);

  // 1. my-stats
  const stats = await page.evaluate(async (api) => {
    const res = await fetch(`${api}/gamification/my-stats`, { credentials: "include" });
    return { status: res.status, body: await res.json() };
  }, API);
  expect(stats.status).toBe(200);
  expect(typeof stats.body.current_streak).toBe("number");
  expect(typeof stats.body.best_streak).toBe("number");
  expect(typeof stats.body.completion_rate).toBe("number");
  expect(typeof stats.body.avg_job_duration_minutes).toBe("number");
  expect(typeof stats.body.jobs_completed_week).toBe("number");
  expect(typeof stats.body.jobs_completed_month).toBe("number");
  expect(typeof stats.body.jobs_completed_lifetime).toBe("number");
  expect(typeof stats.body.on_time_rate).toBe("number");
  expect(typeof stats.body.job_types_completed).toBe("number");

  // 2. badges
  const badges = await page.evaluate(async (api) => {
    const res = await fetch(`${api}/gamification/badges`, { credentials: "include" });
    return { status: res.status, body: await res.json() };
  }, API);
  expect(badges.status).toBe(200);
  expect(Array.isArray(badges.body)).toBe(true);
  expect(badges.body.length).toBe(10);
  for (const badge of badges.body) {
    expect(badge).toHaveProperty("id");
    expect(badge).toHaveProperty("name");
    expect(badge).toHaveProperty("icon");
    expect(badge).toHaveProperty("unlocked");
    expect(typeof badge.unlocked).toBe("boolean");
    expect(typeof badge.progress).toBe("number");
    expect(typeof badge.target).toBe("number");
  }

  // 3. leaderboard
  const lb = await page.evaluate(async (api) => {
    const res = await fetch(`${api}/gamification/leaderboard`, { credentials: "include" });
    return { status: res.status, body: await res.json() };
  }, API);
  expect(lb.status).toBe(200);
  expect(Array.isArray(lb.body.leaderboard)).toBe(true);
  expect(typeof lb.body.total_technicians).toBe("number");

  // 4. milestones
  const ms = await page.evaluate(async (api) => {
    const res = await fetch(`${api}/gamification/next-milestones`, { credentials: "include" });
    return { status: res.status, body: await res.json() };
  }, API);
  expect(ms.status).toBe(200);
  expect(Array.isArray(ms.body.milestones)).toBe(true);
  expect(ms.body.milestones.length).toBeGreaterThan(0);
});

test("UI: achievements page and dashboard streak card", async ({ page }) => {
  // Login via UI form
  await page.goto(`${APP}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', "will@macseptic.com");
  await page.fill('input[name="password"]', "#Espn2025");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await page.waitForFunction(() => !location.href.includes("/login"), null, { timeout: 15000 });

  // Wait for dashboard to load after login redirect
  await page.waitForTimeout(2000);

  // Achievements page
  await page.goto(`${APP}/portal/achievements`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await expect(page.getByText("Achievements")).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("Streak", { exact: true })).toBeVisible({ timeout: 5000 });
  await expect(page.locator("text=/Badges \\(\\d+\\/\\d+\\)/").first()).toBeVisible({ timeout: 5000 });

  // Dashboard streak card
  await page.goto(`${APP}/my-dashboard`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText("day streak")).toBeVisible({ timeout: 10000 });
  const link = page.locator('a[href*="achievements"]');
  await expect(link).toBeVisible({ timeout: 5000 });
});
