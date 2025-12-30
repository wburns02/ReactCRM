import { test } from '@playwright/test';

test('Quick check login page', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    errors.push('PAGE ERROR: ' + err.message);
  });

  await page.goto('https://react.ecbtx.com/app/login');
  await page.waitForTimeout(5000);

  console.log('URL:', page.url());
  const html = await page.content();
  console.log('HTML length:', html.length);
  console.log('Root content length:', (await page.locator('#root').innerHTML().catch(() => '')).length);

  if (errors.length > 0) {
    console.log('ERRORS:');
    errors.forEach(e => console.log('  -', e));
  } else {
    console.log('No JS errors');
  }

  await page.screenshot({ path: 'login-check.png', fullPage: true });
});
