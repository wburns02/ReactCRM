import { renderHook, act } from "@testing-library/react";

// Mock clearAuthToken before importing the hook
vi.mock("@/api/client", () => ({
  clearAuthToken: vi.fn(),
}));

// Mock window.location
const originalLocation = window.location;

import { useSessionTimeout } from "../useSessionTimeout";

describe("useSessionTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Ensure visibilityState is "visible" so activity handler fires
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("calls onTimeout after timeout period", () => {
    const onTimeout = vi.fn();
    renderHook(() =>
      useSessionTimeout({ onTimeout, timeoutMs: 5000 }),
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("calls onWarning before timeout", () => {
    const onWarning = vi.fn();
    const onTimeout = vi.fn();
    renderHook(() =>
      useSessionTimeout({
        onTimeout,
        onWarning,
        timeoutMs: 10000,
        warningMs: 3000,
      }),
    );

    // Warning fires at timeoutMs - warningMs = 7000ms
    act(() => {
      vi.advanceTimersByTime(7000);
    });
    expect(onWarning).toHaveBeenCalledTimes(1);
    expect(onTimeout).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("resets timeout on user activity", () => {
    const onTimeout = vi.fn();
    renderHook(() =>
      useSessionTimeout({ onTimeout, timeoutMs: 5000 }),
    );

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(onTimeout).not.toHaveBeenCalled();

    // Simulate user activity
    act(() => {
      document.dispatchEvent(new Event("mousedown"));
    });

    // Advance another 4 seconds — would have fired without reset
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(onTimeout).not.toHaveBeenCalled();

    // Now complete the full timeout from last activity
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("does nothing when disabled", () => {
    const onTimeout = vi.fn();
    renderHook(() =>
      useSessionTimeout({ onTimeout, timeoutMs: 1000, enabled: false }),
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onTimeout).not.toHaveBeenCalled();
  });
});
