"use client";

import { useEffect, useState } from "react";
import { applyTheme, getStoredTheme } from "@/lib/theme";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = getStoredTheme();
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(stored ? stored === "dark" : prefersDark);
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    applyTheme(next ? "dark" : "light");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
      className="rounded-lg p-1.5 text-[rgb(var(--text-muted))] transition hover:text-[rgb(var(--text))]"
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
