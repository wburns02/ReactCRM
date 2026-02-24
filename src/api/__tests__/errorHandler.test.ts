import { describe, it, expect } from "vitest";
import {
  isProblemDetail,
  parseError,
  getUserMessage,
  isErrorCode,
  isValidationError,
  isAuthError,
  isServerError,
  getValidationErrors,
  getFormErrors,
  ErrorCodes,
} from "../errorHandler";
import axios, { AxiosError, AxiosHeaders } from "axios";

/** Helper to create a fake AxiosError with given response data and status */
function makeAxiosError(
  status: number,
  data: unknown,
): AxiosError {
  const headers = new AxiosHeaders();
  const config = { headers } as AxiosError["config"];
  const error = new AxiosError("Request failed", "ERR_BAD_RESPONSE", config, null, {
    status,
    statusText: "Error",
    headers: {},
    config: config!,
    data,
  });
  return error;
}

const sampleProblem = {
  type: "about:blank",
  title: "Not Found",
  status: 404,
  detail: "Customer not found",
  code: "RES_001",
  timestamp: "2026-01-01T00:00:00Z",
  trace_id: "abc-123",
};

describe("isProblemDetail", () => {
  it("returns true for valid ProblemDetail", () => {
    expect(isProblemDetail(sampleProblem)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isProblemDetail(null)).toBe(false);
  });

  it("returns false for legacy error format", () => {
    expect(isProblemDetail({ error: "something" })).toBe(false);
  });

  it("returns false for partial match", () => {
    expect(isProblemDetail({ code: "X", detail: "Y" })).toBe(false);
  });
});

describe("parseError", () => {
  it("parses RFC 7807 response", () => {
    const err = makeAxiosError(404, sampleProblem);
    const result = parseError(err);
    expect(result).toEqual(sampleProblem);
  });

  it("wraps legacy error format", () => {
    const err = makeAxiosError(400, { detail: "Bad input" });
    const result = parseError(err);
    expect(result).not.toBeNull();
    expect(result!.detail).toBe("Bad input");
    expect(result!.status).toBe(400);
    expect(result!.code).toBe("UNKNOWN");
  });

  it("wraps legacy error field", () => {
    const err = makeAxiosError(500, { error: "Server broke" });
    const result = parseError(err);
    expect(result!.detail).toBe("Server broke");
  });

  it("returns null for non-Axios errors", () => {
    expect(parseError(new Error("network"))).toBeNull();
  });

  it("returns null for Axios error without response data", () => {
    const err = new AxiosError("timeout");
    expect(parseError(err)).toBeNull();
  });
});

describe("getUserMessage", () => {
  it("returns friendly message for UNAUTHORIZED", () => {
    const err = makeAxiosError(401, { ...sampleProblem, code: ErrorCodes.UNAUTHORIZED, status: 401 });
    expect(getUserMessage(err)).toBe("Please log in to continue");
  });

  it("returns friendly message for QUOTA_EXCEEDED with retry_after", () => {
    const err = makeAxiosError(429, { ...sampleProblem, code: ErrorCodes.QUOTA_EXCEEDED, status: 429, retry_after: 30 });
    expect(getUserMessage(err)).toBe("Rate limit exceeded. Please wait 30 seconds.");
  });

  it("joins validation errors", () => {
    const err = makeAxiosError(422, {
      ...sampleProblem,
      code: ErrorCodes.VALIDATION_ERROR,
      status: 422,
      errors: [
        { field: "email", message: "Required", type: "missing" },
        { field: "name", message: "Too short", type: "value_error" },
      ],
    });
    expect(getUserMessage(err)).toBe("Required. Too short");
  });

  it("falls back to Error.message", () => {
    expect(getUserMessage(new Error("oops"))).toBe("oops");
  });

  it("falls back to generic message for unknown types", () => {
    expect(getUserMessage("string error")).toBe("An unexpected error occurred");
  });
});

describe("isErrorCode", () => {
  it("matches specific code", () => {
    const err = makeAxiosError(404, sampleProblem);
    expect(isErrorCode(err, ErrorCodes.NOT_FOUND)).toBe(true);
    expect(isErrorCode(err, ErrorCodes.UNAUTHORIZED)).toBe(false);
  });
});

describe("isValidationError", () => {
  it("returns true for VAL_001", () => {
    const err = makeAxiosError(422, { ...sampleProblem, code: ErrorCodes.VALIDATION_ERROR });
    expect(isValidationError(err)).toBe(true);
  });

  it("returns false for other codes", () => {
    const err = makeAxiosError(404, sampleProblem);
    expect(isValidationError(err)).toBe(false);
  });
});

describe("isAuthError", () => {
  it("detects UNAUTHORIZED", () => {
    const err = makeAxiosError(401, { ...sampleProblem, code: ErrorCodes.UNAUTHORIZED });
    expect(isAuthError(err)).toBe(true);
  });

  it("detects SESSION_EXPIRED", () => {
    const err = makeAxiosError(401, { ...sampleProblem, code: ErrorCodes.SESSION_EXPIRED });
    expect(isAuthError(err)).toBe(true);
  });

  it("returns false for non-auth errors", () => {
    const err = makeAxiosError(500, { ...sampleProblem, code: ErrorCodes.INTERNAL_ERROR });
    expect(isAuthError(err)).toBe(false);
  });
});

describe("isServerError", () => {
  it("returns true for 500", () => {
    const err = makeAxiosError(500, { ...sampleProblem, status: 500 });
    expect(isServerError(err)).toBe(true);
  });

  it("returns false for 400", () => {
    const err = makeAxiosError(400, { ...sampleProblem, status: 400 });
    expect(isServerError(err)).toBe(false);
  });
});

describe("getValidationErrors", () => {
  it("extracts errors array", () => {
    const errors = [{ field: "email", message: "Invalid", type: "format" }];
    const err = makeAxiosError(422, { ...sampleProblem, code: ErrorCodes.VALIDATION_ERROR, errors });
    expect(getValidationErrors(err)).toEqual(errors);
  });

  it("returns null for non-validation errors", () => {
    const err = makeAxiosError(500, sampleProblem);
    expect(getValidationErrors(err)).toBeNull();
  });
});

describe("getFormErrors", () => {
  it("converts to field-keyed object", () => {
    const errors = [
      { field: "body.email", message: "Required", type: "missing" },
      { field: "body.name", message: "Too short", type: "value_error" },
    ];
    const err = makeAxiosError(422, { ...sampleProblem, code: ErrorCodes.VALIDATION_ERROR, errors });
    expect(getFormErrors(err)).toEqual({ email: "Required", name: "Too short" });
  });

  it("returns null when no validation errors", () => {
    const err = makeAxiosError(500, sampleProblem);
    expect(getFormErrors(err)).toBeNull();
  });
});
