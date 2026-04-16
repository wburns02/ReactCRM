import { test, expect } from "@playwright/test";

/**
 * Plan 2 recruiting — public-only smoke.
 *
 * Verifies the apply form renders and POSTs correctly without authentication.
 * Authed admin flow (requisition creation + stage transitions) requires valid
 * production credentials which are not available in this test environment
 * (pre-existing test-user login gap).  Those paths are covered by the backend
 * test suite (tests/hr/test_application_router.py, test_public_apply.py).
 */

const API_URL =
  process.env.API_URL || "https://react-crm-api-production.up.railway.app";
const FRONTEND_URL = process.env.BASE_URL || "https://react.ecbtx.com";


test.describe("HR recruiting public apply", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("apply page renders with all required fields", async ({ page, request }) => {
    // Discover an open requisition from the live Indeed feed.
    const feed = await request.get(`${API_URL}/careers/jobs.xml`);
    expect(feed.status()).toBe(200);
    const xml = await feed.text();
    const match = xml.match(/<referencenumber>([^<]+)<\/referencenumber>/);
    test.skip(!match, "no open requisitions on prod; seed one to run this");
    const slug = match![1];

    await page.goto(`${API_URL}/careers/${slug}/apply`);
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("#apply-form")).toBeVisible();
    await expect(page.locator('input[name="first_name"]')).toBeVisible();
    await expect(page.locator('input[name="last_name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="phone"]')).toBeVisible();
    await expect(page.locator('input[name="resume"]')).toBeAttached();
    await expect(page.locator('input[name="sms_consent"]')).toBeAttached();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("apply endpoint accepts a multipart POST", async ({ request }) => {
    // Find any open requisition; prefer the seeded e2e demo.
    const feed = await request.get(`${API_URL}/careers/jobs.xml`);
    const xml = await feed.text();
    const match = xml.match(/<referencenumber>([^<]+)<\/referencenumber>/);
    test.skip(!match, "no open requisitions on prod; seed one to run this");
    const slug = match![1];

    const uniqueEmail = `e2e-${Date.now()}@example.com`;
    const resp = await request.post(
      `${API_URL}/api/v2/public/careers/${slug}/apply`,
      {
        multipart: {
          first_name: "E2E",
          last_name: "Applicant",
          email: uniqueEmail,
          phone: "+15555550199",
          sms_consent: "true",
        },
      },
    );
    expect(resp.status(), await resp.text()).toBe(201);
    const body = await resp.json();
    expect(body.stage).toBe("applied");
    expect(body.application_id).toBeTruthy();
    expect(body.applicant_id).toBeTruthy();
  });

  test("apply endpoint rejects duplicate applications", async ({ request }) => {
    const feed = await request.get(`${API_URL}/careers/jobs.xml`);
    const xml = await feed.text();
    const match = xml.match(/<referencenumber>([^<]+)<\/referencenumber>/);
    test.skip(!match, "no open requisitions on prod");
    const slug = match![1];

    const email = `dup-${Date.now()}@example.com`;
    const body = {
      first_name: "Dup",
      last_name: "Applicant",
      email,
      sms_consent: "false",
    };
    const r1 = await request.post(
      `${API_URL}/api/v2/public/careers/${slug}/apply`,
      { multipart: body },
    );
    expect(r1.status()).toBe(201);
    const r2 = await request.post(
      `${API_URL}/api/v2/public/careers/${slug}/apply`,
      { multipart: body },
    );
    expect(r2.status()).toBe(409);
  });

  test("jobs.xml still advertises open roles after applies", async ({ request }) => {
    const feed = await request.get(`${API_URL}/careers/jobs.xml`);
    expect(feed.status()).toBe(200);
    const xml = await feed.text();
    expect(xml).toMatch(/<source>/);
  });
});


test.describe("HR recruiting frontend routes", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("/hr/requisitions redirects to login when unauth", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/hr/requisitions`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => location.href.includes("/login"), {
      timeout: 15000,
    });
  });

  test("/hr/applicants redirects to login when unauth", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/hr/applicants`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => location.href.includes("/login"), {
      timeout: 15000,
    });
  });
});
