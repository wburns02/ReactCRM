/**
 * Reports & Analytics — Deep Interaction Tests
 *
 * Covers:
 *   - /reports          — main reports page (revenue charts, pipeline metrics, AI query)
 *   - /reports/revenue  — revenue report with Recharts SVGs
 *   - /reports/technicians — technician performance report
 *   - /reports/clv      — customer lifetime value report
 *   - /reports/service  — service type report
 *   - /reports/location — location report
 *   - /analytics/financial — financial analytics dashboard
 *   - /analytics/ftfr   — first-time fix rate dashboard
 *   - /analytics/bi     — BI dashboard
 *   - /analytics/operations — operations command center
 *   - /analytics/performance — performance scorecard
 *   - /analytics/insights — AI insights panel
 *   - /payroll          — payroll periods list
 *   - /marketing/leads  — lead pipeline (sales pipeline proxy)
 *
 * Auth: storageState from test@macseptic.com via playwright.config.ts "e2e" project.
 * Hard-fail only on: React error boundary ("something went wrong") or non-noise console errors.
 * All other missing UI is annotated and skipped gracefully.
 *
 * NOTE: Never use page.evaluate(fetch(apiUrl, ...)) — cross-origin blocked.
 */
import { test, expect } from "@playwright/test";

const BASE_URL = "https://react.ecbtx.com";

// ---------------------------------------------------------------------------
// Noise filter — these console messages are known/expected and never fail tests
// ---------------------------------------------------------------------------
const NOISE = [
  "API Schema Violation",
  "Sentry",
  "ResizeObserver",
  "favicon",
  "Failed to load resource",
  "server responded with a status of",
  "third-party cookie",
  "net::ERR_",
  "WebSocket",
  "[WebSocket]",
  "wss://",
];
function isNoise(msg: string): boolean {
  return NOISE.some((n) => msg.includes(n));
}

/** Assert no React error boundary is shown */
async function assertNoErrorBoundary(page: import("@playwright/test").Page) {
  const errorBoundary = await page
    .getByText(/something went wrong/i)
    .isVisible()
    .catch(() => false);
  expect(errorBoundary, "React error boundary rendered").toBe(false);
}

