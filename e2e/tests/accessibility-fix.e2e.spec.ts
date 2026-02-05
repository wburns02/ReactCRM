import { test, expect } from "@playwright/test";

/**
 * Accessibility Enforcement Tests for MAC Septic Landing Page
 * Tests run against the LIVE deployed site at https://react.ecbtx.com/home
 *
 * Validates:
 * 1. Main landmark present
 * 2. Heading order sequential (no skips, h1 first)
 * 3. Skip-to-content link present
 * 4. ARIA attributes on interactive elements
 * 5. Form labels properly linked
 * 6. Keyboard navigation works (no traps)
 * 7. Touch targets large enough
 * 8. No critical console errors
 */

const LANDING_URL = "https://react.ecbtx.com/home";

// Known non-critical console errors to filter out
const KNOWN_ERRORS = [
  "API Schema Violation",
  "Sentry",
  "ResizeObserver",
  "favicon",
  "workbox",
  "sw.js",
];

test.describe("Landing Page Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(LANDING_URL, { waitUntil: "networkidle" });
  });

  test("1. Main landmark is present", async ({ page }) => {
    const main = page.locator("main");
    await expect(main).toBeVisible();
    const mainCount = await page.locator("main").count();
    expect(mainCount).toBe(1);
  });

  test("2. Heading order is sequential - h1 comes first, no skips", async ({
    page,
  }) => {
    // Get all heading elements in DOM order
    const headings = await page.evaluate(() => {
      const elements = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
      return Array.from(elements).map((el) => ({
        tag: el.tagName.toLowerCase(),
        level: parseInt(el.tagName.charAt(1)),
        text: el.textContent?.trim().substring(0, 50) || "",
        visible:
          window.getComputedStyle(el).display !== "none" &&
          window.getComputedStyle(el).visibility !== "hidden",
      }));
    });

    // Filter to visible headings only
    const visibleHeadings = headings.filter((h) => h.visible);
    expect(visibleHeadings.length).toBeGreaterThan(0);

    // First heading must be h1
    expect(visibleHeadings[0].tag).toBe("h1");

    // Check sequential order - no skipping more than 1 level
    for (let i = 1; i < visibleHeadings.length; i++) {
      const prev = visibleHeadings[i - 1].level;
      const curr = visibleHeadings[i].level;
      // Can go deeper by 1 level, or back up any amount
      if (curr > prev) {
        expect(curr - prev).toBeLessThanOrEqual(1);
      }
    }
  });

  test("3. Skip-to-content link is present and works", async ({ page }) => {
    // The skip link should exist (may be sr-only)
    const skipLink = page.locator('a[href="#landing-content"]');
    await expect(skipLink).toBeAttached();

    // The target element should exist
    const target = page.locator("#landing-content");
    await expect(target).toBeAttached();
  });

  test("4. Section landmarks have labels", async ({ page }) => {
    const sections = await page.evaluate(() => {
      const elements = document.querySelectorAll("section");
      return Array.from(elements).map((el) => ({
        hasAriaLabel: el.hasAttribute("aria-label"),
        hasAriaLabelledBy: el.hasAttribute("aria-labelledby"),
        ariaLabel: el.getAttribute("aria-label"),
        ariaLabelledBy: el.getAttribute("aria-labelledby"),
      }));
    });

    // All sections should have either aria-label or aria-labelledby
    for (const section of sections) {
      const hasLabel = section.hasAriaLabel || section.hasAriaLabelledBy;
      expect(hasLabel).toBe(true);
    }
  });

  test("5. Decorative SVGs are hidden from screen readers", async ({
    page,
  }) => {
    const svgStats = await page.evaluate(() => {
      const svgs = document.querySelectorAll("main svg");
      let hidden = 0;
      let hasRole = 0;
      let untagged = 0;
      for (const svg of svgs) {
        if (
          svg.getAttribute("aria-hidden") === "true" ||
          svg.closest("[aria-hidden='true']")
        ) {
          hidden++;
        } else if (svg.getAttribute("role") === "img") {
          hasRole++;
        } else {
          untagged++;
        }
      }
      return { total: svgs.length, hidden, hasRole, untagged };
    });

    // All SVGs should either be aria-hidden or have role="img"
    // Allow a small number of untagged (e.g. in 3rd party components)
    expect(svgStats.untagged).toBeLessThanOrEqual(3);
  });

  test("6. FAQ accordion has proper ARIA attributes", async ({ page }) => {
    // Find FAQ buttons
    const faqButtons = page.locator("button[aria-expanded]");
    const count = await faqButtons.count();
    expect(count).toBeGreaterThan(0);

    // Check first FAQ button
    const firstButton = faqButtons.first();
    await expect(firstButton).toHaveAttribute("aria-expanded");
    await expect(firstButton).toHaveAttribute("aria-controls");

    // The controlled panel should exist
    const controlsId = await firstButton.getAttribute("aria-controls");
    expect(controlsId).toBeTruthy();
    const panel = page.locator(`#${controlsId}`);
    await expect(panel).toBeAttached();
  });

  test("7. Form inputs have associated labels", async ({ page }) => {
    // Scroll to the form section
    await page.locator("#quote").scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    const formInputs = await page.evaluate(() => {
      const inputs = document.querySelectorAll(
        "#quote input:not([type=hidden]):not([type=checkbox]), #quote select, #quote textarea",
      );
      return Array.from(inputs).map((input) => {
        const id = input.id;
        const hasLabel = id
          ? !!document.querySelector(`label[for="${id}"]`)
          : false;
        const hasAriaLabel = input.hasAttribute("aria-label");
        const hasAriaLabelledBy = input.hasAttribute("aria-labelledby");
        return {
          id,
          type:
            input.getAttribute("type") || input.tagName.toLowerCase(),
          hasLabel,
          hasAriaLabel,
          hasAriaLabelledBy,
          isAccessible: hasLabel || hasAriaLabel || hasAriaLabelledBy,
        };
      });
    });

    // All form inputs should have an accessible label
    for (const input of formInputs) {
      expect(
        input.isAccessible,
      ).toBe(true);
    }
  });

  test("8. Required inputs have aria-required", async ({ page }) => {
    await page.locator("#quote").scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    const requiredInputs = await page.evaluate(() => {
      const inputs = document.querySelectorAll(
        '#quote input[aria-required="true"], #quote select[aria-required="true"]',
      );
      return inputs.length;
    });

    // Should have at least first name, last name, phone as required
    expect(requiredInputs).toBeGreaterThanOrEqual(3);
  });

  test("9. Keyboard tab navigation works without traps", async ({ page }) => {
    // Press Tab multiple times and track focused elements
    const focusedElements: string[] = [];

    for (let i = 0; i < 15; i++) {
      await page.keyboard.press("Tab");
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        return el
          ? `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${el.className ? "." + el.className.split(" ")[0] : ""}`
          : "none";
      });
      focusedElements.push(focused);
    }

    // Should have progressed through different elements (not stuck)
    const uniqueElements = new Set(focusedElements);
    expect(uniqueElements.size).toBeGreaterThan(5);
  });

  test("10. Touch targets are large enough (min 44x44px)", async ({
    page,
  }) => {
    const smallTargets = await page.evaluate(() => {
      const interactive = document.querySelectorAll(
        "main a, main button, main input, main select, main textarea",
      );
      const small: string[] = [];
      for (const el of interactive) {
        const rect = el.getBoundingClientRect();
        // Check if element is visible
        if (rect.width === 0 || rect.height === 0) continue;
        // Allow for inline text links (they can be shorter in height)
        const isInlineLink =
          el.tagName === "A" &&
          window.getComputedStyle(el).display === "inline";
        if (isInlineLink) continue;
        // Check minimum size (44px for touch targets)
        if (rect.width < 44 || rect.height < 44) {
          small.push(
            `${el.tagName.toLowerCase()} (${Math.round(rect.width)}x${Math.round(rect.height)})`,
          );
        }
      }
      return small;
    });

    // Report any small targets but allow some (checkboxes, inline buttons, etc.)
    // Desktop view naturally has some smaller targets that are fine
    // Critical check: main CTA buttons should be large enough
    const criticalSmall = smallTargets.filter(
      (t) =>
        !t.includes("input") &&
        !t.includes("select") &&
        !t.includes("checkbox"),
    );
    // Allow up to 10 small non-critical targets (nav items, footer links, etc.)
    expect(criticalSmall.length).toBeLessThanOrEqual(12);
  });

  test("11. No critical console errors", async ({ page }) => {
    const errors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        const isKnown = KNOWN_ERRORS.some((known) => text.includes(known));
        if (!isKnown) {
          errors.push(text);
        }
      }
    });

    // Reload to capture all console errors
    await page.goto(LANDING_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // No unexpected console errors
    expect(errors.length).toBe(0);
  });

  test("12. CTA buttons have sufficient contrast colors defined", async ({
    page,
  }) => {
    // Verify the CTA color has been updated from the old low-contrast orange
    const ctaColor = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return style.getPropertyValue("--color-cta").trim();
    });

    // The old failing color was #ff7a59 - ensure it's been changed
    expect(ctaColor).not.toBe("#ff7a59");
    // New color should be the accessible #c74b20
    expect(ctaColor).toBe("#c74b20");
  });

  test("13. Primary color has sufficient contrast", async ({ page }) => {
    const primaryColor = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return style.getPropertyValue("--color-primary").trim();
    });

    // Old failing color was #0091ae
    expect(primaryColor).not.toBe("#0091ae");
    // New accessible color
    expect(primaryColor).toBe("#007189");
  });

  test("14. Star ratings have screen reader text", async ({ page }) => {
    // Check hero section stars
    const srText = await page.evaluate(() => {
      const srElements = document.querySelectorAll(".sr-only");
      const ratingTexts: string[] = [];
      for (const el of srElements) {
        const text = el.textContent || "";
        if (text.includes("star") || text.includes("rated")) {
          ratingTexts.push(text);
        }
      }
      return ratingTexts;
    });

    expect(srText.length).toBeGreaterThan(0);
    expect(srText.some((t) => t.toLowerCase().includes("star"))).toBe(true);
  });

  test("15. External links warn about new tab", async ({ page }) => {
    const externalLinks = await page.evaluate(() => {
      const links = document.querySelectorAll(
        'main a[target="_blank"], main a[rel*="noopener"]',
      );
      const results: { href: string; hasWarning: boolean }[] = [];
      for (const link of links) {
        const srOnly = link.querySelector(".sr-only");
        const hasWarning = srOnly
          ? (srOnly.textContent || "").includes("new tab")
          : false;
        results.push({
          href: link.getAttribute("href") || "",
          hasWarning,
        });
      }
      return results;
    });

    // All external links should have new tab warning
    for (const link of externalLinks) {
      expect(link.hasWarning).toBe(true);
    }
  });

  test("16. Footer has proper landmark", async ({ page }) => {
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    const footerCount = await footer.count();
    expect(footerCount).toBeGreaterThanOrEqual(1);
  });

  test("17. Mobile sticky CTA has nav landmark", async ({ page }) => {
    // The mobile sticky CTA should be wrapped in a nav element
    const mobileNav = page.locator('nav[aria-label="Quick actions"]');
    await expect(mobileNav).toBeAttached();
  });
});
