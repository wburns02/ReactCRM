import { useState, useEffect } from "react";

/**
 * Hook to detect if viewport matches a media query
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

/**
 * Hook to detect mobile or tablet viewport (< 1024px)
 */
export function useIsMobileOrTablet(): boolean {
  return useMediaQuery("(max-width: 1023px)");
}