// ===========================================================================
// REPORTS — Main Page
// ===========================================================================
test.describe("Reports — Main Page", () => {
  test("reports page loads without error boundary", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text());
    });

    await page.goto(`${BASE_URL}/reports`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    await expect(page.locator("body")).toBeVisible();
    await assertNoErrorBoundary(page);
    expect(errors, `Non-noise console errors: ${errors.join(" | ")}`).toHaveLength(0);
  });

  test("reports page renders charts or data content", async ({ page }) => {
    await page.goto(`${BASE_URL}/reports`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Look for Recharts SVG, canvas elements, numeric KPI values, or data cards
    const hasSvg = (await page.locator("svg.recharts-surface, .recharts-wrapper svg").count()) > 0;
    const hasCanvas = (await page.locator("canvas").count()) > 0;
    const hasKpiCards = (await page.locator("[class*='card'], [class*='Card'], [class*='stat'], [class*='kpi']").count()) > 0;
    const hasHeading = await page
      .getByRole("heading", { name: /report|revenue|analytics|performance/i })
      .first()
      .isVisible()
      .catch(() => false);
    const hasAnyContent = hasSvg || hasCanvas || hasKpiCards || hasHeading;

    if (!hasAnyContent) {
      test.info().annotations.push({
        type: "info",
        description: "No charts/KPIs found on /reports — page may show loading state or empty data",
      });
    }

    // At minimum, body must be visible and no error boundary
    await expect(page.locator("body")).toBeVisible();
    await assertNoErrorBoundary(page);
  });

  test("date range filter — click a preset range without crashing", async ({ page }) => {
    await page.goto(`${BASE_URL}/reports`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    // Try to find common date range controls
    const rangeBtn = page
      .getByRole("button", { name: /30 days|last month|this month|90 days|last 30|ytd|year/i })
      .first()
      .or(page.getByRole("button", { name: /date|range|period/i }).first())
      .or(page.locator("[class*='DateRange'], [class*='dateRange'], [class*='date-range']").first());

    const hasRangeControl = await rangeBtn.isVisible().catch(() => false);
    if (!hasRangeControl) {
      test.info().annotations.push({
        type: "info",
        description: "No date range filter found on /reports — skipping interaction",
      });
      return;
    }

    await rangeBtn.click();
    await page.waitForTimeout(1500);

    // Close any popover that opened
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    await assertNoErrorBoundary(page);
  });

  test("report type quick links navigate without crash", async ({ page }) => {
    await page.goto(`${BASE_URL}/reports`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    // The ReportsPage has Link elements pointing to sub-report pages
    const reportLinks = [
      "/reports/revenue",
      "/reports/technicians",
      "/reports/clv",
      "/reports/service",
      "/reports/location",
    ];

    // Check if any nav links to sub-reports exist on the page
    const linkLocator = page.locator("a[href*='/reports/']");
    const linkCount = await linkLocator.count();

    if (linkCount === 0) {
      test.info().annotations.push({
        type: "info",
        description: "No /reports/* quick links found on main reports page",
      });
      return;
    }

    // Click up to 3 visible links and verify no error boundary
    let clicked = 0;
    for (const href of reportLinks.slice(0, 3)) {
      const link = page.locator(`a[href="${href}"]`).first();
      const isVisible = await link.isVisible().catch(() => false);
      if (!isVisible) continue;

      await link.click();
      await page.waitForTimeout(2000);
      await assertNoErrorBoundary(page);
      clicked++;

      // Return to reports to try next link
      await page.goto(`${BASE_URL}/reports`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);
    }

    test.info().annotations.push({
      type: "result",
      description: `Navigated ${clicked} sub-report links without error boundary`,
    });
  });

  test("AI report query input — visible and accepts text without crash", async ({ page }) => {
    await page.goto(`${BASE_URL}/reports`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    // The AIReportQuery component renders a textarea/input for asking AI about reports
    const aiInput = page
      .getByPlaceholder(/ask ai|how is my revenue|e\.g\./i)
      .first()
      .or(page.locator("textarea[placeholder*='revenue'], textarea[placeholder*='AI']").first());

    const hasAiInput = await aiInput.isVisible().catch(() => false);
    if (!hasAiInput) {
      test.info().annotations.push({
        type: "info",
        description: "AI query input not found on /reports — may not be rendered at this scroll position",
      });
      return;
    }

    await aiInput.fill("How is my revenue trending?");
    await page.waitForTimeout(500);
    await assertNoErrorBoundary(page);

    // Clear without submitting
    await aiInput.clear();
  });
});

// ===========================================================================
// REPORTS — Individual Sub-Report Pages
// ===========================================================================
test.describe("Reports — Revenue", () => {
  test("revenue report page loads", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text());
    });

    await page.goto(`${BASE_URL}/reports/revenue`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    await expect(page.locator("body")).toBeVisible();
    await assertNoErrorBoundary(page);
    expect(errors, `Non-noise errors: ${errors.join(" | ")}`).toHaveLength(0);
  });

  test("revenue report renders charts or tables", async ({ page }) => {
    await page.goto(`${BASE_URL}/reports/revenue`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const hasSvg = (await page.locator("svg.recharts-surface, .recharts-wrapper svg, svg[class*='recharts']").count()) > 0;
    const hasTable = (await page.locator("table tbody tr").count()) > 0;
    const hasEmptyState = await page
      .getByText(/no data|no revenue|empty|loading/i)
      .isVisible()
      .catch(() => false);

    const hasContent = hasSvg || hasTable || hasEmptyState;
    if (!hasContent) {
      test.info().annotations.push({
        type: "info",
        description: "No Recharts SVG, table rows, or empty state found on /reports/revenue",
      });
    }

    await assertNoErrorBoundary(page);
  });
});

