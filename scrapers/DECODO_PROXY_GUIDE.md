# Decodo Proxy Integration Guide

> **For:** Opus CLI sessions working on web scraping
> **Created:** 2026-01-20
> **Example:** MGO Connect full extraction

---

## What is Decodo?

Decodo is a datacenter proxy service that provides rotating IP addresses to avoid rate limiting and IP blocking when scraping websites. We're using their **Datacenter Proxy** plan.

**Credentials:**
- Username: `OpusCLI`
- Password: `h+Mpb3hlLt1c5B1mpL`
- Host: `dc.decodo.com`
- Ports: `10001` - `10010` (10 rotating IPs)

---

## How We're Using It for MGO Connect

### The Problem
MGO Connect blocks IPs after ~30-50 requests, returning 403 Forbidden errors. Without proxies, the scraper gets blocked after extracting a few hundred records.

### The Solution
Rotate through 10 different proxy ports. Each port routes through a different IP address. When one IP gets blocked, we switch to another.

### Implementation (TypeScript/Node.js)

```typescript
import { HttpsProxyAgent } from 'https-proxy-agent';

// Configuration
const PROXY_CONFIG = {
  host: 'dc.decodo.com',
  ports: [10001, 10002, 10003, 10004, 10005, 10006, 10007, 10008, 10009, 10010],
  username: 'OpusCLI',
  password: 'h+Mpb3hlLt1c5B1mpL'
};

let currentProxyIndex = 0;

// Get next proxy URL (rotates through ports)
function getNextProxy(): string {
  const port = PROXY_CONFIG.ports[currentProxyIndex];
  currentProxyIndex = (currentProxyIndex + 1) % PROXY_CONFIG.ports.length;
  return `http://${PROXY_CONFIG.username}:${PROXY_CONFIG.password}@${PROXY_CONFIG.host}:${port}`;
}

// Create proxy agent for fetch requests
function getProxyAgent(): HttpsProxyAgent<string> {
  const proxyUrl = getNextProxy();
  return new HttpsProxyAgent(proxyUrl);
}

// Make request through proxy
async function fetchWithProxy(url: string, options: RequestInit = {}): Promise<Response> {
  const agent = getProxyAgent();
  return fetch(url, {
    ...options,
    // @ts-ignore - agent is valid for node-fetch
    agent: agent
  });
}
```

### Retry Logic with Proxy Rotation

```typescript
let consecutiveFailures = 0;

async function fetchWithRetry(url: string, options: RequestInit = {}): Promise<Response> {
  for (let attempt = 0; attempt <= 5; attempt++) {
    try {
      const response = await fetchWithProxy(url, options);

      if (response.status === 403) {
        consecutiveFailures++;

        // If all 10 ports blocked, take 5-minute break
        if (consecutiveFailures >= 10) {
          console.log('ALL PORTS BLOCKED! Taking 5-minute cooldown...');
          await sleep(300000); // 5 minutes
          consecutiveFailures = 0;
        } else {
          // Exponential backoff: 10s, 20s, 40s...
          const waitTime = Math.pow(2, attempt) * 10000;
          console.log(`403 Forbidden. Rotating proxy, waiting ${waitTime/1000}s...`);
          await sleep(waitTime);
        }
        continue;
      }

      // Success - reset failure counter
      consecutiveFailures = 0;
      return response;
    } catch (error) {
      consecutiveFailures++;
      await sleep(2000);
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## Python Implementation (for Knox County)

If you're using Python (requests/aiohttp), here's how to adapt:

### Using `requests`

```python
import requests
from itertools import cycle

PROXY_CONFIG = {
    'host': 'dc.decodo.com',
    'ports': [10001, 10002, 10003, 10004, 10005, 10006, 10007, 10008, 10009, 10010],
    'username': 'OpusCLI',
    'password': 'h+Mpb3hlLt1c5B1mpL'
}

# Create proxy URL generator
def get_proxy_urls():
    while True:
        for port in PROXY_CONFIG['ports']:
            proxy_url = f"http://{PROXY_CONFIG['username']}:{PROXY_CONFIG['password']}@{PROXY_CONFIG['host']}:{port}"
            yield {'http': proxy_url, 'https': proxy_url}

proxy_generator = get_proxy_urls()

def fetch_with_proxy(url, **kwargs):
    proxies = next(proxy_generator)
    return requests.get(url, proxies=proxies, **kwargs)
```

### Using `aiohttp` (async)

```python
import aiohttp
from aiohttp_proxy import ProxyConnector

async def fetch_with_proxy(session, url, proxy_port):
    proxy_url = f"http://OpusCLI:h+Mpb3hlLt1c5B1mpL@dc.decodo.com:{proxy_port}"
    connector = ProxyConnector.from_url(proxy_url)
    async with aiohttp.ClientSession(connector=connector) as proxy_session:
        async with proxy_session.get(url) as response:
            return await response.text()
```

### Using Playwright (browser automation)

```python
from playwright.async_api import async_playwright

async def scrape_with_proxy(port):
    proxy_url = f"http://OpusCLI:h+Mpb3hlLt1c5B1mpL@dc.decodo.com:{port}"

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            proxy={
                "server": f"http://dc.decodo.com:{port}",
                "username": "OpusCLI",
                "password": "h+Mpb3hlLt1c5B1mpL"
            }
        )
        page = await browser.new_page()
        await page.goto("https://target-website.com")
        # ... scrape ...
```

---

## Adapting for Knox County

1. **Install dependency:**
   ```bash
   pip install requests  # or aiohttp, playwright
   ```

2. **Add proxy rotation to your scraper:**
   - Copy the proxy configuration above
   - Replace direct `requests.get()` calls with `fetch_with_proxy()`
   - Add retry logic for 403/429 errors

3. **Key settings to tune:**
   - `delay_between_requests`: Start with 1-2 seconds
   - `max_retries`: 5 is usually enough
   - `cooldown_on_all_blocked`: 5 minutes works well

4. **Monitor for blocks:**
   - Watch for 403 Forbidden responses
   - If seeing many consecutive failures, increase delays
   - The 10 IPs should rotate faster than they get blocked

---

## Decodo Plan Details

- **Plan:** Datacenter 50GB ($0.60/GB)
- **Bandwidth:** 50GB included
- **Ports:** 10001-10010 (10 simultaneous IPs)
- **IP Type:** Datacenter (faster but more detectable than residential)

If you need more IPs (getting blocked on all 10), you can:
1. Add more ports to the plan
2. Upgrade to residential proxies (harder to detect, more expensive)

---

## Files Reference

| File | Purpose |
|------|---------|
| `scrapers/mgo/mgo-full-scraper.ts` | Full MGO extraction with proxy support |
| `scrapers/mgo/generate-report.py` | Generates extraction progress report |
| `scrapers/mgo/MGO_EXTRACTION_TRACKER.md` | Progress tracking document |

---

## Current MGO Extraction Status

- **Server:** 100.85.99.69 (Tailscale)
- **Progress:** 4/432 jurisdictions, ~22,647 records
- **Running:** `~/mgo_extraction/mgo/scraper.log`

Check progress:
```bash
ssh will@100.85.99.69 "tail -20 ~/mgo_extraction/mgo/scraper.log"
```

---

*Questions? The MGO scraper code in `scrapers/mgo/` shows a complete working example.*
