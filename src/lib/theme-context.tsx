"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface Theme {
  primaryColor: string;
  bgColor: string;
  accentColor: string;
}

interface ThemeContextType {
  theme: Theme | null;
  applyTheme: (theme: Theme) => void;
}

const defaultTheme: Theme = {
  primaryColor: "#c9a96e",
  bgColor: "#1a1410",
  accentColor: "#8b4513",
};

const ThemeContext = createContext<ThemeContextType>({
  theme: null,
  applyTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/user/profile")
        .then((res) => res.json())
        .then((data) => {
          if (data.theme) {
            try {
              const parsed = JSON.parse(data.theme);
              setTheme(parsed);
              applyThemeToDocument(parsed);
            } catch {}
          }
        })
        .catch(() => {});
    }
  }, [session]);

  const applyTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    applyThemeToDocument(newTheme);
  };

  const applyThemeToDocument = (t: Theme) => {
    const root = document.documentElement;
    root.style.setProperty("--primary", t.primaryColor);
    root.style.setProperty("--ring", t.primaryColor);
    root.style.setProperty("--background", t.bgColor);
    root.style.setProperty("--card", t.bgColor);
    root.style.setProperty("--accent", t.accentColor);
  };

  return (
    <ThemeContext.Provider value={{ theme, applyTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
