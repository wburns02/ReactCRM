import { useState, useEffect } from "react";

export function DarkModeToggle() {
  const [isDark, setIsDark] = useState(false);

  // Read initial theme from localStorage and document class
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark") {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    } else if (stored === "light") {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
    } else {
      // No stored preference: check system preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setIsDark(prefersDark);
      if (prefersDark) {
        document.documentElement.classList.add("dark");
      }
    }
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");

    if (next) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
      className={[
        "relative inline-flex items-center",
        "h-8 w-16 rounded-full",
        "border border-gray-300 dark:border-gray-600",
        "transition-colors duration-300 ease-in-out",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        isDark ? "bg-gray-700" : "bg-yellow-100",
      ].join(" ")}
    >
      {/* Sliding circle */}
      <span
        className={[
          "absolute top-0.5 flex items-center justify-center",
          "h-6 w-6 rounded-full",
          "bg-white dark:bg-gray-200",
          "shadow-sm",
          "transition-transform duration-300 ease-in-out",
          isDark ? "translate-x-[2.125rem]" : "translate-x-1",
        ].join(" ")}
      >
        <span className="text-sm leading-none" role="img" aria-hidden="true">
          {isDark ? "🌙" : "☀️"}
        </span>
      </span>
    </button>
  );
}