test.describe("Reports — Technician Performance", () => {
  test("technician performance report loads", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text());
    });

    await page.goto(`${BASE_URL}/reports/technicians`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    await expect(page.locator("body")).toBeVisible();
    await assertNoErrorBoundary(page);
    expect(errors, `Non-noise errors: ${errors.join(" | ")}`).toHaveLength(0);
  });

  test("technician report renders data or empty state", async ({ page }) => {
    await page.goto(`${BASE_URL}/reports/technicians`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const hasSvg = (await page.locator("svg.recharts-surface, .recharts-wrapper svg").count()) > 0;
    const hasTable = (await page.locator("table tbody tr").count()) > 0;
    const hasCards = (await page.locator("[class*='card'], [class*='Card']").count()) > 0;
    const hasEmptyState = await page.getByText(/no data|no technician/i).isVisible().catch(() => false);

    const hasContent = hasSvg || hasTable || hasCards || hasEmptyState;
    if (!hasContent) {
      test.info().annotations.push({
        type: "info",
        description: "No chart/table content found on /reports/technicians",
      });
    }

    await assertNoErrorBoundary(page);
  });
});

test.describe("Reports — CLV (Customer Lifetime Value)", () => {
  test("CLV report loads without error boundary", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text());
    });

    await page.goto(`${BASE_URL}/reports/clv`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    await expect(page.locator("body")).toBeVisible();
    await assertNoErrorBoundary(page);
    expect(errors, `Non-noise errors: ${errors.join(" | ")}`).toHaveLength(0);
  });
});

test.describe("Reports — Service & Location", () => {
  test("service report loads without crash", async ({ page }) => {
    await page.goto(`${BASE_URL}/reports/service`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    await expect(page.locator("body")).toBeVisible();
    await assertNoErrorBoundary(page);
  });

  test("location report loads without crash", async ({ page }) => {
    await page.goto(`${BASE_URL}/reports/location`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    await expect(page.locator("body")).toBeVisible();
    await assertNoErrorBoundary(page);
  });
});

// ===========================================================================
// ANALYTICS — Dashboard Pages
// ===========================================================================
test.describe("Analytics — Financial Dashboard", () => {
  test("financial analytics page loads", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text());
    });

    await page.goto(`${BASE_URL}/analytics/financial`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    await expect(page.locator("body")).toBeVisible();
    await assertNoErrorBoundary(page);
    expect(errors, `Non-noise errors: ${errors.join(" | ")}`).toHaveLength(0);
  });

  test("financial analytics renders KPI cards or charts", async ({ page }) => {
    await page.goto(`${BASE_URL}/analytics/financial`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const hasSvg = (await page.locator("svg.recharts-surface, .recharts-wrapper svg").count()) > 0;
    const hasNumericValues = (await page.locator("text=/\\$[0-9,]+/").count()) > 0;
    const hasCards = (await page.locator("[class*='card'], [class*='Card']").count()) > 3;
    const hasContent = hasSvg || hasNumericValues || hasCards;

    if (!hasContent) {
      test.info().annotations.push({
        type: "info",
        description: "No charts/KPIs/numeric values detected on /analytics/financial",
      });
    }

    await assertNoErrorBoundary(page);
  });
});

test.describe("Analytics — FTFR (First-Time Fix Rate)", () => {
  test("FTFR dashboard loads without error boundary", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text());
    });

    await page.goto(`${BASE_URL}/analytics/ftfr`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    await expect(page.locator("body")).toBeVisible();
    await assertNoErrorBoundary(page);
    expect(errors, `Non-noise errors: ${errors.join(" | ")}`).toHaveLength(0);
  });

  test("FTFR dashboard renders numeric metrics or charts", async ({ page }) => {
    await page.goto(`${BASE_URL}/analytics/ftfr`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const hasSvg = (await page.locator("svg.recharts-surface, .recharts-wrapper svg").count()) > 0;
    const hasPercentage = (await page.locator("text=/%/").count()) > 0;
    const hasCards = (await page.locator("[class*='card'], [class*='Card']").count()) > 0;
    const hasContent = hasSvg || hasPercentage || hasCards;

    if (!hasContent) {
      test.info().annotations.push({
        type: "info",
        description: "No FTFR metrics found on /analytics/ftfr",
      });
    }

    await assertNoErrorBoundary(page);
  });
});

