/**
 * Geocivix Direct API Explorer
 * Uses page.evaluate() for all interactions to avoid visibility issues
 */

import { chromium } from 'playwright';
import * as fs from 'fs';

const PORTAL_URL = 'https://williamson.geocivix.com/secure/';
const USERNAME = 'willwalterburns@gmail.com';
const PASSWORD = '#Espn2025';

interface APIResult {
  endpoint: string;
  status: number;
  bodyLength: number;
  preview: string;
  fullBody?: string;
}

async function exploreGeocivixDirect() {
  console.log('=== Geocivix Direct API Explorer ===\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Step 1: Load portal and login via JavaScript
  console.log('1. Loading portal and logging in via JavaScript...');
  await page.goto(PORTAL_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Login using page.evaluate to avoid click issues
  const loginResult = await page.evaluate(async (creds) => {
    // First call user.scheme
    const schemeResp = await fetch('/secure/?action=user.scheme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `username=${encodeURIComponent(creds.username)}&rememberme=false`
    });

    // Then authenticate
    const authResp = await fetch('/secure/?action=user.authenticate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `username=${encodeURIComponent(creds.username)}&password=${encodeURIComponent(creds.password)}&rememberme=false&token=`
    });

    return {
      schemeStatus: schemeResp.status,
      authStatus: authResp.status,
      authBody: await authResp.text()
    };
  }, { username: USERNAME, password: PASSWORD });

  console.log('  Scheme status: ' + loginResult.schemeStatus);
  console.log('  Auth status: ' + loginResult.authStatus);
  console.log('  Auth response preview: ' + loginResult.authBody.substring(0, 200));

  // Reload to apply session
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'geocivix_after_js_login.png' });
  console.log('  Page title after reload: ' + await page.title());

  // Step 2: Test user submittals endpoint
  console.log('\n2. Testing user-submittals endpoint...');
  const userSubmittals = await page.evaluate(async () => {
    const resp = await fetch('/secure/?action=project.user-submittals');
    const body = await resp.text();
    return { status: resp.status, body };
  });
  console.log('  Status: ' + userSubmittals.status);
  console.log('  Body length: ' + userSubmittals.body.length);
  fs.writeFileSync('geocivix_user_submittals.html', userSubmittals.body);
  console.log('  Saved to geocivix_user_submittals.html');

  // Step 3: Test search suggest API
  console.log('\n3. Testing search.suggest endpoint...');
  const searchSuggest = await page.evaluate(async () => {
    const resp = await fetch('/secure/?action=search.suggest&step=project&fullsearch=1&query=septic');
    const body = await resp.text();
    return { status: resp.status, body };
  });
  console.log('  Status: ' + searchSuggest.status);
  console.log('  Body length: ' + searchSuggest.body.length);
  console.log('  Preview: ' + searchSuggest.body.substring(0, 500));
  fs.writeFileSync('geocivix_search_suggest.html', searchSuggest.body);

  // Step 4: Test a comprehensive list of API endpoints
  console.log('\n4. Testing comprehensive API endpoints...');
  const endpoints: string[] = [
    // Project-related
    '/secure/?action=project.user-submittals',
    '/secure/?action=project.search-results',
    '/secure/?action=project.browse',
    '/secure/?action=project.recent',
    '/secure/?action=project.tracked',
    '/secure/?action=project.list',
    '/secure/?action=project.types',

    // Search-related
    '/secure/?action=search.suggest&step=project&fullsearch=1&query=permit',
    '/secure/?action=search.results&query=permit',
    '/secure/?action=search.advanced',

    // Permit-related
    '/secure/?action=permit.types',
    '/secure/?action=permit.list',
    '/secure/?action=permit.search',
    '/secure/?action=permit.browse',

    // Inspection-related
    '/secure/?action=inspection.user-inspections',
    '/secure/?action=inspection.list',
    '/secure/?action=inspection.browse',

    // User-related
    '/secure/?action=user.profile',
    '/secure/?action=user.settings',
    '/secure/?action=user.notifications',

    // Company/contractor
    '/secure/?action=company.search',
    '/secure/?action=contractor.search'
  ];

  const results: APIResult[] = [];

  for (const endpoint of endpoints) {
    const result = await page.evaluate(async (url) => {
      try {
        const resp = await fetch(url);
        const body = await resp.text();
        return {
          endpoint: url,
          status: resp.status,
          bodyLength: body.length,
          preview: body.substring(0, 300).replace(/\s+/g, ' '),
          fullBody: body.length < 100000 ? body : body.substring(0, 100000)
        };
      } catch (e) {
        return {
          endpoint: url,
          status: -1,
          bodyLength: 0,
          preview: 'ERROR: ' + (e as Error).message
        };
      }
    }, endpoint);

    results.push(result);
    const actionName = endpoint.split('action=')[1]?.split('&')[0] || endpoint;
    const isInvalid = result.preview.includes('INVALID REQUEST');
    const statusEmoji = result.status === 200 && !isInvalid ? '✓' : '✗';
    console.log(`  ${statusEmoji} ${actionName}: ${result.status} (${result.bodyLength} chars)`);

    if (result.status === 200 && !isInvalid && result.bodyLength > 100) {
      console.log(`      Preview: ${result.preview.substring(0, 80)}...`);
    }
  }

  // Step 5: Navigate to project search page and get form structure
  console.log('\n5. Getting project search form structure...');
  await page.goto('https://williamson.geocivix.com/secure/project/?step=search', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'geocivix_project_search.png' });

  const formStructure = await page.evaluate(() => {
    const forms = document.querySelectorAll('form');
    const formData: any[] = [];

    forms.forEach((form, i) => {
      const inputs = form.querySelectorAll('input, select, textarea');
      const fields: any[] = [];
      inputs.forEach(inp => {
        fields.push({
          tag: inp.tagName,
          name: inp.getAttribute('name'),
          id: inp.id,
          type: inp.getAttribute('type'),
          className: inp.className
        });
      });
      formData.push({
        formIndex: i,
        action: form.action,
        method: form.method,
        id: form.id,
        fields
      });
    });

    return formData;
  });

  console.log('  Forms found: ' + formStructure.length);
  formStructure.forEach(f => {
    console.log(`  Form #${f.formIndex}: action=${f.action}, method=${f.method}`);
    f.fields.forEach((field: any) => {
      if (field.name || field.id) {
        console.log(`    ${field.tag} name="${field.name}" id="${field.id}" type="${field.type}"`);
      }
    });
  });

  // Step 6: Try POST search
  console.log('\n6. Testing POST search endpoint...');
  const postSearch = await page.evaluate(async () => {
    const formData = new FormData();
    formData.append('query', 'septic');

    const resp = await fetch('/secure/?action=project.search-results', {
      method: 'POST',
      body: formData
    });
    const body = await resp.text();
    return { status: resp.status, body };
  });
  console.log('  Status: ' + postSearch.status);
  console.log('  Body length: ' + postSearch.body.length);
  console.log('  Preview: ' + postSearch.body.substring(0, 500));
  fs.writeFileSync('geocivix_post_search.html', postSearch.body);

  // Step 7: Extract JavaScript sources for API patterns
  console.log('\n7. Extracting API patterns from loaded JavaScript...');
  const jsContent = await page.evaluate(() => {
    // Get all script content
    const scripts = document.querySelectorAll('script:not([src])');
    let content = '';
    scripts.forEach(s => content += s.textContent + '\n');
    return content;
  });

  // Find action patterns in the scripts
  const actionMatches = jsContent.match(/action[=:]['"][a-zA-Z0-9\.\-\_]+['"]/gi) || [];
  const uniqueActions = [...new Set(actionMatches.map(m => m.replace(/action[=:]['"]/, '').replace(/['"]/, '')))];
  console.log('  Found action patterns in scripts:');
  uniqueActions.forEach(a => console.log('    ' + a));

  // Step 8: Get page source and extract more patterns
  console.log('\n8. Extracting patterns from page source...');
  const pageSource = await page.content();

  // Find all action= URLs
  const urlMatches = pageSource.match(/action=[a-zA-Z0-9\.\-\_]+/g) || [];
  const uniqueUrls = [...new Set(urlMatches)];
  console.log('  All action= patterns found:');
  uniqueUrls.forEach(u => console.log('    ' + u));

  fs.writeFileSync('geocivix_page_source.html', pageSource);

  // Step 9: Try to get the idtplans JavaScript files
  console.log('\n9. Downloading idtplans JavaScript files...');

  const jsFiles = [
    '/js/idtplans.project.js',
    '/js/idtplans.permit.js',
    '/js/idtplans.projectIssues.js'
  ];

  for (const jsFile of jsFiles) {
    const jsResp = await page.evaluate(async (url) => {
      const resp = await fetch(url);
      return await resp.text();
    }, jsFile);

    fs.writeFileSync('geocivix_' + jsFile.split('/').pop(), jsResp);
    console.log('  Saved: ' + jsFile + ' (' + jsResp.length + ' chars)');

    // Find action patterns in this JS file
    const jsActions = jsResp.match(/action=[a-zA-Z0-9\.\-\_]+/g) || [];
    const uniqueJsActions = [...new Set(jsActions)];
    console.log('    Actions in this file: ' + uniqueJsActions.join(', '));
  }

  // Step 10: Save comprehensive analysis
  console.log('\n10. Saving comprehensive analysis...');

  const analysis = {
    portal: {
      name: 'Williamson County TN Geocivix',
      baseUrl: 'https://williamson.geocivix.com/secure/',
      platform: 'idtplans by Geocivix'
    },
    authentication: {
      method: 'Session cookie based',
      endpoints: [
        { url: '/secure/?action=user.scheme', method: 'POST', params: 'username, rememberme' },
        { url: '/secure/?action=user.authenticate', method: 'POST', params: 'username, password, rememberme, token' }
      ]
    },
    discoveredEndpoints: results.filter(r => r.status === 200 && !r.preview.includes('INVALID')).map(r => ({
      url: r.endpoint,
      bodyLength: r.bodyLength,
      preview: r.preview.substring(0, 100)
    })),
    allTestedEndpoints: results.map(r => ({
      endpoint: r.endpoint.split('action=')[1]?.split('&')[0],
      status: r.status,
      valid: r.status === 200 && !r.preview.includes('INVALID')
    })),
    formStructure,
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync('geocivix_analysis.json', JSON.stringify(analysis, null, 2));
  console.log('  Saved geocivix_analysis.json');

  // Save valid endpoint responses
  results.filter(r => r.status === 200 && !r.preview.includes('INVALID') && r.fullBody).forEach(r => {
    const filename = 'geocivix_' + (r.endpoint.split('action=')[1]?.split('&')[0] || 'unknown').replace(/\./g, '_') + '.html';
    fs.writeFileSync(filename, r.fullBody || '');
    console.log('  Saved: ' + filename);
  });

  console.log('\n=== EXPLORATION COMPLETE ===');
  console.log('Browser staying open for 15 seconds...');
  await page.waitForTimeout(15000);

  await browser.close();
}

exploreGeocivixDirect().catch(console.error);
