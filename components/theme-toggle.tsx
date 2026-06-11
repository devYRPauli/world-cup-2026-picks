"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const current = (document.documentElement.dataset.theme as Theme) ?? "light";
    setTheme(current);
  }, []);

  function toggle() {
    const next: Theme = (document.documentElement.dataset.theme as Theme) === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
    setTheme(next);
  }

  const isDark = theme === "dark";

  return (
    <button
      className="icon-btn"
      type="button"
      onClick={toggle}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {/* Render nothing meaningful until mounted to avoid hydration mismatch. */}
      {theme === null ? <Sun size={18} style={{ opacity: 0 }} /> : isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
