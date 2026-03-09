import { test, expect } from '@playwright/test';

test.describe('Console Error Detection', () => {
  test('production site loads without createContext errors', async ({ page }) => {
    // Capture console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log('🔴 Console Error:', msg.text());
      }
    });

    // Capture uncaught exceptions
    const uncaughtErrors: string[] = [];
    page.on('pageerror', error => {
      uncaughtErrors.push(error.message);
      console.log('💥 Uncaught Error:', error.message);
    });

    console.log('🌐 Loading production site...');

    // Visit production site without authentication (should show login page)
    await page.goto('/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Wait for initial render and any delayed errors
    await page.waitForTimeout(3000);

    // Check if page loaded properly
    const title = await page.title();
    console.log('📄 Page title:', title);

    // Try to identify if we're on the login page
    const hasLoginForm = await page.locator('input[type="email"], input[name="email"]').count() > 0;
    console.log('🔐 Has login form:', hasLoginForm);

    // Check for createContext errors specifically
    const createContextErrors = consoleErrors.filter(error =>
      error.includes('createContext') ||
      error.includes('Cannot read properties of undefined (reading \'createContext\')')
    );

    const reactContextErrors = consoleErrors.filter(error =>
      error.includes('Cannot read properties of undefined') &&
      (error.includes('reading \'createContext') || error.includes('React'))
    );

    console.log('🚨 Total console errors found:', consoleErrors.length);
    console.log('🎯 CreateContext errors:', createContextErrors.length);
    console.log('⚛️  React context errors:', reactContextErrors.length);
    console.log('💥 Uncaught exceptions:', uncaughtErrors.length);

    if (consoleErrors.length > 0) {
      console.log('❌ All console errors:');
      consoleErrors.forEach((error, i) => console.log(`   ${i+1}. ${error}`));
    }

    if (createContextErrors.length > 0) {
      console.log('❌ CreateContext errors specifically:');
      createContextErrors.forEach(error => console.log('   -', error));
    }

    if (uncaughtErrors.length > 0) {
      console.log('❌ Uncaught exceptions:');
      uncaughtErrors.forEach(error => console.log('   -', error));
    }

    // Refresh a few times to catch race conditions
    console.log('🔄 Testing multiple refreshes...');
    for (let i = 0; i < 2; i++) {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
    }

    // Final error count
    const finalCreateContextErrors = consoleErrors.filter(error =>
      error.includes('createContext') ||
      error.includes('Cannot read properties of undefined (reading \'createContext\')')
    );

    console.log('🎬 Final results:');
    console.log(`   Total console errors: ${consoleErrors.length}`);
    console.log(`   CreateContext errors: ${finalCreateContextErrors.length}`);
    console.log(`   Uncaught exceptions: ${uncaughtErrors.length}`);

    // The test should fail if we find createContext errors
    if (finalCreateContextErrors.length > 0) {
      console.log('❌ FAILING TEST: CreateContext errors detected');
      expect(finalCreateContextErrors.length).toBe(0);
    } else {
      console.log('✅ SUCCESS: No createContext errors found');
    }
  });
});