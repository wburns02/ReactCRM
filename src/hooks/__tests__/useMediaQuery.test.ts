import { renderHook, act } from "@testing-library/react";
import { useMediaQuery, useIsMobileOrTablet } from "../useMediaQuery";

describe("useMediaQuery", () => {
  let listeners: Map<string, (e: MediaQueryListEvent) => void>;

  function mockMatchMedia(matches: boolean) {
    listeners = new Map();
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => {
        listeners.set(query, cb);
      },
      removeEventListener: vi.fn(),
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  }

  it("returns true when media query matches", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(true);
  });

  it("returns false when media query does not match", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(false);
  });

  it("updates when media query changes", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(false);

    const handler = listeners.get("(min-width: 768px)");
    act(() => {
      handler?.({ matches: true } as MediaQueryListEvent);
    });
    expect(result.current).toBe(true);
  });

  it("useIsMobileOrTablet uses max-width: 1023px", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useIsMobileOrTablet());
    expect(result.current).toBe(true);
    expect(window.matchMedia).toHaveBeenCalledWith("(max-width: 1023px)");
  });
});
