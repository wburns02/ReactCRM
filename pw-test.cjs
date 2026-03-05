const { chromium } = require('playwright');
const PASS = [], FAIL = [];
function check(name, ok) {
  if (ok) { PASS.push(name); console.log('PASS -', name); }
  else { FAIL.push(name); console.log('FAIL -', name); }
}

const MOCK_PNL = {
  revenue: 87450,
  cost_of_labor: 35200,
  material_cost: 15800,
  gross_profit: 36450,
  gross_margin_pct: 41.7,
  data: Array.from({ length: 10 }, (_, i) => ({
    date: `2026-03-${String(i + 1).padStart(2, '0')}`,
    revenue: 7000 + Math.random() * 3000,
    labor_cost: 3000 + Math.random() * 1000,
    material_cost: 1000 + Math.random() * 800,
    gross_profit: 3000 + Math.random() * 2000,
    margin_pct: 35 + Math.random() * 15,
  })),
};

const MOCK_CASH_FLOW = {
  starting_balance: 156000,
  data: Array.from({ length: 13 }, (_, i) => ({
    date: `2026-03-${String(i * 7 + 1).padStart(2, '0')}`,
    projected_inflow: 12000 + Math.random() * 5000,
    projected_outflow: 10000 + Math.random() * 4000,
    cumulative_balance: 156000 + (i - 3) * 2000,
  })),
};

const MOCK_AR_AGING = {
  current: { count: 15, amount: 12400 },
  days_30: { count: 8, amount: 6200 },
  days_60: { count: 3, amount: 4100 },
  days_90: { count: 2, amount: 3800 },
  days_90_plus: { count: 1, amount: 2500 },
  total: { count: 29, amount: 29000 },
  top_outstanding: [
    { invoice_id: 'INV-001', customer_name: 'Smith Residence', amount: 4200, days_outstanding: 95 },
    { invoice_id: 'INV-002', customer_name: 'Johnson Property', amount: 3100, days_outstanding: 72 },
    { invoice_id: 'INV-003', customer_name: 'Williams Ranch', amount: 2800, days_outstanding: 45 },
    { invoice_id: 'INV-004', customer_name: 'Brown Estate', amount: 2400, days_outstanding: 28 },
    { invoice_id: 'INV-005', customer_name: 'Davis Home', amount: 1900, days_outstanding: 12 },
  ],
};

const MOCK_MARGINS = {
  data: [
    { job_type: 'Pumping', revenue: 32000, estimated_cost: 14400, margin: 17600, margin_pct: 55, job_count: 45, avg_revenue_per_job: 711 },
    { job_type: 'Inspection', revenue: 18500, estimated_cost: 7030, margin: 11470, margin_pct: 62, job_count: 28, avg_revenue_per_job: 661 },
    { job_type: 'Repair', revenue: 24000, estimated_cost: 14880, margin: 9120, margin_pct: 38, job_count: 15, avg_revenue_per_job: 1600 },
    { job_type: 'Emergency', revenue: 8200, estimated_cost: 2378, margin: 5822, margin_pct: 71, job_count: 6, avg_revenue_per_job: 1367 },
    { job_type: 'Grease Trap', revenue: 4750, estimated_cost: 2613, margin: 2138, margin_pct: 45, job_count: 10, avg_revenue_per_job: 475 },
  ],
};

const MOCK_TECH_PROFIT = {
  data: [
    { tech_id: 't1', name: 'Mike Johnson', revenue: 25200, estimated_cost: 11340, margin: 13860, margin_pct: 55, jobs: 32, avg_job_value: 788, revenue_per_hour: 157 },
    { tech_id: 't2', name: 'Carlos Garcia', revenue: 19800, estimated_cost: 9504, margin: 10296, margin_pct: 52, jobs: 28, avg_job_value: 707, revenue_per_hour: 124 },
    { tech_id: 't3', name: 'James Wilson', revenue: 14500, estimated_cost: 8120, margin: 6380, margin_pct: 44, jobs: 22, avg_job_value: 659, revenue_per_hour: 91 },
    { tech_id: 't4', name: 'David Lee', revenue: 8400, estimated_cost: 5460, margin: 2940, margin_pct: 35, jobs: 14, avg_job_value: 600, revenue_per_hour: 53 },
  ],
};

const MOCK_CONTRACT_REVENUE = {
  mrr: 4200,
  arr: 50400,
  active_contracts: 28,
  avg_contract_value: 1800,
  contracts_expiring_30d: 3,
  renewal_rate: 82,
  data: [
    { month: 'Oct', mrr: 3800, new_mrr: 400, churned_mrr: 100 },
    { month: 'Nov', mrr: 3900, new_mrr: 300, churned_mrr: 200 },
    { month: 'Dec', mrr: 4000, new_mrr: 350, churned_mrr: 250 },
    { month: 'Jan', mrr: 4100, new_mrr: 500, churned_mrr: 400 },
    { month: 'Feb', mrr: 4200, new_mrr: 300, churned_mrr: 200 },
  ],
};

