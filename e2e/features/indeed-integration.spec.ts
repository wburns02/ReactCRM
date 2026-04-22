import { test, expect, type Page, type APIRequestContext } from "@playwright/test";


const SITE = "https://react.ecbtx.com";
const API = "https://react-crm-api-production.up.railway.app";
const TEST_EMAIL = "will@macseptic.com";
const TEST_PASSWORD = "#Espn2025";


async function uiLogin(page: Page): Promise<void> {
  await page.goto(`${SITE}/login`);
  await expect(
    page.getByRole("button", { name: "Sign In", exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await page.fill('input[type=email]', TEST_EMAIL);
  await page.fill('input[type=password]', TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await page.waitForURL(/\/(dashboard|onboarding|hr)/, { timeout: 15000 });
}


async function getAuthToken(request: APIRequestContext): Promise<string> {
  const r = await request.post(`${API}/api/v2/auth/login`, {
    data: { email: TEST_EMAIL, password: TEST_PASSWORD },
  });
  expect(r.status()).toBe(200);
  const { access_token } = await r.json();
  return access_token;
}


test.describe("Indeed integration — live", () => {
  test.setTimeout(120_000);

  test("XML feed responds with valid Indeed XML", async ({ request }) => {
    const r = await request.get(`${API}/careers/indeed-feed.xml`);
    expect(r.status()).toBe(200);
    const body = await r.text();
    expect(body).toMatch(/^<\?xml\s+version=/);
    expect(body).toContain("<source>");
    expect(body).toContain("<publisher>Mac Septic</publisher>");
    // At least one job or a well-formed empty feed
    expect(body).toMatch(/<\/source>/);
  });

  test("legacy /careers/jobs.xml still works (no breaking change)", async ({
    request,
  }) => {
    const r = await request.get(`${API}/careers/jobs.xml`);
    expect(r.status()).toBe(200);
    expect(await r.text()).toContain("<source>");
  });

  test("Indeed Apply webhook creates applicant + application", async ({
    request,
  }) => {
    // Find an open requisition via authed API
    const token = await getAuthToken(request);
    const reqs = await request.get(
      `${API}/api/v2/hr/recruiting/requisitions?status=open`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(reqs.status()).toBe(200);
    const openReqs = await reqs.json();
    expect(openReqs.length).toBeGreaterThan(0);
    const slug = openReqs[0].slug;

    // POST an Indeed-Apply-shaped JSON body (no auth, public webhook)
    const uniqueEmail = `indeed-test+${Date.now()}@example.com`;
    const post = await request.post(`${API}/hr/indeed-apply`, {
      data: {
        id: `test-indeed-apply-${Date.now()}`,
        job: { jobId: slug, jobTitle: openReqs[0].title },
        applicant: {
          fullName: "Indeed Apply Probe",
          email: uniqueEmail,
          phoneNumber: "+15555550123",
        },
        resume: { url: "https://example.com/resume.pdf" },
      },
    });
    expect(post.status()).toBe(201);
    const body = await post.json();
    expect(body).toHaveProperty("application_id");
    expect(body).toHaveProperty("applicant_id");
    expect(body.source).toBe("indeed");
    expect(body.stage).toBe("applied");
  });

  test("HR Indeed settings page renders with feed URL + webhook", async ({
    page,
  }) => {
    await uiLogin(page);
    await page.goto(`${SITE}/hr/settings/indeed`);
    await expect(
      page.getByRole("heading", { name: "Indeed integration", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByText("/careers/indeed-feed.xml", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByText("/hr/indeed-apply", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Open Indeed Employer dashboard/i }),
    ).toHaveAttribute(
      "href",
      "https://employers.indeed.com/home",
    );
  });

  test("Publish-to-Indeed toggle flips and persists", async ({ page }) => {
    await uiLogin(page);
    await page.goto(`${SITE}/hr/settings/indeed`);
    const firstToggle = page
      .getByRole("button", { name: /Toggle publish to Indeed/i })
      .first();
    await expect(firstToggle).toBeVisible();
    const initialPressed = await firstToggle.getAttribute("aria-pressed");
    await firstToggle.click();
    // wait for mutation
    await page.waitForTimeout(800);
    // Reload and confirm the new state persisted
    await page.reload();
    const reloadedToggle = page
      .getByRole("button", { name: /Toggle publish to Indeed/i })
      .first();
    await expect(reloadedToggle).toBeVisible();
    const newPressed = await reloadedToggle.getAttribute("aria-pressed");
    expect(newPressed).not.toBe(initialPressed);
    // Flip back so we leave state untouched for other tests.
    await reloadedToggle.click();
  });
});
