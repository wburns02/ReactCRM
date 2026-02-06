import { chromium } from '@playwright/test';

(async () => {
  const consoleLogs = [];
  const samsaraRequests = [];
  const failedRequests = [];
  const pageErrors = [];

  console.log("=== FLEET MAP LIVE TEST ===\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  page.on('pageerror', err => {
    pageErrors.push(err.message);
  });

  page.on('requestfailed', req => {
    failedRequests.push({ url: req.url(), failure: req.failure()?.errorText });
  });

  page.on('response', async resp => {
    const url = resp.url();
    if (url.includes('/samsara') || url.includes('samsara')) {
      let body = null;
      try {
        body = await resp.text();
        if (body.length > 3000) body = body.substring(0, 3000) + '... [TRUNCATED]';
      } catch (e) {
        body = '[Could not read body]';
      }
      samsaraRequests.push({
        url,
        status: resp.status(),
        body,
      });
    }
  });

  try {
    // Step 1: Login
    console.log("[1] Navigating to login page...");
    await page.goto('https://react.ecbtx.com/login', { waitUntil: 'networkidle', timeout: 30000 });
    console.log("    URL:", page.url());

    // Step 2: Login
    console.log("[2] Logging in...");
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });

    const emailInput = await page.$('input[type="email"]') || await page.$('input[name="email"]');
    const passwordInput = await page.$('input[type="password"]');

    if (!emailInput || !passwordInput) {
      console.log("    ERROR: Could not find login fields!");
      await browser.close();
      return;
    }

    await emailInput.fill('will@macseptic.com');
    await passwordInput.fill('#Espn2025');

    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
    } else {
      await passwordInput.press('Enter');
    }

    await page.waitForURL('**/dashboard**', { timeout: 15000 }).catch(() => {
      console.log("    Did not redirect to dashboard, checking URL...");
    });
    console.log("    After login URL:", page.url());
    await page.waitForTimeout(2000);

    // Step 3: Navigate to fleet
    console.log("[3] Navigating to /fleet...");
    await page.goto('https://react.ecbtx.com/fleet', { waitUntil: 'networkidle', timeout: 45000 });
    console.log("    Fleet page URL:", page.url());

    // Wait for content
    await page.waitForTimeout(5000);

    // Step 4: Screenshot
    console.log("[4] Taking screenshot...");
    await page.screenshot({ path: '/home/will/fleet_map_current_state.png', fullPage: true });
    console.log("    Screenshot saved.");

    // Step 5: DOM inspection
    console.log("\n[5] DOM INSPECTION\n");

    const checks = [
      ['Leaflet map', '.leaflet-container'],
      ['Mapbox map', '.mapboxgl-map'],
      ['Vehicle markers', '.vehicle-marker'],
      ['Leaflet markers', '.leaflet-marker-icon'],
      ['SVG markers', 'svg'],
      ['Cards', '[class*="Card"], [class*="card"]'],
      ['Stats', '[class*="stat"], [class*="Stat"]'],
      ['Loading', '[class*="loading"], [class*="Loading"], [class*="spinner"]'],
      ['Error msgs', '[class*="error"], [class*="Error"], [class*="danger"]'],
      ['Popups', '.leaflet-popup, [class*="popup"], [class*="Popup"]'],
      ['Legend', '[class*="legend"], [class*="Legend"]'],
      ['Badge', '[class*="badge"], [class*="Badge"]'],
    ];

    for (const [name, sel] of checks) {
      try {
        const els = await page.$$(sel);
        if (els.length > 0) {
          console.log("  FOUND:", name, "=>", els.length, "element(s)");
        }
      } catch (e) { /* skip */ }
    }

    // Headings
    const headings = await page.$$eval('h1, h2, h3', els =>
      els.map(e => e.tagName + ': ' + e.textContent.trim().substring(0, 80))
    );
    console.log("\n  Headings:", JSON.stringify(headings));

    // Get visible text
    const bodyText = await page.$eval('body', el => el.innerText.substring(0, 4000));
    console.log("\n  Page text (first 2000 chars):");
    console.log(bodyText.substring(0, 2000));

  } catch (err) {
    console.log("\n  CRITICAL ERROR:", err.message);
    try {
      await page.screenshot({ path: '/home/will/fleet_map_current_state.png', fullPage: true });
    } catch (_) {}
  }

  // Print results
  console.log("\n\n=== CONSOLE ERRORS ===");
  const errors = consoleLogs.filter(l => l.type === 'error');
  console.log("Count:", errors.length);
  errors.forEach(l => console.log("  [ERROR]", l.text.substring(0, 300)));

  console.log("\n=== CONSOLE WARNINGS ===");
  const warnings = consoleLogs.filter(l => l.type === 'warning');
  console.log("Count:", warnings.length);
  warnings.forEach(l => console.log("  [WARN]", l.text.substring(0, 300)));

  console.log("\n=== PAGE ERRORS ===");
  console.log("Count:", pageErrors.length);
  pageErrors.forEach(e => console.log("  ", e.substring(0, 500)));

  console.log("\n=== SAMSARA API REQUESTS ===");
  console.log("Count:", samsaraRequests.length);
  samsaraRequests.forEach(r => {
    console.log("\n  Status:", r.status, r.url);
    console.log("  Body:", r.body?.substring(0, 1500));
  });

  console.log("\n=== FAILED REQUESTS ===");
  console.log("Count:", failedRequests.length);
  failedRequests.forEach(r => console.log("  ", r.url, "=>", r.failure));

  await browser.close();
  console.log("\n=== TEST COMPLETE ===");
})();
