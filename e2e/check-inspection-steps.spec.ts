import { test, expect } from '@playwright/test';

test('scroll to see steps', async ({ page }) => {
  await page.goto('https://react.ecbtx.com/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', 'will@macseptic.com');
  await page.fill('input[type="password"]', '#Espn2025');
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !location.href.includes('/login'), { timeout: 15000 });
  await page.waitForTimeout(3000);
  
  const jobId = '1adef83b-9be1-4359-a022-835ba5714949';
  await page.goto(`https://react.ecbtx.com/portal/jobs/${jobId}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  
  // Click Inspect tab
  await page.click('button:has-text("Inspect"), [role="tab"]:has-text("Inspect")').catch(() => {});
  await page.waitForTimeout(2000);
  
  // Scroll down progressively to load all content
  await page.evaluate(() => window.scrollTo(0, 3000));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/scroll1.png', fullPage: false });
  
  const full = await page.evaluate(() => document.body.innerText);
  // Find step-numbered sections
  const lines = full.split('\n');
  const stepLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Step number at start of line (1, 2, ... 16)
    if (/^\d{1,2}\s*$/.test(line) || /^\d{1,2}\s+\w/.test(line)) {
      stepLines.push(`LINE ${i}: "${line}" | next: "${lines[i+1]?.trim()}" | next2: "${lines[i+2]?.trim()}"`);
    }
  }
  console.log('NUMBERED LINES:\n', stepLines.slice(0,30).join('\n'));
  
  // Print all content after 'Check All Equipment First'
  const idx = full.indexOf('Check All Equipment First');
  if (idx !== -1) {
    console.log('\nAFTER EQUIPMENT CHECK:', full.substring(idx, idx + 3000));
  }
});
