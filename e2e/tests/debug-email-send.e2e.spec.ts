import { test, expect, Page } from '@playwright/test';
test.use({ storageState: undefined });
let authPage: Page;
let browserContext: any;

test.beforeAll(async ({ browser }) => {
  browserContext = await browser.newContext();
  authPage = await browserContext.newPage();
  await authPage.goto('https://react.ecbtx.com/login');
  await authPage.fill('input[type="email"]', 'will@macseptic.com');
  await authPage.fill('input[type="password"]', '#Espn2025');
  await authPage.click('button[type="submit"]');
  await authPage.waitForFunction(() => !location.href.includes('/login'), { timeout: 15000 });
});

test('check email service status', async () => {
  const status = await authPage.evaluate(async () => {
    const resp = await fetch('https://react-crm-api-production.up.railway.app/api/v2/communications/email/status', { credentials: 'include' });
    return resp.json();
  });
  console.log('[Email Status]', JSON.stringify(status));
});

test('debug email send API', async () => {
  const result = await authPage.evaluate(async () => {
    try {
      const resp = await fetch('https://react-crm-api-production.up.railway.app/api/v2/communications/email/send', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'willwalterburns@gmail.com',
          subject: 'CRM Test',
          body: 'Test email from CRM',
        }),
      });
      const text = await resp.text();
      return { status: resp.status, body: text };
    } catch (e: any) {
      return { error: String(e) };
    }
  });
  console.log('[Email Send Result]', JSON.stringify(result));
  expect(result.status).toBe(200);
});

test.afterAll(async () => {
  if (authPage) await authPage.close();
  if (browserContext) await browserContext.close();
});
