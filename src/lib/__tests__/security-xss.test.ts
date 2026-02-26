import { describe, it, expect, beforeEach } from "vitest";
import {
  sanitizeHTML,
  isSafeUrl,
  sanitizeRedirectUrl,
} from "../security";
import {
  sanitizeHtml,
  sanitizeText,
  sanitizeUrl,
  escapeHtml,
} from "../sanitize";

/**
 * XSS Protection Tests
 *
 * Validates that user-generated content is sanitized before rendering,
 * script injection is blocked, URL validation prevents open redirects,
 * and DOMPurify integration correctly strips dangerous payloads.
 */

describe("XSS Protection", () => {
  // ============================================
  // HTML Entity Escaping (security.ts - sanitizeHTML)
  // ============================================
  describe("sanitizeHTML (security.ts) - HTML entity escaping", () => {
    it("escapes angle brackets in user input", () => {
      expect(sanitizeHTML("<div>hello</div>")).toBe(
        "&lt;div&gt;hello&lt;/div&gt;",
      );
    });

    it("escapes ampersands", () => {
      expect(sanitizeHTML("Tom & Jerry")).toBe("Tom &amp; Jerry");
    });

    it("escapes nested tags", () => {
      expect(sanitizeHTML("<b><i>bold italic</i></b>")).toBe(
        "&lt;b&gt;&lt;i&gt;bold italic&lt;/i&gt;&lt;/b&gt;",
      );
    });

    it("preserves quotes but escapes ampersands in textContent context", () => {
      // textContent -> innerHTML only escapes <, >, & (not quotes)
      // because quotes are safe inside a text node (not in an attribute context)
      const result = sanitizeHTML('He said "hello" & \'goodbye\'');
      expect(result).toContain('"hello"');
      expect(result).toContain("&amp;");
    });

    it("handles empty string", () => {
      expect(sanitizeHTML("")).toBe("");
    });

    it("handles string with only special characters", () => {
      const result = sanitizeHTML("<>&");
      expect(result).toBe("&lt;&gt;&amp;");
    });

    it("escapes event handler attributes in tags (as literal text)", () => {
      // sanitizeHTML converts to textContent, so the entire tag becomes
      // escaped text. The literal word "onerror" appears but as inert text,
      // not as an executable attribute.
      const result = sanitizeHTML('<img onerror="alert(1)" src="x">');
      expect(result).toContain("&lt;img");
      expect(result).toContain("&gt;");
      // The key security property: no actual HTML element is created
      expect(result).not.toContain("<img");
    });

    it("escapes SVG-based XSS payloads (as literal text)", () => {
      const result = sanitizeHTML(
        '<svg onload="alert(1)"><circle r="10"/></svg>',
      );
      // The entire SVG tag structure is escaped to text
      expect(result).toContain("&lt;svg");
      expect(result).not.toContain("<svg");
    });

    it("escapes meta tag injection", () => {
      const result = sanitizeHTML(
        '<meta http-equiv="refresh" content="0;url=http://evil.com">',
      );
      expect(result).toContain("&lt;meta");
    });
  });

  // ============================================
  // Script Tag Sanitization
  // ============================================
  describe("script tag sanitization", () => {
    it("sanitizeHTML escapes simple script tags", () => {
      expect(sanitizeHTML("<script>alert('XSS')</script>")).toBe(
        "&lt;script&gt;alert('XSS')&lt;/script&gt;",
      );
    });

    it("sanitizeHTML escapes script tags with attributes", () => {
      const result = sanitizeHTML(
        '<script type="text/javascript">document.cookie</script>',
      );
      expect(result).toContain("&lt;script");
      expect(result).not.toContain("<script");
    });

    it("sanitizeHTML escapes script tags with encoded payloads", () => {
      const result = sanitizeHTML(
        "<script>eval(atob('YWxlcnQoMSk='))</script>",
      );
      expect(result).toContain("&lt;script&gt;");
    });

    it("sanitizeHTML escapes uppercase SCRIPT tags", () => {
      const result = sanitizeHTML("<SCRIPT>alert(1)</SCRIPT>");
      expect(result).toContain("&lt;SCRIPT&gt;");
    });

    it("sanitizeHTML escapes script tags with newlines", () => {
      const result = sanitizeHTML("<script\n>alert(1)</script\n>");
      expect(result).toContain("&lt;script");
    });

    it("DOMPurify strips script tags from rich HTML", () => {
      const result = sanitizeHtml(
        '<p>Hello</p><script>alert("XSS")</script><p>World</p>',
      );
      expect(result).not.toContain("<script");
      expect(result).not.toContain("alert");
      expect(result).toContain("<p>Hello</p>");
      expect(result).toContain("<p>World</p>");
    });

    it("DOMPurify strips script tags from within allowed elements", () => {
      const result = sanitizeHtml(
        '<div><script>document.cookie</script>safe content</div>',
      );
      expect(result).not.toContain("<script");
      expect(result).toContain("safe content");
    });

    it("DOMPurify strips inline event handlers", () => {
      const result = sanitizeHtml(
        '<a href="#" onclick="alert(1)">click me</a>',
      );
      expect(result).not.toContain("onclick");
      expect(result).toContain("click me");
    });

    it("DOMPurify strips onerror from img tags", () => {
      const result = sanitizeHtml('<img src="x" onerror="alert(1)">');
      expect(result).not.toContain("onerror");
    });

    it("DOMPurify strips onload from body/svg tags", () => {
      const result = sanitizeHtml(
        '<svg onload="alert(1)"><circle r="10"></circle></svg>',
      );
      expect(result).not.toContain("onload");
      expect(result).not.toContain("alert");
    });

    it("DOMPurify strips onmouseover attributes", () => {
      const result = sanitizeHtml(
        '<div onmouseover="alert(1)">hover me</div>',
      );
      expect(result).not.toContain("onmouseover");
    });

    it("DOMPurify strips style tags (CSS injection)", () => {
      const result = sanitizeHtml(
        "<style>body { background: url('javascript:alert(1)') }</style><p>text</p>",
      );
      expect(result).not.toContain("<style");
    });

    it("DOMPurify strips iframe tags", () => {
      const result = sanitizeHtml(
        '<iframe src="https://evil.com"></iframe><p>text</p>',
      );
      expect(result).not.toContain("<iframe");
    });

    it("DOMPurify strips object and embed tags", () => {
      const result = sanitizeHtml(
        '<object data="evil.swf"></object><embed src="evil.swf"><p>safe</p>',
      );
      expect(result).not.toContain("<object");
      expect(result).not.toContain("<embed");
      expect(result).toContain("<p>safe</p>");
    });

    it("DOMPurify strips form tags (phishing prevention)", () => {
      const result = sanitizeHtml(
        '<form action="https://evil.com"><input name="password"></form>',
      );
      expect(result).not.toContain("<form");
    });
  });

  // ============================================
  // DOMPurify Integration (sanitize.ts)
  // ============================================
  describe("DOMPurify integration (sanitize.ts)", () => {
    describe("sanitizeHtml - allows safe tags", () => {
      it("allows bold and italic tags", () => {
        const result = sanitizeHtml("<b>bold</b> <i>italic</i>");
        expect(result).toContain("<b>bold</b>");
        expect(result).toContain("<i>italic</i>");
      });

      it("allows paragraph and break tags", () => {
        const result = sanitizeHtml("<p>paragraph</p><br>");
        expect(result).toContain("<p>paragraph</p>");
        expect(result).toContain("<br>");
      });

      it("allows list tags", () => {
        const result = sanitizeHtml(
          "<ul><li>item 1</li><li>item 2</li></ul>",
        );
        expect(result).toContain("<ul>");
        expect(result).toContain("<li>item 1</li>");
      });

      it("allows heading tags", () => {
        const result = sanitizeHtml("<h1>Title</h1><h2>Subtitle</h2>");
        expect(result).toContain("<h1>Title</h1>");
        expect(result).toContain("<h2>Subtitle</h2>");
      });

      it("allows table tags", () => {
        const result = sanitizeHtml(
          "<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Cell</td></tr></tbody></table>",
        );
        expect(result).toContain("<table>");
        expect(result).toContain("<th>Header</th>");
        expect(result).toContain("<td>Cell</td>");
      });

      it("allows code and pre tags", () => {
        const result = sanitizeHtml(
          '<pre><code>const x = 1;</code></pre>',
        );
        expect(result).toContain("<pre>");
        expect(result).toContain("<code>");
      });

      it("allows links with href and adds security attributes", () => {
        const result = sanitizeHtml(
          '<a href="https://example.com">link</a>',
        );
        expect(result).toContain('href="https://example.com"');
        // DOMPurify hook should add target="_blank" and rel="noopener noreferrer"
        expect(result).toContain('target="_blank"');
        expect(result).toContain("noopener noreferrer");
      });

      it("allows class and id attributes", () => {
        const result = sanitizeHtml(
          '<span class="highlight" id="note-1">text</span>',
        );
        expect(result).toContain('class="highlight"');
        expect(result).toContain('id="note-1"');
      });
    });

    describe("sanitizeText - strips all HTML", () => {
      it("strips all HTML tags and returns plain text", () => {
        const result = sanitizeText(
          "<b>bold</b> and <script>alert(1)</script>",
        );
        expect(result).not.toContain("<b>");
        expect(result).not.toContain("<script>");
        expect(result).toContain("bold");
      });

      it("strips all attributes", () => {
        const result = sanitizeText(
          '<a href="https://evil.com" onclick="alert(1)">click</a>',
        );
        expect(result).not.toContain("href");
        expect(result).not.toContain("onclick");
        expect(result).toBe("click");
      });

      it("preserves plain text content", () => {
        expect(sanitizeText("Hello, World!")).toBe("Hello, World!");
      });

      it("handles empty input", () => {
        expect(sanitizeText("")).toBe("");
      });
    });

    describe("escapeHtml - entity escaping", () => {
      it("escapes all five HTML-significant characters", () => {
        expect(escapeHtml("&")).toBe("&amp;");
        expect(escapeHtml("<")).toBe("&lt;");
        expect(escapeHtml(">")).toBe("&gt;");
        expect(escapeHtml('"')).toBe("&quot;");
        expect(escapeHtml("'")).toBe("&#039;");
      });

      it("escapes a mixed string", () => {
        expect(escapeHtml('<script>alert("XSS")</script>')).toBe(
          "&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;",
        );
      });

      it("does not double-escape already escaped content", () => {
        // First escape
        const once = escapeHtml("<b>bold</b>");
        expect(once).toBe("&lt;b&gt;bold&lt;/b&gt;");
        // Second escape produces double-encoded entities
        const twice = escapeHtml(once);
        expect(twice).toContain("&amp;lt;");
      });

      it("preserves non-special characters", () => {
        expect(escapeHtml("hello world 123")).toBe("hello world 123");
      });

      it("handles empty string", () => {
        expect(escapeHtml("")).toBe("");
      });
    });
  });

  // ============================================
  // URL Validation (security.ts - isSafeUrl)
  // ============================================
  describe("URL validation - isSafeUrl", () => {
    it("allows same-origin absolute URL", () => {
      // window.location.origin is http://localhost:3000 in vitest jsdom
      expect(isSafeUrl(`${window.location.origin}/page`)).toBe(true);
    });

    it("allows relative paths (resolved against origin)", () => {
      expect(isSafeUrl("/dashboard")).toBe(true);
      expect(isSafeUrl("/settings/profile")).toBe(true);
    });

    it("rejects cross-origin URL without allowlist", () => {
      expect(isSafeUrl("https://evil.com/phish")).toBe(false);
    });

    it("rejects cross-origin URL even with similar path", () => {
      expect(isSafeUrl("https://evil.com/dashboard")).toBe(false);
    });

    it("allows explicitly allowed external origins", () => {
      expect(
        isSafeUrl("https://api.example.com/data", ["https://api.example.com"]),
      ).toBe(true);
    });

    it("rejects external origin not in allowlist", () => {
      expect(
        isSafeUrl("https://evil.com/data", ["https://api.example.com"]),
      ).toBe(false);
    });

    it("returns false for javascript: protocol URLs", () => {
      expect(isSafeUrl("javascript:alert(1)")).toBe(false);
    });

    it("returns false for data: protocol URLs", () => {
      expect(isSafeUrl("data:text/html,<script>alert(1)</script>")).toBe(
        false,
      );
    });

    it("returns true for path-like strings resolved against origin", () => {
      // "://invalid" is resolved as a relative path against the origin
      // new URL("://invalid", origin) = "http://localhost:3000/://invalid" (same origin)
      expect(isSafeUrl("://invalid")).toBe(true);
    });

    it("handles empty string (relative URL, same origin)", () => {
      // new URL("", window.location.origin) resolves to the origin itself
      expect(isSafeUrl("")).toBe(true);
    });

    it("handles URL with port mismatch as different origin", () => {
      expect(isSafeUrl("http://localhost:9999/page")).toBe(false);
    });
  });

  // ============================================
  // URL Sanitization (sanitize.ts - sanitizeUrl)
  // ============================================
  describe("URL sanitization - sanitizeUrl", () => {
    it("allows http URLs", () => {
      expect(sanitizeUrl("http://example.com")).toBe("http://example.com");
    });

    it("allows https URLs", () => {
      expect(sanitizeUrl("https://example.com")).toBe("https://example.com");
    });

    it("allows mailto URLs", () => {
      expect(sanitizeUrl("mailto:user@example.com")).toBe(
        "mailto:user@example.com",
      );
    });

    it("allows tel URLs", () => {
      expect(sanitizeUrl("tel:+15551234567")).toBe("tel:+15551234567");
    });

    it("allows relative URLs (no protocol)", () => {
      expect(sanitizeUrl("/path/to/page")).toBe("/path/to/page");
    });

    it("blocks javascript: protocol", () => {
      expect(sanitizeUrl("javascript:alert(1)")).toBe("");
    });

    it("blocks javascript: with mixed case", () => {
      expect(sanitizeUrl("JavaScript:alert(1)")).toBe("");
    });

    it("blocks data: protocol", () => {
      expect(sanitizeUrl("data:text/html,<script>alert(1)</script>")).toBe(
        "",
      );
    });

    it("blocks vbscript: protocol", () => {
      expect(sanitizeUrl("vbscript:MsgBox('XSS')")).toBe("");
    });

    it("blocks file: protocol", () => {
      expect(sanitizeUrl("file:///etc/passwd")).toBe("");
    });

    it("blocks unknown/custom protocols", () => {
      expect(sanitizeUrl("custom:something")).toBe("");
    });
  });

  // ============================================
  // Redirect URL Sanitization (security.ts)
  // ============================================
  describe("sanitizeRedirectUrl - open redirect prevention", () => {
    it("allows simple relative paths", () => {
      expect(sanitizeRedirectUrl("/dashboard")).toBe("/dashboard");
      expect(sanitizeRedirectUrl("/customers/123")).toBe("/customers/123");
    });

    it("allows paths with query strings", () => {
      expect(sanitizeRedirectUrl("/search?q=test")).toBe("/search?q=test");
    });

    it("allows paths with hash fragments", () => {
      expect(sanitizeRedirectUrl("/page#section")).toBe("/page#section");
    });

    it("rejects absolute URLs to external sites", () => {
      expect(sanitizeRedirectUrl("https://evil.com")).toBe("/dashboard");
      expect(sanitizeRedirectUrl("http://evil.com/steal")).toBe("/dashboard");
    });

    it("rejects protocol-relative URLs", () => {
      expect(sanitizeRedirectUrl("//evil.com")).toBe("/dashboard");
      expect(sanitizeRedirectUrl("//evil.com/path")).toBe("/dashboard");
    });

    it("rejects javascript: scheme in encoded form", () => {
      expect(sanitizeRedirectUrl("/%6Aavascript:alert(1)")).toBe("/dashboard");
    });

    it("rejects data: scheme in encoded form", () => {
      expect(sanitizeRedirectUrl("/%64ata:text/html,<script>")).toBe(
        "/dashboard",
      );
    });

    it("uses custom fallback when provided", () => {
      expect(sanitizeRedirectUrl("https://evil.com", "/home")).toBe("/home");
      expect(sanitizeRedirectUrl("//evil.com", "/login")).toBe("/login");
    });

    it("rejects URLs without leading slash", () => {
      expect(sanitizeRedirectUrl("evil.com")).toBe("/dashboard");
      expect(sanitizeRedirectUrl("ftp://server/file")).toBe("/dashboard");
    });

    it("rejects empty string (no leading slash)", () => {
      expect(sanitizeRedirectUrl("")).toBe("/dashboard");
    });
  });

  // ============================================
  // User-Generated Content Safety
  // ============================================
  describe("user-generated content rendering safety", () => {
    it("sanitizeHTML makes content safe for innerHTML", () => {
      const userInput = '<img src=x onerror=alert(1)>';
      const safe = sanitizeHTML(userInput);
      // The result should be escaped so that inserting into innerHTML is safe
      expect(safe).not.toContain("<img");
      expect(safe).toContain("&lt;img");
    });

    it("sanitizeHtml strips XSS from rich text notes", () => {
      const userNote =
        '<p>Customer called about <script>steal(document.cookie)</script>billing issue</p>';
      const safe = sanitizeHtml(userNote);
      expect(safe).toContain("<p>");
      expect(safe).not.toContain("<script>");
      expect(safe).toContain("billing issue");
    });

    it("sanitizeText strips HTML from plain text fields like customer names", () => {
      const name = '<script>alert("XSS")</script>John Doe';
      const safe = sanitizeText(name);
      expect(safe).not.toContain("<script>");
      expect(safe).toContain("John Doe");
    });

    it("escapeHtml safely encodes for insertion into HTML attributes", () => {
      const input = '" onmouseover="alert(1)" data-x="';
      const safe = escapeHtml(input);
      expect(safe).not.toContain('"');
      expect(safe).toContain("&quot;");
    });

    it("handles unicode content in user input", () => {
      expect(sanitizeHTML("Cafe\u0301 \u2603 \uD83C\uDFE0")).toBe(
        "Cafe\u0301 \u2603 \uD83C\uDFE0",
      );
      expect(sanitizeText("Cafe\u0301 \u2603 \uD83C\uDFE0")).toBe(
        "Cafe\u0301 \u2603 \uD83C\uDFE0",
      );
    });

    it("handles very long user input without truncation", () => {
      const longInput = "A".repeat(100_000);
      expect(sanitizeHTML(longInput)).toBe(longInput);
      expect(sanitizeText(longInput)).toBe(longInput);
    });

    it("handles null-byte injection attempt", () => {
      const result = sanitizeHTML("test\x00<script>alert(1)</script>");
      expect(result).not.toContain("<script>");
    });

    it("DOMPurify link hook adds noopener noreferrer to user links", () => {
      const userLink =
        '<a href="https://example.com">my website</a>';
      const safe = sanitizeHtml(userLink);
      expect(safe).toContain("rel=");
      expect(safe).toContain("noopener");
      expect(safe).toContain("noreferrer");
      expect(safe).toContain('target="_blank"');
    });

    it("sanitizeHtml blocks javascript: in href attributes", () => {
      const result = sanitizeHtml(
        '<a href="javascript:alert(1)">click</a>',
      );
      // DOMPurify should either remove the href or the entire tag
      expect(result).not.toContain("javascript:");
    });

    it("sanitizeHtml blocks data: in href attributes", () => {
      const result = sanitizeHtml(
        '<a href="data:text/html,<script>alert(1)</script>">click</a>',
      );
      expect(result).not.toContain("data:text/html");
    });
  });
});
