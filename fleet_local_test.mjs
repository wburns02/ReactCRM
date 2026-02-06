import { chromium } from '@playwright/test';

(async () => {
  const consoleLogs = [];
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  page.on('console', msg => consoleLogs.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', err => console.log("PAGE ERROR:", err.message));

  // Go directly to fleet page (dev server doesn't need auth)
  await page.goto('http://localhost:5173/fleet', { waitUntil: 'networkidle', timeout: 30000 }).catch(e => {
    console.log("Navigation error:", e.message);
  });

  await page.waitForTimeout(3000);

  // Check for errors
  console.log("\nCONSOLE ERRORS:");
  consoleLogs.filter(l => l.type === 'error').forEach(l => console.log("  ", l.text.substring(0, 500)));

  console.log("\nCONSOLE WARNINGS:");
  consoleLogs.filter(l => l.type === 'warning').forEach(l => console.log("  ", l.text.substring(0, 500)));

  // Check page content
  const text = await page.$eval('body', el => el.innerText.substring(0, 1000)).catch(() => 'N/A');
  console.log("\nPAGE TEXT:", text.substring(0, 500));

  await page.screenshot({ path: '/home/will/fleet_local_test.png', fullPage: true });
  console.log("\nScreenshot saved to fleet_local_test.png");

  await browser.close();
})();
