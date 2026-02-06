/**
 * Geocivix API Explorer - Focused on capturing search and permit APIs
 * Directly tests API endpoints after authentication
 */

import { chromium } from 'playwright';
import * as fs from 'fs';

const PORTAL_URL = 'https://williamson.geocivix.com/secure/';
const USERNAME = 'willwalterburns@gmail.com';
const PASSWORD = '#Espn2025';

interface APICapture {
  url: string;
  method: string;
  requestBody?: any;
  responseStatus?: number;
  responseBody?: string;
  timestamp: string;
}

const captures: APICapture[] = [];

async function exploreGeocivixAPIs() {
  console.log('=== Geocivix API Explorer ===\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture API calls
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('geocivix') && url.includes('action=')) {
      try {
        const body = await response.text();
        const requestPostData = response.request().postData();
        captures.push({
          url,
          method: response.request().method(),
          requestBody: requestPostData,
          responseStatus: response.status(),
          responseBody: body.substring(0, 50000),
          timestamp: new Date().toISOString()
        });
        console.log('[API] ' + response.status() + ' ' + url.split('?')[1]?.substring(0, 80));
      } catch (e) {}
    }
  });

  // Step 1: Login
  console.log('1. Logging in...');
  await page.goto(PORTAL_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const signInButton = await page.$('#user-login');
  if (signInButton) {
    await signInButton.click();
    await page.waitForTimeout(1500);

    const emailField = await page.$('input[name="username"]');
    const passwordField = await page.$('input[type="password"]');

    if (emailField && passwordField) {
      await emailField.fill(USERNAME);
      await page.waitForTimeout(200);
      await passwordField.fill(PASSWORD);

      const submitBtn = await page.$('button[type="submit"], .modal-footer button.btn-primary');
      if (submitBtn) {
        await submitBtn.click();
        await page.waitForTimeout(3000);
        console.log('  Logged in!\n');
      }
    }
  }

  // Step 2: Navigate to project search page
  console.log('2. Navigating to search page...');
  await page.goto('https://williamson.geocivix.com/secure/project/?step=search', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'geocivix_search_page.png' });
  console.log('  Search page loaded: ' + await page.title());

  // Step 3: Examine search form
  console.log('\n3. Examining search form...');
  const inputs = await page.$$eval('input, select', els =>
    els.map(el => ({
      tag: el.tagName,
      name: el.getAttribute('name'),
      id: el.id,
      type: el.getAttribute('type'),
      placeholder: el.getAttribute('placeholder')
    }))
  );
  console.log('  Form inputs found:');
  inputs.filter(i => i.name || i.id).slice(0, 20).forEach(i =>
    console.log('    ' + i.tag + ' name=' + i.name + ' id=' + i.id + ' type=' + i.type)
  );

  // Step 4: Test project.user-submittals API
  console.log('\n4. Testing project.user-submittals API...');
  const userSubmittalsResponse = await page.evaluate(async () => {
    const resp = await fetch('/secure/?action=project.user-submittals');
    return {
      status: resp.status,
      body: await resp.text()
    };
  });
  console.log('  Status: ' + userSubmittalsResponse.status);
  console.log('  Body preview: ' + userSubmittalsResponse.body.substring(0, 500));
  fs.writeFileSync('geocivix_user_submittals.html', userSubmittalsResponse.body);

  // Step 5: Test search.suggest API
  console.log('\n5. Testing search.suggest API...');
  const suggestResponse = await page.evaluate(async () => {
    const resp = await fetch('/secure/?action=search.suggest&step=project&fullsearch=1&query=septic');
    return {
      status: resp.status,
      body: await resp.text()
    };
  });
  console.log('  Status: ' + suggestResponse.status);
  console.log('  Body preview: ' + suggestResponse.body.substring(0, 1000));
  fs.writeFileSync('geocivix_search_suggest.html', suggestResponse.body);

  // Step 6: Test project.search-results API
  console.log('\n6. Testing project.search-results API...');
  const searchFormData = new URLSearchParams();
  searchFormData.append('query', 'septic');

  const searchResultsResponse = await page.evaluate(async (formData) => {
    const resp = await fetch('/secure/?action=project.search-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData
    });
    return {
      status: resp.status,
      body: await resp.text()
    };
  }, searchFormData.toString());
  console.log('  Status: ' + searchResultsResponse.status);
  console.log('  Body preview: ' + searchResultsResponse.body.substring(0, 1000));
  fs.writeFileSync('geocivix_search_results.html', searchResultsResponse.body);

  // Step 7: Look for project list/browse API
  console.log('\n7. Testing various API endpoints...');
  const apisToTest = [
    '/secure/?action=project.browse',
    '/secure/?action=project.recent',
    '/secure/?action=project.all',
    '/secure/?action=permit.browse',
    '/secure/?action=permit.recent',
    '/secure/?action=permit.all',
    '/secure/?action=inspection.list',
    '/secure/?action=inspection.browse',
    '/secure/?action=search.projects',
    '/secure/?action=search.permits'
  ];

  for (const api of apisToTest) {
    const resp = await page.evaluate(async (url) => {
      const r = await fetch(url);
      const text = await r.text();
      return {
        status: r.status,
        bodyLength: text.length,
        preview: text.substring(0, 200).replace(/\s+/g, ' ')
      };
    }, api);
    console.log('  ' + api.split('action=')[1] + ': ' + resp.status + ' (' + resp.bodyLength + ' chars)');
    if (!resp.preview.includes('INVALID REQUEST')) {
      console.log('    Preview: ' + resp.preview.substring(0, 100));
    }
  }

  // Step 8: Fill and submit actual search form
  console.log('\n8. Using the search form...');
  await page.goto('https://williamson.geocivix.com/secure/project/?step=search', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Look for search form fields
  const searchKeywordInput = await page.$('input[name="query"], input[name="keyword"], input[name="search"], #query, #keyword, #search-keyword');
  if (searchKeywordInput) {
    console.log('  Found search input, filling with "septic permit"...');
    await searchKeywordInput.fill('septic permit');
    await page.waitForTimeout(500);

    // Find and click search button
    const searchBtn = await page.$('button[type="submit"], input[type="submit"], button:has-text("Search"), .btn-primary:has-text("Search")');
    if (searchBtn) {
      console.log('  Clicking search button...');
      await searchBtn.click();
      await page.waitForTimeout(5000);
      await page.screenshot({ path: 'geocivix_search_results_page.png' });
      console.log('  Results page URL: ' + page.url());
    }
  } else {
    // Try to find any input on the search page
    console.log('  Looking for other form fields...');
    const allInputs = await page.$$('input:not([type="hidden"])');
    for (const inp of allInputs.slice(0, 5)) {
      const name = await inp.getAttribute('name');
      const id = await inp.getAttribute('id');
      const placeholder = await inp.getAttribute('placeholder');
      console.log('    Input: name=' + name + ', id=' + id + ', placeholder=' + placeholder);
    }
  }

  // Step 9: Extract JavaScript for API patterns
  console.log('\n9. Extracting API patterns from JavaScript...');
  const pageSource = await page.content();

  // Find action= patterns
  const actionPatterns = pageSource.match(/action=[a-zA-Z0-9\.\-\_]+/g) || [];
  const uniqueActions = [...new Set(actionPatterns)];
  console.log('  Found ' + uniqueActions.length + ' unique action patterns:');
  uniqueActions.forEach(a => console.log('    ' + a));

  // Find URLs with action parameter
  const urlPatterns = pageSource.match(/\/secure\/\?action=[^'"&\s<>]+/g) || [];
  const uniqueUrls = [...new Set(urlPatterns)];
  console.log('\n  API URL patterns:');
  uniqueUrls.forEach(u => console.log('    ' + u));

  // Step 10: Save captures and analysis
  console.log('\n10. Saving data...');
  fs.writeFileSync('geocivix_api_captures.json', JSON.stringify(captures, null, 2));
  fs.writeFileSync('geocivix_search_page_source.html', pageSource);

  // Create analysis document
  const analysis = {
    portal: 'Williamson County TN Geocivix',
    baseUrl: 'https://williamson.geocivix.com/secure/',
    authFlow: {
      step1: 'Click #user-login button',
      step2: 'POST /secure/?action=user.scheme with username',
      step3: 'POST /secure/?action=user.authenticate with username + password'
    },
    discoveredEndpoints: uniqueActions,
    apiUrls: uniqueUrls,
    capturedCalls: captures.length
  };
  fs.writeFileSync('geocivix_analysis.json', JSON.stringify(analysis, null, 2));
  console.log('  Saved ' + captures.length + ' API captures');
  console.log('  Saved analysis to geocivix_analysis.json');

  // Step 11: Navigate to a specific project to understand detail endpoints
  console.log('\n11. Looking for project details links...');
  await page.goto('https://williamson.geocivix.com/secure/project/?step=search', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Get all href links that might be project details
  const projectLinks = await page.$$eval('a[href*="project"]', links =>
    links.map(a => ({ href: a.href, text: a.textContent?.trim() }))
      .filter(l => l.href.includes('step=detail') || l.href.includes('projectid=') || l.href.includes('project.detail'))
  );
  console.log('  Project detail links found: ' + projectLinks.length);
  projectLinks.slice(0, 10).forEach(l => console.log('    ' + l.text + ' -> ' + l.href));

  console.log('\n=== EXPLORATION COMPLETE ===');
  console.log('Browser staying open for 20 seconds...');
  await page.waitForTimeout(20000);

  await browser.close();
}

exploreGeocivixAPIs().catch(console.error);
