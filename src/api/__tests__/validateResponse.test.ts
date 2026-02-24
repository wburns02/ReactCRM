import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { validateResponse } from "../validateResponse";

// Mock sentry to avoid side effects
vi.mock("@/lib/sentry", () => ({
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
});

describe("validateResponse", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns data when valid", () => {
    const data = { id: 1, name: "Will", email: "will@test.com" };
    const result = validateResponse(UserSchema, data, "/users/1");
    expect(result).toEqual(data);
  });

  it("returns original data on validation failure (non-strict)", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const bad = { id: "not-a-number", name: 123 };
    const result = validateResponse(UserSchema, bad, "/users/1");
    // Non-strict returns the original data even on failure
    expect(result).toEqual(bad);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("throws on validation failure in strict mode", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const bad = { id: "not-a-number" };
    expect(() =>
      validateResponse(UserSchema, bad, "/users/1", { strict: true }),
    ).toThrow();
  });

  it("handles array schemas", () => {
    const ListSchema = z.array(UserSchema);
    const data = [
      { id: 1, name: "A", email: "a@t.com" },
      { id: 2, name: "B", email: "b@t.com" },
    ];
    const result = validateResponse(ListSchema, data, "/users");
    expect(result).toHaveLength(2);
  });

  it("handles null/undefined data gracefully in non-strict", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = validateResponse(UserSchema, null, "/users/1");
    expect(result).toBeNull();
  });
});
