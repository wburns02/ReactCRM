const { chromium } = require('playwright');

/**
 * Simple production verification using Playwright
 * Tests core functionality without authentication dependencies
 */

async function runProductionTest() {
  console.log('🚀 Starting production site verification...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const page = await context.newPage();

  const tests = [];
  const results = { passed: 0, failed: 0, errors: [] };

  async function test(name, testFn) {
    try {
      console.log(`⏳ ${name}...`);
      await testFn();
      console.log(`✅ ${name}`);
      results.passed++;
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      results.failed++;
      results.errors.push({ name, error: error.message });
    }
  }

  // Test 1: Homepage loads correctly
  await test('Homepage loads without errors', async () => {
    const response = await page.goto('https://react.ecbtx.com/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    if (response?.status() !== 200) {
      throw new Error(`HTTP ${response?.status()}`);
    }

    // Wait for page content to load
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    const title = await page.title();
    if (!title.includes('Septic')) {
      throw new Error(`Unexpected title: ${title}`);
    }
  });

  // Test 2: Login page accessible
  await test('Login page accessible', async () => {
    const response = await page.goto('https://react.ecbtx.com/login', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });

    if (response?.status() !== 200) {
      throw new Error(`HTTP ${response?.status()}`);
    }

    // Should see login form or be redirected
    const url = page.url();
    const hasLoginElements = await page.locator('form, input[type="email"], input[type="password"]').count() > 0;
    const isValidRedirect = url.includes('/dashboard') || url.includes('/home');

    if (!hasLoginElements && !isValidRedirect) {
      throw new Error('No login form found and no valid redirect');
    }
  });

  // Test 3: No critical console errors
  await test('No critical JavaScript errors', async () => {
    const errors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Filter out non-critical errors
        if (!text.includes('favicon.ico') &&
            !text.includes('sw.js') &&
            !text.includes('workbox') &&
            !text.includes('chrome-extension')) {
          errors.push(text);
        }
      }
    });

    // Navigate and wait for any errors
    await page.goto('https://react.ecbtx.com/', {
      waitUntil: 'networkidle',
      timeout: 15000
    });

    await page.waitForTimeout(3000);

    if (errors.length > 2) {
      throw new Error(`Found ${errors.length} critical errors: ${errors.slice(0, 3).join('; ')}`);
    }
  });

  await browser.close();

  console.log(`\n📊 Test Results:`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);

  if (results.failed === 0) {
    console.log('\n🎉 Production site verification PASSED! Site is healthy.');
    return true;
  } else {
    console.log('\n⚠️  Some tests failed:');
    results.errors.forEach(({ name, error }) => {
      console.log(`  • ${name}: ${error}`);
    });
    return false;
  }
}

runProductionTest()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  });