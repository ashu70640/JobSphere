/**
 * ThemeToggle.jsx
 *
 * A small icon button that switches between light and dark mode.
 * - Shows a Moon icon in light mode  (click → go dark)
 * - Shows a Sun  icon in dark  mode  (click → go light)
 * - Reads/writes theme via useTheme() from ThemeContext
 *
 * Placed in Navbar so users can access it from every page.
 */

import { useTheme } from "../context/ThemeContext";

// ── Icons ──────────────────────────────────────────────────────────────────────

function SunIcon() {
  return (
    <svg
      className="w-[18px] h-[18px]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41
           M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      className="w-[18px] h-[18px]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
      />
    </svg>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className="w-9 h-9 flex items-center justify-center rounded-xl
                 text-gray-500 dark:text-gray-400
                 hover:bg-gray-100 dark:hover:bg-gray-800
                 border border-gray-200 dark:border-gray-700
                 transition-all duration-200 cursor-pointer"
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
