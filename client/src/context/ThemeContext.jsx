/**
 * ThemeContext.jsx
 *
 * Provides app-wide light/dark theme state.
 *
 * - Reads initial value from localStorage (falls back to "light")
 * - Adds/removes the "dark" class on <html> whenever theme changes
 * - Persists selection to localStorage on every change
 * - Exposes { theme, toggleTheme } via useTheme() hook
 *
 * Usage:
 *   Wrap <App /> with <ThemeProvider> in main.jsx.
 *   Consume with: const { theme, toggleTheme } = useTheme();
 */

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({ theme: "light", toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "light"
  );

  // Keep the "dark" class on <html> in sync with state
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
