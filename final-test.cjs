const { chromium } = require('playwright');

(async () => {
  console.log('🎯 FINAL VERIFICATION: Single-file bundle deployment');
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const consoleErrors = [];
  const jsFiles = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('request', (request) => {
    if (request.url().includes('.js') && request.url().includes('react.ecbtx.com')) {
      jsFiles.push(request.url());
    }
  });

  console.log('🌐 Loading production site after deployment...');
  await page.goto('https://react.ecbtx.com');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(8000);

  console.log('\n📦 JAVASCRIPT FILES LOADED:');
  jsFiles.forEach((file, i) => {
    const filename = file.split('/').pop();
    console.log(`${i + 1}. ${filename}`);
  });

  // Check bundle structure
  const singleBundle = jsFiles.some(file => file.includes('assets/index-') && file.endsWith('.js'));
  const multipleVendorChunks = jsFiles.filter(file => file.includes('vendor-')).length > 1;

  console.log('\n🏗️  BUNDLE ANALYSIS:');
  console.log(`Single bundle detected: ${singleBundle ? '✅ YES' : '❌ NO'}`);
  console.log(`Multiple vendor chunks: ${multipleVendorChunks ? '❌ YES' : '✅ NO'}`);

  // Check React app
  const reactRoot = await page.textContent('#root');
  const hasContent = reactRoot && reactRoot.length > 100;
  const hasLoginForm = await page.locator('input[type="email"]').count();

  console.log('\n⚛️  REACT APP STATUS:');
  console.log(`React root has content: ${hasContent ? '✅ YES' : '❌ NO'}`);
  console.log(`Login form visible: ${hasLoginForm > 0 ? '✅ YES' : '❌ NO'}`);
  console.log(`Console errors: ${consoleErrors.length}`);

  const createContextErrors = consoleErrors.filter(error =>
    error.includes('createContext') || error.includes('Cannot read properties of undefined')
  );

  console.log(`CreateContext errors: ${createContextErrors.length}`);

  const success = singleBundle && !multipleVendorChunks && createContextErrors.length === 0;

  console.log('\n🎉 FINAL RESULT:');
  if (success) {
    console.log('✅ SUCCESS: Single-file bundle deployed and createContext error RESOLVED!');
  } else {
    console.log('❌ ISSUE: Still problems detected');
    if (consoleErrors.length > 0) {
      console.log('\nErrors:');
      consoleErrors.forEach((error, i) => console.log(`${i + 1}. ${error}`));
    }
  }

  await browser.close();
  process.exit(success ? 0 : 1);
})();