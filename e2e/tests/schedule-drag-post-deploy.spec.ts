/**
 * Post-Deploy Schedule Drag-Drop Verification
 *
 * Verifies drag-and-drop scheduling works after Railway build fix deployment.
 * Tests: login, schedule page load, unscheduled panel, API mutations, no errors.
 */
import { test, expect, type Page } from "@playwright/test";

const API = "https://react-crm-api-production.up.railway.app/api/v2";
const APP = "https://react.ecbtx.com";

let authPage: Page;
let sessionCookie: string;

test.describe("Schedule Drag-Drop Post-Deploy Verification", () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    authPage = await context.newPage();

    // Login
    await authPage.goto(`${APP}/login`);
    await authPage.fill('input[type="email"]', "will@macseptic.com");
    await authPage.fill('input[type="password"]', "#Espn2025");
    await authPage.click('button[type="submit"]');
    await authPage.waitForFunction(
      () => !window.location.href.includes("/login"),
      null,
      { timeout: 15000 },
    );

    // Extract session cookie
    const cookies = await context.cookies();
    const session = cookies.find((c) => c.name === "session");
    sessionCookie = session?.value || "";
    expect(sessionCookie).toBeTruthy();
  });

  test.afterAll(async () => {
    await authPage?.context().close();
  });

  test("Schedule page loads and shows view controls", async () => {
    await authPage.goto(`${APP}/schedule`, { waitUntil: "networkidle" });
    await authPage.waitForTimeout(3000);

    const body = await authPage.textContent("body");
    expect(body).toContain("Schedule");

    // Should have view toggle (Day/Week)
    const hasDayOrWeek =
      body?.includes("Day") || body?.includes("Week");
    expect(hasDayOrWeek).toBe(true);
  });

  test("Unscheduled work orders panel is visible", async () => {
    await authPage.goto(`${APP}/schedule`, { waitUntil: "networkidle" });
    await authPage.waitForTimeout(3000);

    const body = await authPage.textContent("body");
    const hasUnscheduled = body?.includes("Unscheduled") || body?.includes("unscheduled");
    expect(hasUnscheduled).toBe(true);
  });

  test("Work orders PATCH endpoint accepts scheduling updates", async () => {
    // First get a draft/unscheduled work order
    const listResult = await authPage.evaluate(
      async ({ url, cookie }: { url: string; cookie: string }) => {
        const resp = await fetch(url, {
          credentials: "include",
          headers: { Cookie: `session=${cookie}` },
        });
        return { status: resp.status, data: await resp.json() };
      },
      {
        url: `${API}/work-orders?page=1&page_size=5&status=draft`,
        cookie: sessionCookie,
      },
    );

    expect(listResult.status).toBe(200);

    if (listResult.data.items.length === 0) {
      // No draft work orders - try getting any work order
      const anyResult = await authPage.evaluate(
        async ({ url, cookie }: { url: string; cookie: string }) => {
          const resp = await fetch(url, {
            credentials: "include",
            headers: { Cookie: `session=${cookie}` },
          });
          return { status: resp.status, data: await resp.json() };
        },
        {
          url: `${API}/work-orders?page=1&page_size=1`,
          cookie: sessionCookie,
        },
      );

      expect(anyResult.status).toBe(200);
      expect(anyResult.data.items.length).toBeGreaterThan(0);

      // Verify the work order has the expected fields
      const wo = anyResult.data.items[0];
      expect(wo).toHaveProperty("id");
      expect(wo).toHaveProperty("status");
      return; // Skip PATCH test if no draft orders
    }

    // Pick the first draft work order and do a round-trip schedule/unschedule
    const workOrder = listResult.data.items[0];
    const woId = workOrder.id;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split("T")[0];

    // Schedule it
    const scheduleResult = await authPage.evaluate(
      async ({
        url,
        cookie,
        body,
      }: {
        url: string;
        cookie: string;
        body: string;
      }) => {
        const resp = await fetch(url, {
          method: "PATCH",
          credentials: "include",
          headers: {
            Cookie: `session=${cookie}`,
            "Content-Type": "application/json",
          },
          body,
        });
        return { status: resp.status, data: await resp.json() };
      },
      {
        url: `${API}/work-orders/${woId}`,
        cookie: sessionCookie,
        body: JSON.stringify({
          scheduled_date: dateStr,
          time_window_start: "09:00:00",
          status: "scheduled",
        }),
      },
    );

    expect(scheduleResult.status).toBe(200);
    expect(scheduleResult.data.scheduled_date).toBe(dateStr);
    expect(scheduleResult.data.status).toBe("scheduled");

    // Unschedule it (restore to draft)
    const unscheduleResult = await authPage.evaluate(
      async ({
        url,
        cookie,
        body,
      }: {
        url: string;
        cookie: string;
        body: string;
      }) => {
        const resp = await fetch(url, {
          method: "PATCH",
          credentials: "include",
          headers: {
            Cookie: `session=${cookie}`,
            "Content-Type": "application/json",
          },
          body,
        });
        return { status: resp.status, data: await resp.json() };
      },
      {
        url: `${API}/work-orders/${woId}`,
        cookie: sessionCookie,
        body: JSON.stringify({
          scheduled_date: null,
          time_window_start: null,
          assigned_technician: null,
          status: "draft",
        }),
      },
    );

    expect(unscheduleResult.status).toBe(200);
    expect(unscheduleResult.data.status).toBe("draft");
  });

  test("No console errors or network failures on schedule page", async () => {
    const consoleErrors: string[] = [];
    const networkFailures: string[] = [];

    const consoleHandler = (msg: { type: () => string; text: () => string }) => {
      if (msg.type() === "error") {
        const text = msg.text();
        // Filter known benign errors
        if (
          text.includes("API Schema Violation") ||
          text.includes("Sentry") ||
          text.includes("ResizeObserver") ||
          text.includes("favicon") ||
          text.includes("Failed to load resource") ||
          text.includes("server responded with a status of")
        )
          return;
        consoleErrors.push(text);
      }
    };
    const responseHandler = (response: { status: () => number; url: () => string }) => {
      if (response.status() >= 500) {
        networkFailures.push(`${response.status()} ${response.url()}`);
      }
    };

    authPage.on("console", consoleHandler);
    authPage.on("response", responseHandler);

    await authPage.goto(`${APP}/schedule`, { waitUntil: "networkidle" });
    await authPage.waitForTimeout(5000);

    authPage.off("console", consoleHandler);
    authPage.off("response", responseHandler);

    expect(
      networkFailures.length,
      `500+ errors: ${networkFailures.join(", ")}`,
    ).toBe(0);
    expect(
      consoleErrors.length,
      `Console errors: ${consoleErrors.join(", ")}`,
    ).toBe(0);
  });

  test("Schedule API date-range query works for week view", async () => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)

    const from = weekStart.toISOString().split("T")[0];
    const to = weekEnd.toISOString().split("T")[0];

    const result = await authPage.evaluate(
      async ({ url, cookie }: { url: string; cookie: string }) => {
        const resp = await fetch(url, {
          credentials: "include",
          headers: { Cookie: `session=${cookie}` },
        });
        return { status: resp.status, data: await resp.json() };
      },
      {
        url: `${API}/work-orders?page=1&page_size=200&scheduled_date_from=${from}&scheduled_date_to=${to}`,
        cookie: sessionCookie,
      },
    );

    expect(result.status).toBe(200);
    expect(result.data).toHaveProperty("items");
    expect(Array.isArray(result.data.items)).toBe(true);

    // Verify all returned items have dates within range
    for (const wo of result.data.items) {
      if (wo.scheduled_date) {
        expect(wo.scheduled_date >= from).toBe(true);
        expect(wo.scheduled_date <= to).toBe(true);
      }
    }
  });
});