const KNOWN_ERRORS = ['API Schema Violation', 'Sentry', 'ResizeObserver', 'favicon', 'Failed to load resource', 'server responded with a status of', 'DSN not configured'];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // Auth bypass
  await ctx.addInitScript(() => {
    const state = JSON.stringify({
      isAuthenticated: true,
      lastValidated: Date.now(),
      userId: 'user-123',
    });
    sessionStorage.setItem('session_state', state);
    localStorage.setItem('session_state', state);
    localStorage.setItem('crm_session_token', 'mock-jwt-token-123');
  });

  // Mock API responses
  await ctx.route('https://react-crm-api-production.up.railway.app/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/auth/me')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        user: { id: 'user-123', email: 'test@ecbtx.com', first_name: 'Test', last_name: 'User', role: 'admin', is_active: true, is_superuser: true }
      })});
    }
    if (url.includes('/roles')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ role: 'admin', permissions: {} }) });
    }
    if (url.includes('/analytics/financial/pnl')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_PNL) });
    }
    if (url.includes('/analytics/financial/cash-flow-forecast')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_CASH_FLOW) });
    }
    if (url.includes('/analytics/financial/ar-aging')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_AR_AGING) });
    }
    if (url.includes('/analytics/financial/margins-by-type')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_MARGINS) });
    }
    if (url.includes('/analytics/financial/tech-profitability')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TECH_PROFIT) });
    }
    if (url.includes('/analytics/financial/contract-revenue')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_CONTRACT_REVENUE) });
    }
    // Default: empty array
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  const consoleErrors = [];
  const page = await ctx.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!KNOWN_ERRORS.some(k => text.includes(k))) {
        consoleErrors.push(text);
      }
    }
  });

  console.log('Navigating to /analytics/financial...');
  await page.goto('https://react.ecbtx.com/analytics/financial', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);

  // Test 1: Page loads
  const bodyText = await page.textContent('body');
  check('Page loads without 404', !bodyText.includes('404') && bodyText.includes('Financial'));

  // Test 2: 6 KPI cards visible
  const kpiRow = await page.$('[data-testid="kpi-row"]');
  let kpiCardCount = 0;
  if (kpiRow) {
    const cards = await kpiRow.$$(':scope > div');
    kpiCardCount = cards.length;
  }
  check('6 KPI cards visible', kpiCardCount === 6);

  // Test 3: KPI values
  const hasRevenue = bodyText.includes('87,450') || bodyText.includes('$87,450');
  check('Revenue KPI shows correct value', hasRevenue);

  // Test 4: Health alerts visible
  const alertsPanel = await page.$('[data-testid="health-alerts"]');
  check('Health alerts panel visible', !!alertsPanel);

  // Test 5: Contract expiry alert (3 expiring)
  const hasExpiryAlert = bodyText.includes('3 contracts expiring');
  check('Contract expiry alert present', hasExpiryAlert);

  // Test 6: Mini charts have SVGs
  const svgCount = await page.$$eval('svg', (svgs) => svgs.length);
  check('Charts render (SVG elements present)', svgCount >= 3);

  // Test 7: Click Revenue & P&L tab
  const pnlTab = await page.$('button:has-text("Revenue")');
  if (pnlTab) await pnlTab.click();
  await page.waitForTimeout(2000);
  const pnlBody = await page.textContent('body');
  const hasPnlChart = pnlBody.includes('Profit & Loss');
  check('Revenue & P&L tab shows P&L chart', hasPnlChart);

  // Test 8: Click Receivables tab
  const recTab = await page.$('button:has-text("Receivables")');
  if (recTab) await recTab.click();
  await page.waitForTimeout(2000);
  const recBody = await page.textContent('body');
  const hasDonut = recBody.includes('Accounts Receivable Aging');
  check('Receivables tab shows AR donut', hasDonut);

  // Test 9: Click Team & Contracts tab
  const teamTab = await page.$('button:has-text("Team")');
  if (teamTab) await teamTab.click();
  await page.waitForTimeout(2000);
  const techTable = await page.$('[data-testid="tech-table"]');
  let techRowCount = 0;
  if (techTable) {
    const rows = await techTable.$$('tbody tr');
    techRowCount = rows.length;
  }
  check('Team tab shows tech table with 4 rows', techRowCount === 4);

  // Test 10: No unexpected console errors
  check('No unexpected console errors', consoleErrors.length === 0);
  if (consoleErrors.length > 0) {
    console.log('Console errors:', consoleErrors.slice(0, 5));
  }

  await browser.close();

  console.log(`\n${'='.repeat(50)}`);
  console.log(`TOTAL: ${PASS.length + FAIL.length} | PASS: ${PASS.length} | FAIL: ${FAIL.length}`);
  if (FAIL.length) {
    console.log('\nFailed tests:');
    FAIL.forEach(f => console.log('  FAIL -', f));
  } else {
    console.log('ALL TESTS PASSED!');
  }
  console.log(`\nPLAYWRIGHT RUN RESULTS:`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Target URL: https://react.ecbtx.com/analytics/financial`);
  console.log(`Test Outcome: ${FAIL.length === 0 ? 'PASS' : 'FAIL'}`);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
