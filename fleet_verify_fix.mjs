import { chromium } from '@playwright/test';

(async () => {
  const consoleLogs = [];
  const pageErrors = [];
  const apiRequests = [];

  console.log("=== FLEET MAP FIX VERIFICATION ===\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  page.on('console', msg => consoleLogs.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', err => pageErrors.push(err.message));
  page.on('response', async resp => {
    if (resp.url().includes('/samsara') || resp.url().includes('/api/v2')) {
      apiRequests.push({ url: resp.url().split('?')[0], status: resp.status() });
    }
  });

  try {
    // Login
    console.log("[1] Logging in...");
    await page.goto('https://react.ecbtx.com/login', { waitUntil: 'networkidle', timeout: 30000 });
    const emailInput = await page.$('input[type="email"]') || await page.$('input[name="email"]');
    const passwordInput = await page.$('input[type="password"]');
    if (emailInput && passwordInput) {
      await emailInput.fill('will@macseptic.com');
      await passwordInput.fill('#Espn2025');
      const submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) await submitBtn.click();
      else await passwordInput.press('Enter');
      await page.waitForURL('**/dashboard**', { timeout: 15000 }).catch(() => {});
    }
    console.log("    Logged in. URL:", page.url());

    // Navigate to fleet
    console.log("[2] Navigating to /fleet...");
    await page.goto('https://react.ecbtx.com/fleet', { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(5000);
    console.log("    Fleet loaded. URL:", page.url());

    // Screenshot
    await page.screenshot({ path: '/home/will/fleet_fix_verify.png', fullPage: true });
    console.log("[3] Screenshot saved to fleet_fix_verify.png");

    // Check for error boundary
    const errorBoundary = await page.$('text=Something went wrong');
    const reactError = await page.$('text=Minified React error');
    console.log("\n[4] ERROR CHECKS:");
    console.log(`    Error boundary visible: ${!!errorBoundary}`);
    console.log(`    React error visible: ${!!reactError}`);

    // Check for key elements
    console.log("\n[5] ELEMENT CHECKS:");
    const checks = [
      ['Fleet Tracking heading', 'text=Fleet Tracking'],
      ['Map canvas', 'canvas'],
      ['Vehicle search input', 'input[placeholder*="Search"]'],
      ['Vehicles heading', 'text=Vehicles'],
      ['Status chips', 'text=Moving'],
      ['Live/Polling indicator', 'text=Live, text=Polling'],
      ['Legend', 'text=Vehicle Status'],
      ['Fit All button', 'text=Fit All'],
    ];

    for (const [name, sel] of checks) {
      try {
        const sels = sel.split(', ');
        let found = false;
        for (const s of sels) {
          const els = await page.$$(s);
          if (els.length > 0) { found = true; break; }
        }
        console.log(`    ${found ? 'FOUND' : 'MISSING'}: ${name}`);
      } catch { console.log(`    ERROR: ${name}`); }
    }

    // Wait a bit more and check for late errors
    await page.waitForTimeout(3000);

    // Get page text
    const bodyText = await page.$eval('body', el => el.innerText.substring(0, 2000)).catch(() => 'N/A');
    console.log("\n[6] PAGE TEXT (first 800 chars):");
    console.log(bodyText.substring(0, 800));

  } catch (err) {
    console.log("\n  FATAL ERROR:", err.message);
    try { await page.screenshot({ path: '/home/will/fleet_fix_verify.png', fullPage: true }); } catch {}
  }

  console.log("\n=== CONSOLE ERRORS ===");
  const errors = consoleLogs.filter(l => l.type === 'error');
  if (errors.length === 0) console.log("  (none)");
  else errors.forEach(l => console.log("  [ERROR]", l.text.substring(0, 300)));

  console.log("\n=== PAGE ERRORS ===");
  if (pageErrors.length === 0) console.log("  (none)");
  else pageErrors.forEach(e => console.log("  ", e.substring(0, 400)));

  console.log("\n=== API REQUESTS ===");
  apiRequests.forEach(r => console.log(`  ${r.status} ${r.url}`));

  console.log("\n=== CONSOLE WARNINGS ===");
  const warnings = consoleLogs.filter(l => l.type === 'warning');
  if (warnings.length === 0) console.log("  (none)");
  else warnings.slice(0, 5).forEach(l => console.log("  [WARN]", l.text.substring(0, 200)));

  await browser.close();
  console.log("\n=== DONE ===");
})();