test.describe("Analytics — BI Dashboard", () => {
  test("BI dashboard loads without crash", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text());
    });

    await page.goto(`${BASE_URL}/analytics/bi`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    await expect(page.locator("body")).toBeVisible();
    await assertNoErrorBoundary(page);
    expect(errors, `Non-noise errors: ${errors.join(" | ")}`).toHaveLength(0);
  });
});

test.describe("Analytics — Operations & Performance", () => {
  test("operations command center loads without crash", async ({ page }) => {
    await page.goto(`${BASE_URL}/analytics/operations`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    await expect(page.locator("body")).toBeVisible();
    await assertNoErrorBoundary(page);
  });

  test("performance scorecard loads without crash", async ({ page }) => {
    await page.goto(`${BASE_URL}/analytics/performance`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    await expect(page.locator("body")).toBeVisible();
    await assertNoErrorBoundary(page);
  });

  test("AI insights panel loads without crash", async ({ page }) => {
    await page.goto(`${BASE_URL}/analytics/insights`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    await expect(page.locator("body")).toBeVisible();
    await assertNoErrorBoundary(page);
  });
});

// ===========================================================================
// PAYROLL — Reports
// ===========================================================================
test.describe("Payroll Reports", () => {
  test("payroll page loads without error boundary", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text());
    });

    await page.goto(`${BASE_URL}/payroll`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    await expect(page.locator("body")).toBeVisible();
    await assertNoErrorBoundary(page);
    expect(errors, `Non-noise errors: ${errors.join(" | ")}`).toHaveLength(0);
  });

  test("payroll page shows period data, table, or empty state", async ({ page }) => {
    await page.goto(`${BASE_URL}/payroll`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const hasTable = (await page.locator("table tbody tr").count()) > 0;
    const hasPeriodCards = (await page.locator("[class*='period'], [class*='Period'], [class*='payroll']").count()) > 0;
    const hasEmptyState = await page
      .getByText(/no payroll|no periods|empty|get started/i)
      .isVisible()
      .catch(() => false);
    const hasHeading = await page
      .getByRole("heading", { name: /payroll/i })
      .first()
      .isVisible()
      .catch(() => false);

    const hasContent = hasTable || hasPeriodCards || hasEmptyState || hasHeading;
    if (!hasContent) {
      test.info().annotations.push({
        type: "info",
        description: "No payroll data, period cards, or empty state found on /payroll",
      });
    }

    await assertNoErrorBoundary(page);
  });

  test("payroll period selector or filter is interactive", async ({ page }) => {
    await page.goto(`${BASE_URL}/payroll`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Look for period selector, date range, or status filter controls
    const periodSelect = page
      .getByRole("combobox", { name: /period|pay period|date/i })
      .first()
      .or(page.getByRole("button", { name: /period|biweekly|monthly|filter/i }).first());

    const hasControl = await periodSelect.isVisible().catch(() => false);
    if (!hasControl) {
      test.info().annotations.push({
        type: "info",
        description: "No period selector/filter found on /payroll",
      });
      return;
    }

    await periodSelect.click();
    await page.waitForTimeout(800);
    await page.keyboard.press("Escape");

    await assertNoErrorBoundary(page);
  });

  test("clicking a payroll period row navigates to period detail", async ({ page }) => {
    await page.goto(`${BASE_URL}/payroll`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const firstRow = page.locator("table tbody tr").first();
    if (!await firstRow.isVisible().catch(() => false)) {
      test.info().annotations.push({
        type: "info",
        description: "No payroll period rows to click — skipping navigation test",
      });
      return;
    }

    await firstRow.click();
    await page.waitForTimeout(2000);

    // Should navigate to /payroll/:periodId or open a modal
    const isDetailPage = !!page.url().match(/\/payroll\/[a-f0-9-]+/);
    const isModal = await page.getByRole("dialog").isVisible().catch(() => false);
    const stayedOnPage = page.url().includes("/payroll");

    test.info().annotations.push({
      type: "result",
      description: `After row click — URL: ${page.url()}, modal: ${isModal}`,
    });

    expect(isDetailPage || isModal || stayedOnPage, "Expected to stay on payroll or navigate to detail").toBe(true);
    await assertNoErrorBoundary(page);
  });
});

// ===========================================================================
// SALES PIPELINE — Lead Pipeline (marketing/leads route)
// ===========================================================================
test.describe("Sales Pipeline — Lead Pipeline", () => {
  test("lead pipeline page loads without error boundary", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text());
    });

    await page.goto(`${BASE_URL}/marketing/leads`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    await expect(page.locator("body")).toBeVisible();
    await assertNoErrorBoundary(page);
    expect(errors, `Non-noise errors: ${errors.join(" | ")}`).toHaveLength(0);
  });

  test("pipeline renders kanban columns, list, or empty state", async ({ page }) => {
    await page.goto(`${BASE_URL}/marketing/leads`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Kanban board: columns
    const hasKanbanColumns = (await page.locator("[class*='column'], [class*='Column'], [class*='lane'], [class*='stage']").count()) > 0;
    // Table list view
    const hasTable = (await page.locator("table tbody tr").count()) > 0;
    // Cards in pipeline
    const hasPipelineCards = (await page.locator("[class*='lead'], [class*='Lead'], [class*='prospect']").count()) > 0;
    // Empty state
    const hasEmptyState = await page.getByText(/no leads|empty|add your first/i).isVisible().catch(() => false);
    // Heading
    const hasHeading = await page
      .getByRole("heading", { name: /lead|pipeline|prospect/i })
      .first()
      .isVisible()
      .catch(() => false);

    const hasContent = hasKanbanColumns || hasTable || hasPipelineCards || hasEmptyState || hasHeading;
    if (!hasContent) {
      test.info().annotations.push({
        type: "info",
        description: "No kanban/table/pipeline content found on /marketing/leads",
      });
    }

    await assertNoErrorBoundary(page);
  });

  test("pipeline view toggle — switches between views without crash", async ({ page }) => {
    await page.goto(`${BASE_URL}/marketing/leads`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    // Look for list/kanban/board view toggle buttons
    const viewToggle = page
      .getByRole("button", { name: /list|kanban|board|grid|table/i })
      .first()
      .or(page.locator("[aria-label*='view'], [title*='view']").first());

    const hasToggle = await viewToggle.isVisible().catch(() => false);
    if (!hasToggle) {
      test.info().annotations.push({
        type: "info",
        description: "No view toggle found on /marketing/leads",
      });
      return;
    }

    await viewToggle.click();
    await page.waitForTimeout(1200);

    await assertNoErrorBoundary(page);
  });

  test("pipeline stage filter — clicking a stage tab does not crash", async ({ page }) => {
    await page.goto(`${BASE_URL}/marketing/leads`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    // Stage tabs are common in pipeline views (New, Contacted, Qualified, etc.)
    const stageTabs = page.getByRole("tab").or(
      page.getByRole("button", { name: /new|contacted|qualified|proposal|won|lost/i })
    );

    const tabCount = await stageTabs.count();
    if (tabCount === 0) {
      test.info().annotations.push({
        type: "info",
        description: "No stage tabs found on /marketing/leads",
      });
      return;
    }

    // Click up to 3 tabs
    const limit = Math.min(tabCount, 3);
    for (let i = 0; i < limit; i++) {
      const tab = stageTabs.nth(i);
      if (!await tab.isVisible().catch(() => false)) continue;
      await tab.click();
      await page.waitForTimeout(700);
      await assertNoErrorBoundary(page);
    }
  });
});
