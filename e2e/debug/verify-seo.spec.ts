import { test, expect } from "@playwright/test";

test("verify SEO meta tags and structured data", async ({ page }) => {
  await page.goto("/home");
  await page.waitForLoadState("networkidle");

  // Check page title
  const title = await page.title();
  console.log("Page Title:", title);
  expect(title).toContain("MAC Septic");
  expect(title).toContain("Central Texas");

  // Check meta description
  const description = await page.$eval(
    'meta[name="description"]',
    (el) => el.getAttribute("content")
  );
  console.log("Meta Description:", description);
  expect(description).toContain("septic tank pumping");
  expect(description).toContain("936");

  // Check Open Graph tags
  const ogTitle = await page.$eval(
    'meta[property="og:title"]',
    (el) => el.getAttribute("content")
  );
  console.log("OG Title:", ogTitle);
  expect(ogTitle).toContain("MAC Septic");

  const ogDescription = await page.$eval(
    'meta[property="og:description"]',
    (el) => el.getAttribute("content")
  );
  console.log("OG Description:", ogDescription);
  expect(ogDescription).toBeTruthy();

  // Check Twitter Card
  const twitterCard = await page.$eval(
    'meta[name="twitter:card"]',
    (el) => el.getAttribute("content")
  );
  console.log("Twitter Card:", twitterCard);
  expect(twitterCard).toBe("summary_large_image");

  // Check canonical URL
  const canonical = await page.$eval(
    'link[rel="canonical"]',
    (el) => el.getAttribute("href")
  );
  console.log("Canonical:", canonical);
  expect(canonical).toContain("react.ecbtx.com");

  // Check for JSON-LD structured data (wait for React to inject them)
  await page.waitForFunction(() =>
    document.querySelectorAll('script[type="application/ld+json"]').length >= 2
  );
  const jsonLdScripts = await page.$$eval(
    'script[type="application/ld+json"]',
    (scripts) => scripts.map((s) => JSON.parse(s.textContent || "{}"))
  );
  console.log("JSON-LD Scripts found:", jsonLdScripts.length);

  // Find LocalBusiness schema
  const localBusiness = jsonLdScripts.find((s) => s["@type"] === "LocalBusiness");
  console.log("LocalBusiness Schema:", localBusiness ? "Found" : "Not found");
  expect(localBusiness).toBeTruthy();
  expect(localBusiness?.name).toBe("MAC Septic Services");
  expect(localBusiness?.telephone).toContain("936");

  // Find FAQ schema
  const faqPage = jsonLdScripts.find((s) => s["@type"] === "FAQPage");
  console.log("FAQPage Schema:", faqPage ? "Found" : "Not found");
  expect(faqPage).toBeTruthy();
  expect(faqPage?.mainEntity?.length).toBeGreaterThan(0);

  console.log("\n✅ All SEO elements verified!");
});
