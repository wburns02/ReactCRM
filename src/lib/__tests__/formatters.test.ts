import {
  formatCurrency,
  formatDate,
  formatPhone,
  formatDurationSeconds,
  isValidId,
} from "../utils";

describe("formatCurrency", () => {
  it("returns $0.00 for null", () => expect(formatCurrency(null)).toBe("$0.00"));
  it("returns $0.00 for undefined", () => expect(formatCurrency(undefined)).toBe("$0.00"));
  it("formats whole number", () => expect(formatCurrency(100)).toBe("$100.00"));
  it("formats with commas", () => expect(formatCurrency(1234.56)).toBe("$1,234.56"));
  it("formats zero", () => expect(formatCurrency(0)).toBe("$0.00"));
  it("formats negative", () => expect(formatCurrency(-50)).toBe("-$50.00"));
});

describe("formatDate", () => {
  it("returns dash for null", () => expect(formatDate(null)).toBe("-"));
  it("returns dash for undefined", () => expect(formatDate(undefined)).toBe("-"));
  it("formats YYYY-MM-DD string", () => expect(formatDate("2026-02-24")).toBe("Feb 24, 2026"));
  it("formats ISO datetime string", () => {
    const result = formatDate("2026-06-15T12:00:00Z");
    expect(result).toBe("Jun 15, 2026");
  });
  it("formats Date object", () => {
    const d = new Date(Date.UTC(2026, 0, 1));
    expect(formatDate(d)).toBe("Jan 1, 2026");
  });
  it("returns dash for empty string", () => expect(formatDate("")).toBe("-"));
});

describe("formatPhone", () => {
  it("returns dash for null", () => expect(formatPhone(null)).toBe("-"));
  it("returns dash for undefined", () => expect(formatPhone(undefined)).toBe("-"));
  it("formats 10-digit number", () => expect(formatPhone("9792361958")).toBe("(979) 236-1958"));
  it("formats 11-digit with leading 1", () => expect(formatPhone("19792361958")).toBe("(979) 236-1958"));
  it("strips non-digits before formatting", () => expect(formatPhone("(979) 236-1958")).toBe("(979) 236-1958"));
  it("returns original for other lengths", () => expect(formatPhone("123")).toBe("123"));
});

describe("formatDurationSeconds", () => {
  it("returns 0s for null", () => expect(formatDurationSeconds(null)).toBe("0s"));
  it("returns 0s for undefined", () => expect(formatDurationSeconds(undefined)).toBe("0s"));
  it("returns 0s for zero", () => expect(formatDurationSeconds(0)).toBe("0s"));
  it("formats seconds only", () => expect(formatDurationSeconds(45)).toBe("45s"));
  it("formats minutes and seconds", () => expect(formatDurationSeconds(90)).toBe("1m 30s"));
  it("formats exact minutes", () => expect(formatDurationSeconds(120)).toBe("2m 0s"));
});

describe("isValidId", () => {
  it("returns false for null", () => expect(isValidId(null)).toBe(false));
  it("returns false for undefined", () => expect(isValidId(undefined)).toBe(false));
  it("returns false for empty string", () => expect(isValidId("")).toBe(false));
  it("returns false for 'null' string", () => expect(isValidId("null")).toBe(false));
  it("returns false for 'undefined' string", () => expect(isValidId("undefined")).toBe(false));
  it("returns true for valid string", () => expect(isValidId("abc-123")).toBe(true));
  it("returns true for valid number", () => expect(isValidId(42)).toBe(true));
  it("returns false for NaN", () => expect(isValidId(NaN)).toBe(false));
  it("returns false for Infinity", () => expect(isValidId(Infinity)).toBe(false));
  it("is case-insensitive for null/undefined check", () => expect(isValidId("NULL")).toBe(false));
});
