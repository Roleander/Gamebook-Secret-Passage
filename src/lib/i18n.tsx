"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import es from "../../messages/es.json";
import en from "../../messages/en.json";
import fr from "../../messages/fr.json";
import de from "../../messages/de.json";
import it from "../../messages/it.json";
import pt from "../../messages/pt.json";
import pl from "../../messages/pl.json";
import sv from "../../messages/sv.json";
import cs from "../../messages/cs.json";
import hi from "../../messages/hi.json";
import ja from "../../messages/ja.json";

const messages: Record<string, any> = { es, en, fr, de, it, pt, pl, sv, cs, hi, ja };

interface I18nContextType {
  locale: string;
  setLocale: (locale: string) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

function getNestedValue(obj: any, path: string): string {
  return path.split(".").reduce((acc, part) => acc?.[part], obj) ?? path;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState("es");

  useEffect(() => {
    const saved = localStorage.getItem("locale");
    if (saved && messages[saved]) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (newLocale: string) => {
    if (messages[newLocale]) {
      setLocaleState(newLocale);
      localStorage.setItem("locale", newLocale);
    }
  };

  const t = (key: string): string => {
    const msg = messages[locale];
    return getNestedValue(msg, key);
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
