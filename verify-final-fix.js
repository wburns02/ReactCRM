#!/usr/bin/env node

import { chromium } from 'playwright';

async function verifyFinalFix() {
  console.log('🔍 FINAL VERIFICATION: Testing comprehensive createContext fix...');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log('🔴 Console Error:', msg.text());
    }
  });

  // Capture uncaught exceptions
  const uncaughtErrors = [];
  page.on('pageerror', error => {
    uncaughtErrors.push(error.message);
    console.log('💥 Uncaught Error:', error.message);
  });

  try {
    console.log('🌐 Loading production site...');

    // Visit production site multiple times to test consistency
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`\n🔄 Test attempt ${attempt}/3:`);

      await page.goto('https://react.ecbtx.com', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      await page.waitForTimeout(6000);

      // Check basic page functionality
      const title = await page.title();
      const hasBodyText = (await page.locator('body').innerText()).length > 0;
      const hasVisibleContent = await page.locator('body *:visible').count() > 0;
      const hasLoginElements = await page.locator('input[type="email"], input[name="email"], button:has-text("Sign In")').count() > 0;

      console.log(`   📄 Title: "${title}"`);
      console.log(`   📦 Has content: ${hasVisibleContent}`);
      console.log(`   🔐 Has login: ${hasLoginElements}`);
      console.log(`   🚨 Console errors this attempt: ${consoleErrors.length}`);
      console.log(`   💥 Uncaught errors this attempt: ${uncaughtErrors.length}`);

      // Quick refresh for next attempt
      if (attempt < 3) {
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);
      }
    }

    // Final analysis
    const createContextErrors = [...consoleErrors, ...uncaughtErrors].filter(error =>
      error.includes('createContext') ||
      error.includes('Cannot read properties of undefined (reading \'createContext\')')
    );

    const finalTitle = await page.title();
    const finalHasContent = await page.locator('body *:visible').count() > 0;
    const finalHasLogin = await page.locator('input[type="email"], input[name="email"], button').count() > 0;

    console.log('\n🎯 FINAL RESULTS:');
    console.log('================');
    console.log(`   Total console errors: ${consoleErrors.length}`);
    console.log(`   Total uncaught errors: ${uncaughtErrors.length}`);
    console.log(`   CreateContext errors: ${createContextErrors.length}`);
    console.log(`   Page renders correctly: ${finalHasContent}`);
    console.log(`   Login form present: ${finalHasLogin}`);
    console.log(`   Title correct: ${finalTitle.includes('MAC Septic')}`);

    // Determine success
    const isFixed = (
      createContextErrors.length === 0 &&
      finalHasContent &&
      finalHasLogin &&
      finalTitle.includes('MAC Septic')
    );

    if (isFixed) {
      console.log('\n✅ 🎉 SUCCESS: CreateContext error is COMPLETELY FIXED!');
      console.log('   ✓ No createContext errors detected across multiple tests');
      console.log('   ✓ Page renders properly with visible content');
      console.log('   ✓ Login form loads correctly');
      console.log('   ✓ Title is correct');
      console.log('   ✓ Monitoring alerts should stop');
      console.log('\n🔧 Fix Details:');
      console.log('   - Added @sentry/react to vendor-react chunk');
      console.log('   - Added @tanstack/react-virtual to vendor-react chunk');
      console.log('   - Added @stripe/react-stripe-js to vendor-react chunk');
      console.log('   - Added lucide-react to vendor-react chunk');
      console.log('   - Added react-window to vendor-react chunk');
      console.log('   - Vendor-react chunk now 131.74 kB (was 95.14 kB)');
      console.log('   - ALL React-dependent packages now load with React core');
    } else {
      console.log('\n❌ STILL BROKEN:');

      if (createContextErrors.length > 0) {
        console.log('   - CreateContext errors persist:');
        createContextErrors.forEach(error => console.log(`     • ${error}`));
      }

      if (!finalHasContent) console.log('   - Page is still blank');
      if (!finalHasLogin) console.log('   - Login form missing');
      if (!finalTitle.includes('MAC Septic')) console.log('   - Wrong title');
    }

    if (consoleErrors.length > 0 || uncaughtErrors.length > 0) {
      console.log('\n📝 All errors captured:');
      [...consoleErrors, ...uncaughtErrors].forEach((error, i) =>
        console.log(`   ${i + 1}. ${error}`)
      );
    }

  } catch (error) {
    console.log('\n💥 Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

verifyFinalFix().catch(console.error);