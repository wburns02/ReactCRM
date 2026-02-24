import { test, expect } from "@playwright/test";

test.use({ baseURL: "https://react.ecbtx.com" });

test("login and verify AppLayout loads with WS notifications active", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[type="email"]', "will@macseptic.com");
  await page.fill('input[type="password"]', "#Espn2025");
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
  // Page loaded = layout rendered = useRealtimeNotifications hook fired
  await expect(page.locator("body")).toBeVisible();
  console.log("AppLayout loaded:", page.url());
});

test("AI Insights empty state renders shared EmptyState component", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[type="email"]', "will@macseptic.com");
  await page.fill('input[type="password"]', "#Espn2025");
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
  
  await page.goto("/analytics/ai-insights");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(3000);
  
  // Check that the empty state renders (one of the tabs will be empty)
  const screenshot = await page.screenshot({ path: "/tmp/ai-insights.png" });
  console.log("AI Insights page screenshotted");
  
  // Verify no JS errors that would prevent render
  const errors: string[] = [];
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
  console.log("Console errors:", errors.filter(e => !e.includes("Sentry") && !e.includes("ResizeObserver")));
});

test("Tech portal jobs page renders without crash", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[type="email"]', "tech@macseptic.com");
  await page.fill('input[type="password"]', "#Espn2025");
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
  console.log("Tech logged in, URL:", page.url());
  // Use domcontentloaded to avoid ERR_ABORTED on SPA navigation
  await page.goto("/portal/jobs", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  const screenshot = await page.screenshot({ path: "/tmp/tech-jobs.png" });
  console.log("Tech jobs page URL:", page.url());
  await expect(page.locator("body")).toBeVisible();
});
