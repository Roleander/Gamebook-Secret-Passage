"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";

export interface Theme {
  primaryColor: string;
  bgColor: string;
  accentColor: string;
}

interface ThemeContextType {
  theme: Theme | null;
  applyTheme: (theme: Theme) => void;
}

const THEME_STORAGE_KEY = "sp-theme";

function parseHex(hex: string): [number, number, number] | null {
  const m = hex.replace("#", "").trim();
  if (m.length !== 6 && m.length !== 3) return null;
  const full =
    m.length === 3
      ? m[0] + m[0] + m[1] + m[1] + m[2] + m[2]
      : m;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return null;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function relativeLuminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function isLight(hex: string): boolean {
  return relativeLuminance(hex) > 0.45;
}

function mix(hex: string, target: [number, number, number], amount: number): string {
  const rgb = parseHex(hex) || [0, 0, 0];
  const out = rgb.map((v, i) => Math.round(v + (target[i] - v) * amount));
  return `#${out.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")).join("")}`;
}

export function applyThemeToDocument(t: Theme) {
  const root = document.documentElement;
  const lightBg = isLight(t.bgColor);
  const lightPrimary = isLight(t.primaryColor);

  root.style.setProperty("--primary", t.primaryColor);
  root.style.setProperty("--ring", t.primaryColor);
  root.style.setProperty("--background", t.bgColor);
  root.style.setProperty("--foreground", lightBg ? "#1a1410" : "#e8dcc8");
  root.style.setProperty("--card", lightBg ? mix(t.bgColor, [255, 255, 255], 0.35) : mix(t.bgColor, [255, 255, 255], 0.06));
  root.style.setProperty("--card-foreground", lightBg ? "#1a1410" : "#e8dcc8");
  root.style.setProperty("--primary-foreground", lightPrimary ? "#1a1410" : "#f5f0e6");
  root.style.setProperty("--accent", t.accentColor);
  root.style.setProperty("--accent-foreground", isLight(t.accentColor) ? "#1a1410" : "#e8dcc8");
  root.style.setProperty("--muted", lightBg ? mix(t.bgColor, [0, 0, 0], 0.08) : mix(t.bgColor, [255, 255, 255], 0.08));
  root.style.setProperty("--muted-foreground", lightBg ? "#5a5040" : "#a89880");
  root.style.setProperty("--border", lightBg ? mix(t.primaryColor, [0, 0, 0], 0.55) : mix(t.primaryColor, [0, 0, 0], 0.35));
  root.style.setProperty("--input", lightBg ? mix(t.bgColor, [0, 0, 0], 0.06) : mix(t.bgColor, [255, 255, 255], 0.08));
  root.style.setProperty("--secondary", lightBg ? mix(t.primaryColor, [255, 255, 255], 0.7) : mix(t.primaryColor, [0, 0, 0], 0.55));
  root.style.setProperty("--secondary-foreground", lightBg ? "#1a1410" : "#e8dcc8");
}

export function parseTheme(raw: string | null | undefined): Theme | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    if (p && typeof p.primaryColor === "string" && typeof p.bgColor === "string") {
      return {
        primaryColor: p.primaryColor,
        bgColor: p.bgColor,
        accentColor: p.accentColor || p.primaryColor,
      };
    }
  } catch {}
  return null;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: null,
  applyTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [theme, setTheme] = useState<Theme | null>(null);

  const applyTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    applyThemeToDocument(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(newTheme));
    } catch {}
  }, []);

  // Instant paint from cache, then sync from server
  useEffect(() => {
    try {
      const cached = localStorage.getItem(THEME_STORAGE_KEY);
      const parsed = parseTheme(cached);
      if (parsed) {
        setTheme(parsed);
        applyThemeToDocument(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    fetch("/api/user/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const parsed = parseTheme(data.theme);
        if (parsed) {
          setTheme(parsed);
          applyThemeToDocument(parsed);
          try {
            localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(parsed));
          } catch {}
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [status, session?.user?.email]);

  useEffect(() => {
    const onThemeUpdated = () => {
      try {
        const cached = localStorage.getItem(THEME_STORAGE_KEY);
        const parsed = parseTheme(cached);
        if (parsed) {
          setTheme(parsed);
          applyThemeToDocument(parsed);
        }
      } catch {}
    };
    window.addEventListener("theme-updated", onThemeUpdated);
    return () => window.removeEventListener("theme-updated", onThemeUpdated);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, applyTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
