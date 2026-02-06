import { chromium } from '@playwright/test';

(async () => {
  const consoleLogs = [];
  const samsaraRequests = [];
  const pageErrors = [];

  console.log("=== FLEET MAP POWERHOUSE VERIFICATION ===\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  page.on('console', msg => consoleLogs.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', err => pageErrors.push(err.message));
  page.on('response', async resp => {
    if (resp.url().includes('/samsara')) {
      let body = null;
      try { body = await resp.text(); } catch { body = '[unreadable]'; }
      samsaraRequests.push({ url: resp.url(), status: resp.status(), bodyLen: body?.length || 0 });
    }
  });

  try {
    // Login
    console.log("[1] Logging in...");
    await page.goto('https://react.ecbtx.com/login', { waitUntil: 'networkidle', timeout: 30000 });
    const emailInput = await page.$('input[type="email"]') || await page.$('input[name="email"]');
    const passwordInput = await page.$('input[type="password"]');
    await emailInput.fill('will@macseptic.com');
    await passwordInput.fill('#Espn2025');
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) await submitBtn.click();
    else await passwordInput.press('Enter');
    await page.waitForURL('**/dashboard**', { timeout: 15000 }).catch(() => {});
    console.log("    Logged in. URL:", page.url());

    // Navigate to fleet
    console.log("[2] Navigating to /fleet...");
    await page.goto('https://react.ecbtx.com/fleet', { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(5000);
    console.log("    Fleet loaded. URL:", page.url());

    // Screenshot
    await page.screenshot({ path: '/home/will/fleet_map_powerhouse.png', fullPage: true });
    console.log("[3] Screenshot saved to fleet_map_powerhouse.png");

    // Check for key new elements
    console.log("\n[4] ELEMENT CHECKS:");

    const checks = [
      ['MapLibre canvas', 'canvas.maplibregl-canvas, canvas.mapboxgl-canvas'],
      ['Leaflet container (OLD)', '.leaflet-container'],
      ['Map style buttons', 'button:has-text("Light"), button:has-text("Dark")'],
      ['Fleet sidebar', 'input[placeholder*="Search"]'],
      ['Status filter chips', 'button:has-text("Moving"), button:has-text("Stopped")'],
      ['Vehicle list items', 'button:has-text("Service Truck"), button:has-text("Vacuum Truck")'],
      ['Navigation controls', '.maplibregl-ctrl-group, .mapboxgl-ctrl-group'],
      ['Legend', ':text("Vehicle Status")'],
      ['Stats chips in header', ':text("Total")'],
      ['SSE indicator', ':text("Live"), :text("Polling")'],
      ['Fit All button', 'button:has-text("Fit All")'],
    ];

    for (const [name, sel] of checks) {
      try {
        const els = await page.$$(sel);
        console.log(`    ${els.length > 0 ? 'FOUND' : 'MISSING'}: ${name} (${els.length})`);
      } catch { console.log(`    ERROR: ${name}`); }
    }

    // Get visible text
    const bodyText = await page.$eval('body', el => el.innerText.substring(0, 3000));
    console.log("\n[5] PAGE TEXT (first 1500 chars):");
    console.log(bodyText.substring(0, 1500));

  } catch (err) {
    console.log("\n  ERROR:", err.message);
    try { await page.screenshot({ path: '/home/will/fleet_map_powerhouse.png', fullPage: true }); } catch {}
  }

  console.log("\n=== CONSOLE ERRORS ===");
  consoleLogs.filter(l => l.type === 'error').forEach(l => console.log("  [ERROR]", l.text.substring(0, 200)));

  console.log("\n=== PAGE ERRORS ===");
  pageErrors.forEach(e => console.log("  ", e.substring(0, 300)));

  console.log("\n=== SAMSARA REQUESTS ===");
  samsaraRequests.forEach(r => console.log(`  ${r.status} ${r.url} (${r.bodyLen} bytes)`));

  await browser.close();
  console.log("\n=== DONE ===");
})();
