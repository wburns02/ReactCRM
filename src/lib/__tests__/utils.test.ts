/**
 * Unit tests for utility functions
 */
import { describe, it, expect } from "vitest";
import { cn, formatCurrency, formatDate, formatPhone } from "../utils";

describe("cn - class name merger", () => {
  it("merges multiple class names", () => {
    const result = cn("class1", "class2");
    expect(result).toBe("class1 class2");
  });

  it("handles conditional classes", () => {
    const isActive = true;
    const result = cn("base", isActive && "active");
    expect(result).toBe("base active");
  });

  it("handles false conditionals", () => {
    const isActive = false;
    const result = cn("base", isActive && "active");
    expect(result).toBe("base");
  });

  it("handles undefined and null", () => {
    const result = cn("base", undefined, null, "other");
    expect(result).toBe("base other");
  });

  it("resolves Tailwind conflicts", () => {
    const result = cn("p-4", "p-8");
    expect(result).toBe("p-8");
  });

  it("handles empty input", () => {
    const result = cn();
    expect(result).toBe("");
  });

  it("handles array of classes", () => {
    const result = cn(["class1", "class2"]);
    expect(result).toContain("class1");
    expect(result).toContain("class2");
  });
});

describe("formatCurrency", () => {
  it("formats positive amounts", () => {
    expect(formatCurrency(100)).toBe("$100.00");
    expect(formatCurrency(1234.56)).toBe("$1,234.56");
    expect(formatCurrency(1000000)).toBe("$1,000,000.00");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("formats negative amounts", () => {
    expect(formatCurrency(-100)).toBe("-$100.00");
  });

  it("handles null", () => {
    expect(formatCurrency(null)).toBe("$0.00");
  });

  it("handles undefined", () => {
    expect(formatCurrency(undefined)).toBe("$0.00");
  });

  it("formats decimals correctly", () => {
    expect(formatCurrency(99.99)).toBe("$99.99");
    expect(formatCurrency(0.01)).toBe("$0.01");
  });
});

describe("formatDate", () => {
  it("formats ISO date strings", () => {
    const result = formatDate("2024-03-15");
    // Date string parsing may vary by timezone, so accept Mar 14 or 15
    expect(result).toMatch(/Mar 1[45], 2024/);
  });

  it("formats Date objects", () => {
    const date = new Date(2024, 2, 15); // March 15, 2024 local time
    const result = formatDate(date);
    expect(result).toMatch(/Mar 15, 2024/);
  });

  it("handles null", () => {
    expect(formatDate(null)).toBe("-");
  });

  it("handles undefined", () => {
    expect(formatDate(undefined)).toBe("-");
  });

  it("handles empty string", () => {
    expect(formatDate("")).toBe("-");
  });

  it("formats ISO datetime strings", () => {
    const result = formatDate("2024-03-15T10:30:00Z");
    expect(result).toMatch(/Mar.*2024/);
  });
});

describe("formatPhone", () => {
  it("formats 10-digit phone numbers", () => {
    expect(formatPhone("1234567890")).toBe("(123) 456-7890");
  });

  it("formats phone with dashes", () => {
    expect(formatPhone("123-456-7890")).toBe("(123) 456-7890");
  });

  it("formats phone with dots", () => {
    expect(formatPhone("123.456.7890")).toBe("(123) 456-7890");
  });

  it("formats phone with parentheses and spaces", () => {
    expect(formatPhone("(123) 456-7890")).toBe("(123) 456-7890");
  });

  it("returns original for non-standard-length numbers", () => {
    expect(formatPhone("12345")).toBe("12345");
  });

  it("formats 11-digit number starting with 1", () => {
    // formatPhone strips non-digits, then handles 11-digit with leading 1
    expect(formatPhone("+1 123 456 7890")).toBe("(123) 456-7890");
  });

  it("handles null", () => {
    expect(formatPhone(null)).toBe("-");
  });

  it("handles undefined", () => {
    expect(formatPhone(undefined)).toBe("-");
  });

  it("handles empty string", () => {
    expect(formatPhone("")).toBe("-");
  });

  it("handles phone with country code prefix", () => {
    // 11 digits starting with 1 → strips leading 1 and formats
    expect(formatPhone("11234567890")).toBe("(123) 456-7890");
  });
});
