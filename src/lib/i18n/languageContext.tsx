"use client";

import React, { createContext, useContext, useState } from "react";
import {
  LanguageOption,
  LanguageContextType,
  translationDictionary,
} from "./translations";

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key: string) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<LanguageOption>("en");

  const t = (key: string): string => {
    return translationDictionary[language]?.[key] || translationDictionary.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
