#!/usr/bin/env node

/**
 * Simple production site verification
 * Tests both frontend and backend health without authentication dependencies
 */

const https = require('https');
const http = require('http');

const tests = [];

function test(name, testFn) {
  tests.push({ name, testFn });
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    const req = protocol.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    });
    req.on('timeout', () => reject(new Error('Request timeout')));
    req.on('error', reject);
  });
}

// Test DNS resolution and frontend
test('Frontend DNS resolution', async () => {
  const { status } = await httpGet('https://react.ecbtx.com/');
  if (status !== 200) throw new Error(`Expected 200, got ${status}`);
});

// Test backend health
test('Backend health endpoint', async () => {
  const { status, data } = await httpGet('https://react-crm-api-production.up.railway.app/health');
  if (status !== 200) throw new Error(`Expected 200, got ${status}`);
  const health = JSON.parse(data);
  if (health.status !== 'healthy') throw new Error(`Backend not healthy: ${health.status}`);
});

// Test frontend loads actual HTML
test('Frontend HTML content', async () => {
  const { data } = await httpGet('https://react.ecbtx.com/');
  if (!data.includes('<!doctype html')) throw new Error('Invalid HTML response');
  if (!data.includes('MAC Septic')) throw new Error('Missing expected content');
});

// Test backend API structure
test('Backend API info', async () => {
  const { status, data } = await httpGet('https://react-crm-api-production.up.railway.app/');
  if (status !== 200) throw new Error(`Expected 200, got ${status}`);
  const info = JSON.parse(data);
  if (!info.name || !info.version) throw new Error('Missing API info');
});

// Run all tests
async function runTests() {
  console.log('🔍 Production Verification Tests\n');

  let passed = 0;
  let failed = 0;

  for (const { name, testFn } of tests) {
    try {
      console.log(`⏳ ${name}...`);
      await testFn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log('🎉 All tests passed! Production site is healthy.');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Production site may have issues.');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('❌ Test suite failed:', error.message);
  process.exit(1);
});