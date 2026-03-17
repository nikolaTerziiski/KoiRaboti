"use client";

import { createContext, startTransition, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import translations, { type Locale, type Translations } from "./translations";

const LOCALE_KEY = "koi-raboti-locale";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translations;
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: "bg",
  setLocale: () => {},
  t: translations.bg,
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("bg");

  useEffect(() => {
    const stored = localStorage.getItem(LOCALE_KEY) as Locale | null;
    if (stored === "en" || stored === "bg") {
      startTransition(() => setLocaleState(stored));
    }
  }, []);

  function setLocale(newLocale: Locale) {
    setLocaleState(newLocale);
    localStorage.setItem(LOCALE_KEY, newLocale);
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: translations[locale] }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
