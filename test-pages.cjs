const { chromium } = require('playwright');
const fs = require('fs');

const TESTS = [];
function test(name, fn) { TESTS.push({ name, fn }); }

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  
  // Auth bypass
  await ctx.addInitScript(() => {
    sessionStorage.setItem('session_state', JSON.stringify({
      isAuthenticated: true,
      lastValidated: Date.now(),
      userId: 'test-user'
    }));
    localStorage.setItem('crm_session_token', 'mock-token');
  });

  const page = await ctx.newPage();
  const results = { passed: 0, failed: 0, total: 0 };

  test("Inventory page loads", async () => {
    await page.goto('https://react.ecbtx.com/inventory', { timeout: 30000, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const h1 = await page.textContent('body');
    return h1?.toLowerCase().includes('inventory') || h1?.toLowerCase().includes('stock');
  });

  test("Fleet page loads", async () => {
    await page.goto('https://react.ecbtx.com/fleet', { timeout: 30000, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const h1 = await page.textContent('body');
    return h1?.toLowerCase().includes('fleet');
  });

  test("Equipment page loads", async () => {
    await page.goto('https://react.ecbtx.com/equipment', { timeout: 30000, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const tabs = await page.$$('[role="tab"]');
    return tabs.length >= 2;
  });

  test("Equipment/Health page loads", async () => {
    await page.goto('https://react.ecbtx.com/equipment/health', { timeout: 30000, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const h1 = await page.textContent('body');
    return h1?.toLowerCase().includes('health') || h1?.toLowerCase().includes('equipment');
  });

  // Run tests
  for (const { name, fn } of TESTS) {
    results.total++;
    try {
      const result = await fn();
      if (result) {
        results.passed++;
        console.log(`✓ ${name}`);
      } else {
        results.failed++;
        console.log(`✗ ${name} - assertion failed`);
      }
    } catch (e) {
      results.failed++;
      console.log(`✗ ${name} - ${e.message}`);
    }
  }

  await browser.close();
  console.log(`\n${results.passed}/${results.total} tests passed`);
  process.exit(results.failed > 0 ? 1 : 0);
})().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});
