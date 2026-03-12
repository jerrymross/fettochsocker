"use client";

import { createContext, useContext, useState } from "react";
import type { Dictionary, Locale } from "@/lib/i18n";

type LanguageContextValue = {
  locale: Locale;
  dictionary: Dictionary;
  setLanguageState: (nextLocale: Locale, nextDictionary: Dictionary) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  initialLocale,
  initialDictionary,
  children,
}: {
  initialLocale: Locale;
  initialDictionary: Dictionary;
  children: React.ReactNode;
}) {
  const [state, setState] = useState({
    locale: initialLocale,
    dictionary: initialDictionary,
  });

  return (
    <LanguageContext.Provider
      value={{
        locale: state.locale,
        dictionary: state.dictionary,
        setLanguageState: (nextLocale, nextDictionary) =>
          setState({
            locale: nextLocale,
            dictionary: nextDictionary,
          }),
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider.");
  }

  return context;
}
